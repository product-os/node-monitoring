import { expect } from 'chai';
import { spawn } from 'child_process';
import * as fs from 'fs';
import 'mocha';
import fetch from 'node-fetch';

// only start the app running if we're not in a context (docker image w/ systemd,
// as is created in ./automation/) where it's already running
let svc: ReturnType<typeof spawn>;
const runServer = () => {
	return new Promise((resolve, reject) => {
		const child = spawn('node', ['./test/usr/src/app/init']);
		child.stderr!.on('data', b => {
			console.error(`[STDERR] ${b.toString()}`);
		});
		child.stdout!.on('data', b => {
			const str = b.toString();
			if (/mock-svc initialized as node-svc-base service/.test(str)) {
				console.error('SERVICE INITIALIZED');
				resolve(child);
			} else {
				console.error(str);
			}
		});
		child.on('exit', (code: number) => {
			if (code !== 0) {
				const e = new Error(
					`node ./test/usr/src/app/init exited with exitcode=${code}`,
				);
				console.error(e);
				reject(e);
				process.exit(1);
			}
		});
	});
};
const init = () => {
	process.env['GRACEFUL_SHUTDOWN_SIGNAL_DIR'] = '/tmp/node-svc-base/';
	process.env['MONITORING_DIR'] = './test/etc/monitoring';
	return runServer().then((child: ReturnType<typeof spawn>) => (svc = child));
};
const gracefulShutdownFile = () => {
	const signalDir =
		process.env['GRACEFUL_SHUTDOWN_SIGNAL_DIR'] || '/var/node-svc-base';
	return `${signalDir}/graceful-shutdown-mock-svc`;
};

describe('service', () => {
	after(() => {
		if (!svc.killed) {
			svc.kill('SIGKILL');
		}
		fs.unlinkSync(gracefulShutdownFile());
	});

	before(async () => {
		await init();
	});

	it('serving on :8080/hello', async () => {
		const res = await fetch('http://localhost:8080/hello');
		expect(res.status).to.equal(200);
	});

	it('serving metrics on :9090/metrics', async () => {
		const res = await fetch('http://localhost:9090/metrics');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/a_gauge.+26/.test(text)).to.be.true;
	});

	it('serving alerts on :9393/alerts', async () => {
		const res = await fetch('http://localhost:9393/alerts');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/Alert1/.test(text)).to.be.true;
	});

	it('serving dashboards on :9393/dashboards', async () => {
		const res = await fetch('http://localhost:9393/dashboards');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/mock_svc_discovered_dash/.test(text)).to.be.true;
	});

	it('serving 200 on :8080/ready after 2 seconds', async () => {
		await new Promise(resolve => setTimeout(resolve, 2100));
		const res = await fetch('http://localhost:8080/ready');
		expect(res.status).to.equal(200);
	}).timeout(2200);

	it('handling SIGTERM', async () => {
		svc.kill(); // send SIGTERM
		await new Promise(resolve => setTimeout(resolve, 2100));
		console.error(`looking for ${gracefulShutdownFile()} ...`);
		expect(fs.existsSync(gracefulShutdownFile())).to.be.true;
	}).timeout(2200);
});
