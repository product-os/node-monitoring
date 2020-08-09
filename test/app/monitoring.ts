import { Monitoring } from '../../';
import { monitoringConfig } from './monitoringConfig';
export const monitoring = new Monitoring(
	'mock-svc',
	{ monitoringConfig }
);
export const metrics = monitoring.metrics;
