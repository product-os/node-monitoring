import * as fs from 'fs';

import * as express from 'express';

import * as prometheus from 'prom-client';

import * as yaml from 'js-yaml';

import { collectAPIMetrics } from './lib/api-metrics';
import * as config from './lib/config';
import * as dashboardBase from './lib/dashboard-base';
import {
	AlertingRuleSchema,
	MetricsConfig,
	MetricsMap,
	metricsMapFromConfig,
	RecordingRuleSchema,
} from './lib/metrics';

interface Params {
	healthCheck: () => Promise<boolean>;
	metricsConfig: MetricsConfig;
	handleSIGTERM: (terminate: () => void) => void;
	monitoringDir?: string;
	app?: express.Application;
}

export class Svc {
	private params: Params;
	private _initialized: boolean;
	private _terminating: boolean;
	// used by testing to signal that `process.exit(0)` would have run
	public _isTerminated: boolean;

	public name: string;
	public app: express.Application;
	public server: ReturnType<typeof express.application.listen>;
	public metrics: MetricsMap;
	public metricsRegistry: prometheus.Registry;
	public state: { [key: string]: any };

	constructor(name: string, params: Params) {
		this.name = name;
		this.params = params;

		this.setupMetrics();
		this.setupApp();
		this.setupReadyCheck();
		this.setupSIGTERMHandler();
		this.setupMonitoringDiscovery();

		this._initialized = false;
		this._terminating = false;
		this._isTerminated = false;
	}

	// lifecycle management / predicates

	public setInitialized() {
		console.log(`${this.name} initialized.`);
		this._initialized = true;
	}
	public isTerminating() {
		return this._terminating;
	}
	public terminate(testing: boolean = false) {
		console.log(`${this.name} will now terminate.`);
		if (testing) {
			this._isTerminated = true;
		} else {
			process.exit(0);
		}
	}

	// setup functions

	private setupApp() {
		this.app = this.params.app || express();
		collectAPIMetrics(this.app, this.metricsRegistry);
		console.log(`serving ${this.name} on ${config.SVC_PORT}...`);
		this.server = this.app.listen(config.SVC_PORT);
	}
	private setupReadyCheck() {
		this.app.use('/ready', async (_, res) => {
			res.sendStatus(
				this._initialized && (await this.params.healthCheck()) ? 200 : 503,
			);
		});
	}
	private setupSIGTERMHandler() {
		process.on('SIGTERM', () => {
			console.log(`${this.name} caught SIGTERM`);
			this._terminating = true;
			this.params.handleSIGTERM(this.terminate.bind(this));
		});
	}
	private setupMetrics() {
		this.metricsRegistry = new prometheus.Registry();
		prometheus.collectDefaultMetrics({
			register: this.metricsRegistry,
		});
		this.constructMetrics();
		this.serveMetrics();
	}
	private constructMetrics() {
		console.log('describing metrics...');
		this.metrics = metricsMapFromConfig(
			this.params.metricsConfig,
			this.metricsRegistry,
		);
	}
	private setupMonitoringDiscovery() {
		const app = express();
		app.get('/dashboards', this.serveDashboards.bind(this));
		app.get(
			'/alerting-rules',
			this.serveRules.bind(
				this,
				'alert',
				this.params.metricsConfig.alerting_rules,
			),
		);
		app.get(
			'/recording-rules',
			this.serveRules.bind(
				this,
				'record',
				this.params.metricsConfig.recording_rules,
			),
		);
		console.log(
			`serving dashboards, alerting-rules, recording-rules on ${config.MONITOR_DISCOVERY_PORT}...`,
		);
		app.listen(config.MONITOR_DISCOVERY_PORT);
	}

	// express servers / handlers

	private serveMetrics() {
		const app = express();
		app.use('/metrics', (_: express.Request, res: express.Response) => {
			const output = this.metricsRegistry.metrics();
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end(output);
		});
		app.listen(config.METRICS_PORT);
		console.log(`serving metrics on ${config.METRICS_PORT}...`);
	}

	private serveDashboards(_: express.Request, res: express.Response) {
		const dashboardDir = `${config.MONITORING_DIR}/dashboards/`;
		const dashboards = [];
		// file dashboards
		if (fs.existsSync(dashboardDir)) {
			fs.readdirSync(dashboardDir)
				.filter(file => /.+\.json$/.test(file))
				.map(file => `${dashboardDir}/${file}`)
				.map(path => JSON.parse(fs.readFileSync(path).toString()))
				.forEach(dashboard => {
					dashboards.push(dashboard);
				});
		}
		// generated dashboards from config
		if (this.params.metricsConfig.dashboards) {
			for (const [uid, patch] of Object.entries(
				this.params.metricsConfig.dashboards,
			)) {
				const dashboard = Object.assign({ uid }, dashboardBase, patch);
				dashboards.push(dashboard);
			}
		}
		res.send(dashboards);
	}

	private serveRules(
		nameKey: string,
		rules:
			| MetricsConfig['recording_rules']
			| MetricsConfig['alerting_rules']
			| {} = {},
		_: express.Request,
		res: express.Response,
	) {
		const rulesArr: Array<RecordingRuleSchema | AlertingRuleSchema> = [];
		for (const [name, schema] of Object.entries(rules)) {
			const obj = { [nameKey]: name, ...schema };
			rulesArr.push(obj);
		}
		// serve a yaml file by converting the JSON object
		const json = {
			groups: [
				{
					name: `${this.name}-${nameKey}`,
					rules,
				},
			],
		};
		res.send(yaml.safeDump(json));
	}
}
