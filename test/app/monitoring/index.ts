// in real code, woudl be `from '@balena/node-monitoring'`
import { Monitoring } from '../../../src/';
import { monitoringConfig } from './config';
export const monitoring = new Monitoring(
	'mock-svc',
	{ monitoringConfig }
);
export const metrics = monitoring.metrics;
