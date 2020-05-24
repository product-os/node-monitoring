const metricNames = {
    A_GAUGE: 'a_gauge',
}

const describeMetrics = (metrics) => {
    metrics.describe.gauge(metricNames.A_GAUGE, 'some gauge');
};

module.exports = {
    describeMetrics,
    metricNames,
};
