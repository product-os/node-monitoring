import { expect } from 'chai';
import 'mocha';
import fetch from 'node-fetch';

import { Svc } from '../src';
// @ts-ignore
import * as testSvc from './usr/src/app/init';
const svc: Svc = testSvc as Svc;

describe('service', () => {
	it('serving on :8080/hello', async () => {
		const res = await fetch('http://localhost:8080/hello');
		expect(res.status).to.equal(200);
	});

	it('serving metrics on :9090/metrics', async () => {
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
		expect(/mock_svc_discovered_dash/.test(text)).to.be.true;
	});

	it('serving 200 on :8080/ready after 2 seconds', async () => {
		await new Promise(resolve => setTimeout(resolve, 2100));
		const res = await fetch('http://localhost:8080/ready');
		expect(res.status).to.equal(200);
	}).timeout(2200);

	it('handling SIGTERM', async () => {
		// this function is what the SIGTERM handler would call if we were running
		// the svc in its own process. We pass the param (`testing`) as true to
		// prevent `process.exit(0)` from running (kill this testing suite :P )
		svc.terminate(true);
		await new Promise(resolve => setTimeout(resolve, 2100));
		expect(svc._isTerminated).to.be.true;
	}).timeout(2200);
});
