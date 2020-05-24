node-svc-base
===

Bringing some consistent form and best-practices to node apps.

### Basic usage

Create a `svc.js`:

```javascript
const { Svc } = require('@balena/node-svc-base');

const { describeMetrics } = require('./metrics');
const { healthCheck, handleSIGTERM } = require('./process');

const svc = new Svc('mock-svc',
    {
        healthCheck,
        describeMetrics,
        handleSIGTERM,
    }
);

module.exports = svc;
```

This requires functions of types:
```typescript
    healthCheck: () => Promise<boolean>,
    describeMetrics: (metrics: MetricsGatherer) => void,
    handleSIGTERM: () => Promise<void>,
```

and this would allow use in other files, like:

```javascript
const svc = require('./svc');
const { app, metrics, server } = svc;

app.get('/hello', (req, res) => {
    metrics.inc('hello_total', 1);
    ses.send('hello');
});
server.timeout = 90000;
svc.setInitialized();
```
or, in typescript,

```typescript
import * as svc from './svc';
...
```

**NOTE**: It's important to call `setInitialized()` when your app is ready to serve, or it won't be marked healthy by k8s.

See `./automation/usr/src/app/` for the full example app.

### Params

The full params available when constructing a service can be seen in `src/index.ts`:

```typescript
interface Params {
	healthCheck: () => Promise<boolean>;
	describeMetrics: (metrics: MetricsGatherer) => void;
	handleSIGTERM: () => Promise<void>;
	monitoringDir?: string;
	app?: express.Application;
}
```

### Ports

- `8080` express app (components add their routes, middlewares here)
- `9090` prometheus metrics (from @balena/node-metrics-gatherer)
- `9393` service-discovery for dashboards and alerts

### SIGTERM

The sigterm handler function will be run, and on completion (it should return a promise that resolves), a file `/var/node-svc-base/graceful-shutdown-${name}` will be written. A process waiting for graceful shutdown to complete can watch for this file's creation (for example, a kubernetes `preStop` hook can send `systemctl kill -s SIGTERM ${service}` and then wait on this file.

### Service discovery of dashboards / alerts

The following will automatically served, to be discovered by our monitoring system:

- Any `.json` files representing grafana dashboards in `/etc/monitoring/dashboards/`

- Any prometheus alerts defined in `/etc/monitoring/alerting-rules.yml` see [Prometheus docs - "Alerting Rules"](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) for syntax.
