const { Svc } = require('../../../../out');
const { healthCheck, handleSIGTERM } = require('./lifecycle');

const metricsConfig = require('./metricsConfig');

const svc = new Svc('mock-svc',
    {
        healthCheck,
        handleSIGTERM,
        metricsConfig,
    }
);

module.exports = svc;
