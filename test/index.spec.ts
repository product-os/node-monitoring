import { expect } from 'chai';
import 'mocha';
import fetch from 'node-fetch';
import * as path from 'path';

process.env.NODE_MONITORING_TOOL_DASHBOARDS_DIR = path.join(__dirname, 'app');
// @ts-ignore
import { app } from './app/init';
app.listen(8080);

describe('run mock svc', () => { 
	it('serving metrics on :9090/metrics', async () => {
		await fetch('http://localhost:8080/hello');
		const res = await fetch('http://localhost:9090/metrics');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/process_open_fds/.test(text)).to.be.true;
		expect(/hello_total.+1/.test(text)).to.be.true;
		expect(/api_bytes_read_bucket.+1/.test(text)).to.be.true;
	});

	it('serving alerts on :9393/alerting-rules', async () => {
		const res = await fetch('http://localhost:9393/alerting-rules');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/TooManyHellos/.test(text)).to.be.true;
	});

	it('serving alerts on :9393/recording-rules', async () => {
		const res = await fetch('http://localhost:9393/recording-rules');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/hello_total - goodbye_total/.test(text)).to.be.true;
	});

	it('serving dashboards on :9393/dashboards', async () => {
		const res = await fetch('http://localhost:9393/dashboards');
		expect(res.status).to.equal(200);
		const text = await res.text();
		expect(/world-dash/.test(text)).to.be.true;
	});

});
