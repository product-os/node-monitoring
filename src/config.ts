export const METRICS_PORT =
	parseInt(process.env['NODE_MONITORING_TOOL_METRICS_PORT'] as string, 10) ||
	9090;
export const DISCOVERY_PORT =
	parseInt(process.env['NODE_MONITORING_TOOL_DISCOVERY_PORT'] as string, 10) ||
	9393;
export const DASHBOARDS_DIR =
	(process.env['NODE_MONITORING_TOOL_DASHBOARDS_DIR'] as string) ||
	'/etc/monitoring/dashboards/';
