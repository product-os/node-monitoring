export const SVC_PORT =
	parseInt(process.env['NODE_SVC_BASE_SVC_PORT'] as string, 10) || 8080;
export const METRICS_PORT =
	parseInt(process.env['NODE_SVC_BASE_METRICS_PORT'] as string, 10) || 9090;
export const MONITOR_DISCOVERY_PORT =
	parseInt(process.env['NODE_SVC_BASE_MONITOR_DISCOVERY_PORT'] as string, 10) ||
	9393;
export const MONITORING_DIR =
	process.env?.['MONITORING_DIR'] ?? '/etc/monitoring/';
export const GRACEFUL_SHUTDOWN_SIGNAL_DIR =
	process.env?.['GRACEFUL_SHUTDOWN_SIGNAL_DIR'] ?? '/var/node-svc-base/';
