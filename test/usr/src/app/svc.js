const { Svc } = require('../../../../out');

const { describeMetrics } = require('./metrics');
const { healthCheck, handleSIGTERM } = require('./process');

const svc = new Svc('mock-svc',
    {
        healthCheck,
        describeMetrics,
        handleSIGTERM
    }
);

module.exports = svc;
