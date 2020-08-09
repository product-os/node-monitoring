import * as prometheus from 'prom-client';

// Schema used to define a recording rule
// see: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
export interface RecordingRuleSchema {
	record: string;
	expr: string;
	labels?: {
		[name: string]: string;
	};
}

// Schema used to define an alert
// see: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
export interface AlertingRuleSchema {
	alert: string;
	expr: string;
	for?: string;
	annotations: {
		summary: string;
		description: string;
	};
	labels?: {
		severity: string;
	};
}

// subset of the tree of properties in a grafana dashboard which are configurable
// (can be expanded in future as we support more generated dashboard features)
export interface DashboardPatchSchema {
	title: string;
	panels: Array<{
		title: string;
		type: string;
		targets: Array<{ expr: string; legendFormat?: string }>;
		yaxes?: Array<{ min?: number; decimals?: number }>;
	}>;
}

// schema for the object to be passed to `new Svc()`
export interface MonitoringConfig {
	metrics: {
		gauge?: Array<prometheus.GaugeConfiguration<string>>;
		counter?: Array<prometheus.CounterConfiguration<string>>;
		histogram?: Array<prometheus.HistogramConfiguration<string>>;
		summary?: Array<prometheus.SummaryConfiguration<string>>;
	};
	recording_rules?: RecordingRuleSchema[];
	alerting_rules?: AlertingRuleSchema[];
	dashboards?: DashboardPatchSchema[];
}

// object used to expose metrics objects to user code, enabling lines like:
// metrics.gauge.fridge_temperature.set(-10)
// or
// metrics.histogram.request_latency.observe(latency)
export interface MetricsMap {
	gauge: {
		[name: string]: prometheus.Gauge<string>;
	};
	counter: {
		[name: string]: prometheus.Counter<string>;
	};
	histogram: {
		[name: string]: prometheus.Histogram<string>;
	};
	summary: {
		[name: string]: prometheus.Summary<string>;
	};
}
