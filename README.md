node-svc-base
===

Bringing some consistent form and best-practices to node apps.

### Basic usage:

Components will define a `service.js` or `service.ts` file which exports a metrics object and an express app.

```javascript
const Svc = require('@balena/balena-svc');

const svc = new Svc('delta',
    {
        isReady,
        describeMetrics,
        handleSIGTERM,
    }
);

module.exports = {
    app: svc.app;
    metrics: svc.metrics
}
```

where

- `isReady` is a function returning true/false whether the service is ready to serve
- `describeMetrics` is a function in which component authors should call `metrics.describe.${type}(...)` for all metrics which will be exported by the service
- `handleSIGTERM` is a function which will be called when the container receives SIGTERM from kubelet

Elsewhere in the component, one can then import these for use, eg.:

```javascript
const { app, metrics } = require('../service');

app.use('/hello', (req, res) => {
    metrics.counter('hello_total', 1);
});
```

**Ports:**

- `8080` express app (components add their routes, middlewares here)
- `9090` prometheus metrics (from @balena/node-metrics-gatherer)
- `9393` service-discovery for dashboards and alerts

### Service discovery of dashboards / alerts

The following will automatically served, to be discovered by our monitoring system:

- Any `.json` files representing grafana dashboards in `/etc/monitoring/dashboards/`

- Any prometheus alerts defined in `/etc/monitoring/alerting-rules.yml` see [Prometheus docs - "Alerting Rules"](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) for syntax.
