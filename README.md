node-svc-base
===

Bringing some consistent form and best-practices to node apps, especially when it comes to metrics.

### Basic usage

Create a `svc.js`:

```javascript
const { Svc } = require('@balena/node-svc-base');

const { metricsConfig } = require('./metrics');
const { healthCheck, handleSIGTERM } = require('./lifecycle');

const svc = new Svc('mock-svc',
    {
        healthCheck,
        handleSIGTERM,
        metricsConfig
    }
);

module.exports = svc;
```

This requires arguments of types:
```typescript
    healthCheck: () => Promise<boolean>,
    handleSIGTERM: (terminate : () => void) => void,
    metricsConfig: MetricsConfig
```

(for the definition of the type `MetricsConfig` see `./src/lib/metrics.ts`)

This allows use in other files, like:
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
	metricsConfig: MetricsConfig;
	handleSIGTERM: (() => void) => void;
	monitoringDir?: string;
	app?: express.Application;
}
```
### MetricsConfig

The `metricsConfig` parameter is important since it allows one to specify many different but related aspects of metrics, as an object with top-level keys: `metrics`, `recording_rules`, `alerts`, `dashboards`. See `./src/lib/metrics.ts` for the type signatures of the objects under these keys.

### Graceful Shutdown

When the process receives SIGTERM, the `handleSIGTERM` function will be called, and `svc.isTerminating()` will begin to return `true`. When the work has been done to gracefully handle SIGTERM, the user code can call `svc.terminate()` or - which is the same function - can call `terminate : () => void` passed to `handleSIGTERM`, which will call `process.exit(0)`.

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
