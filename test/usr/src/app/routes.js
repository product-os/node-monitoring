const { metrics } = require('./svc');

const hello = (req, res) => {
    metrics.counter.hello_total.inc(1);
    res.status(200).send('hello');
};

const goodbye = (req, res) => {
    metrics.counter.goodbye_total.inc(1);
    res.status(200).send('goodbye');
};

module.exports = {
    hello,
    goodbye,
};
