const fs = require('fs');

const express = require('express');

const { MetricsGatherer } = require('@balena/node-metrics-gatherer');

const pingHandler = (req, res) => res.sendStatus(200);

class Svc {
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.metrics = new MetricsGatherer();
        this.metrics.client.register.setDefaultLabels({"balena_svc": this.name});
        this.setupApp();
        this.setupMetrics();
        process.on('SIGTERM', config.handleSIGTERM);
    }
    setupApp() {
        this.app = this.metrics.collectAPIMetrics(express());
        const readyHandler = (req, res) => {
            res.sendStatus(this.config.isReady() ? 200 : 503);
        };
        this.app.use('/ready', readyHandler || ping);
        this.app.listen(8080);
    }
    setupMetrics() {
        this.serveDashboardsAndAlerts();
        this.metrics.exportOn(9090);
        this.config.describeMetrics(this.metrics);
    }
    serveDashboardsAndAlerts() {
        const app = express();
        const dashboardDir = '/etc/monitoring/dashboards/';
        const alertingRulesFile = '/etc/monitoring/alerting-rules.yml';
        // dashboards
        // send string[] where each element is the JSON for a dashboard
        app.get('/dashboards', (req, res) => {
            if (fs.existsSync(dashboardDir)) {
                const dashboards = fs.readdirSync(dashboardDir)
                    .filter(f => /.+\.json$/.test(f))
                    .map(f => fs.readFileSync(`${dashboardDir}/${f}`).toString())
                res.send(dashboards);
            } else {
                res.sendStatus(404);
            }
        });
        // alerts
        // send the .yml file contents
        app.get('/alerts', (req, res) => {
            if (fs.existsSync(alertingRulesFile)) {
                res.send(fs.readFileSync(alertingRulesFile).toString());
            } else {
                res.sendStatus(404);
            }
        });
        app.listen(9393);
    }
}

module.exports = Svc;
