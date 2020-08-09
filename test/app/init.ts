import * as express from 'express';
import { monitoring } from './monitoring';
import { hello, goodbye } from './routes';

export const app = express();
app.use(monitoring.middleware());

app.get('/hello', hello);
app.get('/goodbye', goodbye);
