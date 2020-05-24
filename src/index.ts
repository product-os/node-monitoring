import { exec } from 'child_process';
import * as fs from 'fs';

import * as express from 'express';

import { MetricsGatherer } from '@balena/node-metrics-gatherer';

import * as config from './lib/config';

interface Params {
	healthCheck: () => Promise<boolean>;
	describeMetrics: (metrics: MetricsGatherer) => void;
	handleSIGTERM: () => Promise<void>;
	monitoringDir?: string;
	app?: express.Application;
}

export class Svc {
	private name: string;
	private params: Params;
	private initialized: boolean;

	public app: express.Application;
	public server: ReturnType<typeof express.application.listen>;
	public metrics: MetricsGatherer;

	constructor(name: string, params: Params) {
		this.name = name;
		this.params = params;

		this.setupMetrics();
		this.setupApp();
		this.setupReadyCheck();
		this.setupSIGTERMHandler();
		this.setupMonitoringDiscovery();
		this.initialized = false;
	}
	public setInitialized() {
		console.log(`${this.name} initialized as node-svc-base service`);
		this.initialized = true;
	}
	private setupApp() {
		this.app = this.metrics.collectAPIMetrics(this.params.app || express());
		console.log(`serving ${this.name} on ${config.SVC_PORT}...`);
		this.server = this.app.listen(config.SVC_PORT);
	}
	private setupReadyCheck() {
		this.app.use('/ready', async (_, res) => {
			res.sendStatus(
				this.initialized && (await this.params.healthCheck()) ? 200 : 503,
			);
		});
	}
	private setupSIGTERMHandler() {
		this.ensureGracefulShutdownSignalDir();
		process.on('SIGTERM', () => {
			console.log(`${this.name} caught SIGTERM`);
			this.params.handleSIGTERM().then(() => {
				this.notifyGracefullyTerminated();
				process.exit(0);
			});
		});
	}
	private notifyGracefullyTerminated() {
		console.log(`${this.name} terminated gracefully.`);
		const signalFile = `${config.GRACEFUL_SHUTDOWN_SIGNAL_DIR}/graceful-shutdown-${this.name}`;
		try {
			fs.writeFileSync(signalFile, 'graceful');
		} catch (e) {
			console.error(e);
		}
	}
	private ensureGracefulShutdownSignalDir() {
		try {
			fs.accessSync(config.GRACEFUL_SHUTDOWN_SIGNAL_DIR, fs.constants.W_OK);
		} catch (err) {
			const createCmd = `mkdir ${config.GRACEFUL_SHUTDOWN_SIGNAL_DIR}`;
			console.log(`running: ${createCmd}`);
			exec(createCmd).on('exit', exitCode => {
				if (exitCode !== 0) {
					console.error(
						`could not create ${config.GRACEFUL_SHUTDOWN_SIGNAL_DIR}, SIGTERM handler will not be able to write file to signal graceful shutdown`,
					);
				}
			});
		}
	}
	private setupMetrics() {
		this.metrics = new MetricsGatherer();
		this.metrics.client.register.setDefaultLabels({ balena_svc: this.name });
		console.log('describing metrics...');
		this.params.describeMetrics(this.metrics);
		this.metrics.exportOn(config.METRICS_PORT);
		console.log(`serving metrics on ${config.METRICS_PORT}...`);
	}
	private setupMonitoringDiscovery() {
		const app = express();
		const dashboardDir = `${config.MONITORING_DIR}/dashboards/`;
		const alertingRulesFile = `${config.MONITORING_DIR}/alerting-rules.yml`;
		// dashboards
		// send string[] where each element is the JSON for a dashboard
		app.get('/dashboards', (_, res) => {
			if (fs.existsSync(dashboardDir)) {
				const dashboards = fs
					.readdirSync(dashboardDir)
					.filter(f => /.+\.json$/.test(f))
					.map(f => fs.readFileSync(`${dashboardDir}/${f}`).toString());
				res.send(dashboards);
			} else {
				res.sendStatus(404);
			}
		});
		// alerts
		// send the .yml file contents
		app.get('/alerts', (_, res) => {
			if (fs.existsSync(alertingRulesFile)) {
				res.send(fs.readFileSync(alertingRulesFile).toString());
			} else {
				res.sendStatus(404);
			}
		});
		console.log(
			`serving dashboards/alerts on ${config.MONITOR_DISCOVERY_PORT}...`,
		);
		app.listen(config.MONITOR_DISCOVERY_PORT);
	}
}
