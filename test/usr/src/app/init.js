const svc = require('./svc');
const { hello, goodbye } = require('./routes');

svc.app.get('/hello', hello);
svc.app.get('/goodbye', goodbye);
svc.setInitialized();

module.exports = svc;
