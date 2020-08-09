import { NextFunction, Request, Response } from 'express';
import * as onFinished from 'on-finished';
import * as prometheus from 'prom-client';
import { exponentialBuckets } from 'prom-client';

// from 4 ms up to ~65 seconds, sqrt2 factor
// allows specification via env-var as comma-separated values
export const latencyBuckets: number[] =
	process.env['NODE_METRICS_GATHERER_LATENCY_BUCKETS']
		?.split(',')
		.map(s => parseInt(s, 10)) ??
	exponentialBuckets(0.004, Math.SQRT2, 29).map(x => Number(x.toFixed(3)));

// from 256 bytes up to 4GB, sqrt2 factor
// allows specification via env-var as comma-separated values
export const bytesRWBuckets: number[] =
	process.env['NODE_METRICS_GATHERER_BYTES_RW_BUCKETS']
		?.split(',')
		.map(s => parseInt(s, 10)) ??
	exponentialBuckets(256, Math.SQRT2, 49).map(Math.round);

// some or none of these labels may be actually used in the calls to observe
// metrics data points, but we need to specify them all up-front so that
// they don't appear by "surprise" to the prometheus client library, which will
// cause a thrown error. See: https://github.com/siimon/prom-client/issues/298
const commonLabels = [
	'queue_name',
	'user_agent',
	'api_version',
	'state',
	'status_code',
];

const API_ARRIVAL_TOTAL = new prometheus.Counter({
	name: 'api_arrival_total',
	help: 'number of arrivals to the API',
	labelNames: [...commonLabels],
});

const API_BYTES_READ = new prometheus.Histogram({
	name: 'api_bytes_read',
	help: 'histogram of bytes read on the socket for each request',
	buckets: bytesRWBuckets,
	labelNames: [...commonLabels],
});

const API_BYTES_WRITTEN = new prometheus.Histogram({
	name: 'api_bytes_written',
	help: 'histogram of bytes written on the socket for each request',
	buckets: bytesRWBuckets,
	labelNames: [...commonLabels],
});

const API_LATENCY_SECONDS = new prometheus.Histogram({
	name: 'api_latency_seconds',
	help:
		'histogram of time spent to process a request from arrival to completion',
	buckets: latencyBuckets,
	labelNames: [...commonLabels],
});

// it may be necessary to modify the request object in various ways, this can
// be done in this function. For example, a `_metrics_gatherer` object is
// added to req and req.connection for the purposes of metrics observing functions
//
// NOTE: user code (for example, in middlewares) can also access and modify this, but
// must add labels among the set above (prom-client requires labelsets declared at
// metric object creation time. See: https://github.com/siimon/prom-client/issues/298)
const modifyReq = (req: Request) => {
	req._metrics_gatherer = {
		labels: {},
	};
	if (!req.connection._metrics_gatherer) {
		req.connection._metrics_gatherer = {};
	}
};

// A specific sequence of steps is used to keep track of the changing values of
// req.connection.bytesRead and req.connection.bytesWritten
//
// These two quantities are observed when the request arrives and when it
// has finished to subtract the difference, rather than simply observing them
// when the request has finished, because the net.Socket objects (as
// `.connection` on Request objects) are re-used by express, and so
// connection.bytesRead will, at the very start of the request, give us the
// bytesRead/bytesWritten by the last request to use the same net.Socket object.
const observeBytesRW = (req: Request): (() => void) => {
	const bytesReadPreviously = req.connection._metrics_gatherer!.bytesRead || 0;
	const bytesWrittenPreviously =
		req.connection._metrics_gatherer!.bytesWritten || 0;
	return () => {
		const bytesReadDelta = req.connection.bytesRead - bytesReadPreviously;
		const bytesWrittenDelta =
			req.connection.bytesWritten - bytesWrittenPreviously;
		req.connection._metrics_gatherer!.bytesRead = req.connection.bytesRead;
		req.connection._metrics_gatherer!.bytesWritten =
			req.connection.bytesWritten;
		API_BYTES_READ.observe(req._metrics_gatherer.labels, bytesReadDelta);
		API_BYTES_WRITTEN.observe(req._metrics_gatherer.labels, bytesWrittenDelta);
	};
};

// observe the request latency using process.hrtime
const observeLatency = (req: Request): (() => void) => {
	const t0 = process.hrtime();
	return () => {
		const dt = process.hrtime(t0);
		const duration = dt[0] + dt[1] / 1e9;
		API_LATENCY_SECONDS.observe(req._metrics_gatherer.labels, duration);
	};
};

// attach a middleware to all requests to observe various metrics
export const apiMetricsMiddleware = (registry: prometheus.Registry) => {
	registry.registerMetric(API_ARRIVAL_TOTAL);
	registry.registerMetric(API_BYTES_READ);
	registry.registerMetric(API_BYTES_WRITTEN);
	registry.registerMetric(API_LATENCY_SECONDS);

	return (req: Request, res: Response, next: NextFunction) => {
		modifyReq(req);
		API_ARRIVAL_TOTAL.inc(req._metrics_gatherer.labels, 1);
		const onFinishFuncs = [observeBytesRW(req), observeLatency(req)];
		onFinished(res, () => {
			req._metrics_gatherer.labels.state = req.aborted
				? 'aborted'
				: 'completed';
			req._metrics_gatherer.labels.status_code = res.statusCode || '';
			onFinishFuncs.forEach(f => f());
		});
		next();
	};
};
