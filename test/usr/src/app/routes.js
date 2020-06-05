const { metrics } = require('./svc');
const { metricNames } = require('./metrics');

const hello = (req, res) => {
    metrics.inc(metricNames.A_GAUGE, 26);
    res.status(200).send('hello');
};

const goodbye = (req, res) => {
    metrics.dec(metricNames.A_GAUGE, 26);
    res.status(200).send('goodbye');
};

module.exports = {
    hello,
    goodbye,
};
