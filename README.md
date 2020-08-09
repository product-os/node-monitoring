node-monitoring
===

### Ideas

1. Standardization: Provides a module which standardizes aspects of monitoring setup (metrics object construction / use)

2. Source of truth: Enforces a config object which defines the metrics, alerts, recording rules

3. Modularization: apps define (and expose for discovery) their *own* alerts, recording rules, dashboards, rather than a central repo

### Basic usage

![diagram of node-monitoring usage](https://docs.google.com/drawings/d/e/2PACX-1vQ4hqdIU7mpEvMnukgKqFdCqaacOodd-z0jLJgCDOvUqEejZ4lG2SOKVH3fLlHOu3sWS-6Fs6Q-GC13/pub?w=841&amp;h=609)

### Metrics

Metrics are defined by the `monitoringConfig.metrics.{counter,gauge,histogram,summary}` objects, for example:

```
{
    metrics: {
	counter: [
	    {
	    name: "builder_build_complete_total",
	    help: "number of build requests completed"
	    }
	],
	histogram: [
	    {
	    name: "builder_build_image_size_bytes",
	    help: "bytes per image built",
	    buckets: imageSizeBuckets
	    }
	]
    }
}
```

The schema for each object is that schema expected as argument by the constructors for `prometheus.Counter`, `prometheus.Histogram`, etc. in the [`prom-client`](https://github.com/siimon/prom-client) nodejs prometheus client library.

Once the code using this module has constructed a `Monitoring` object as in the diagram above, metrics objects (of the types from `prom-client`) can be accessed on the `monitoring.metrics` object (as also shown in the diagram).

### Alerting-rules / Recording-rules

The schema for defining alerting rules and recording rules on the `alerting_rules` and `recording_rules` keys of the `monitoringConfig` object is the JSON equivalent of the YAML schema defined by the Prometheus documentation ([alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/), [recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)).

### Discovery

- Any `.json` files representing grafana dashboards in `/etc/monitoring/dashboards/` will be discoverable on `:9393/dashboards`.

- Prometheus metrics will be discoverable on `:9090/metrics`.

- Alerting rules and recording rules will be discoverable on `:9393/alerting-rules`, `:9393/recording-rules`.
