import * as fs from 'fs';

import * as express from 'express';

import * as prometheus from 'prom-client';

import * as yaml from 'js-yaml';

import { apiMetricsMiddleware } from './api-metrics';
import * as config from './config';
import {
	AlertingRuleSchema,
	MetricsMap,
	MonitoringConfig,
	RecordingRuleSchema,
} from './types';

const metricsMapFromConfig = (
	monitoringConfig: MonitoringConfig,
	registry: prometheus.Registry,
): MetricsMap => {
	const map: MetricsMap = {
		gauge: {},
		counter: {},
		histogram: {},
		summary: {},
	};
	// trying to merge the below 4 loops into 1 generic loop is a typing nightmare
	for (const schema of monitoringConfig.metrics.counter || []) {
		map.counter[schema.name] = new prometheus.Counter(schema);
		registry.registerMetric(map.counter[schema.name]);
	}
	for (const schema of monitoringConfig.metrics.gauge || []) {
		map.gauge[schema.name] = new prometheus.Gauge(schema);
		registry.registerMetric(map.gauge[schema.name]);
	}
	for (const schema of monitoringConfig.metrics.histogram || []) {
		map.histogram[schema.name] = new prometheus.Histogram(schema);
		registry.registerMetric(map.histogram[schema.name]);
	}
	for (const schema of monitoringConfig.metrics.summary || []) {
		map.summary[schema.name] = new prometheus.Summary(schema);
		registry.registerMetric(map.summary[schema.name]);
	}
	return map;
};

interface Params {
	monitoringConfig: MonitoringConfig;
	monitoringDir?: string;
}

export class Monitoring {
	private params: Params;

	public name: string;
	public metrics: MetricsMap;
	public metricsRegistry: prometheus.Registry;

	constructor(name: string, params: Params) {
		this.name = name;
		this.params = params;

		this.setupMetrics();
		this.setupMonitoringDiscovery();
	}

	// setup functions

	private setupMetrics() {
		this.metricsRegistry = new prometheus.Registry();
		prometheus.collectDefaultMetrics({
			register: this.metricsRegistry,
		});
		this.constructMetrics();
		this.serveMetrics();
	}
	private constructMetrics() {
		console.log('describing metrics...');
		this.metrics = metricsMapFromConfig(
			this.params.monitoringConfig,
			this.metricsRegistry,
		);
	}
	private setupMonitoringDiscovery() {
		const app = express();
		app.get('/dashboards', this.serveDashboards.bind(this));
		app.get(
			'/alerting-rules',
			this.serveRules.bind(
				this,
				'alert',
				this.params.monitoringConfig.alerting_rules,
			),
		);
		app.get(
			'/recording-rules',
			this.serveRules.bind(
				this,
				'record',
				this.params.monitoringConfig.recording_rules,
			),
		);
		console.log(
			`serving dashboards, alerting-rules, recording-rules on ${config.DISCOVERY_PORT}...`,
		);
		app.listen(config.DISCOVERY_PORT);
	}

	// express servers / handlers

	public middleware() {
		return apiMetricsMiddleware(this.metricsRegistry);
	}

	private serveMetrics() {
		const app = express();
		app.use('/metrics', (_: express.Request, res: express.Response) => {
			const output = this.metricsRegistry.metrics();
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end(output);
		});
		app.listen(config.METRICS_PORT);
		console.log(`serving metrics on ${config.METRICS_PORT}...`);
	}

	private serveDashboards(_: express.Request, res: express.Response) {
		const dir = config.DASHBOARDS_DIR;
		const dashboards: any[] = [];
		// file dashboards
		if (fs.existsSync(dir)) {
			fs.readdirSync(dir)
				.filter(file => /.+\.json$/.test(file))
				.map(file => `${dir}/${file}`)
				.map(path => JSON.parse(fs.readFileSync(path).toString()))
				.forEach(dashboard => {
					dashboards.push(dashboard);
				});
		}
		res.send(dashboards);
	}

	private serveRules(
		nameKey: string,
		rules:
			| MonitoringConfig['recording_rules']
			| MonitoringConfig['alerting_rules']
			| {} = {},
		_: express.Request,
		res: express.Response,
	) {
		const rulesArr: Array<RecordingRuleSchema | AlertingRuleSchema> = [];
		for (const [name, schema] of Object.entries(rules)) {
			const obj = { [nameKey]: name, ...schema };
			rulesArr.push(obj);
		}
		// serve a yaml file by converting the JSON object
		const json = {
			groups: [
				{
					name: `${this.name}-${nameKey}`,
					rules,
				},
			],
		};
		res.send(yaml.safeDump(json));
	}
}
