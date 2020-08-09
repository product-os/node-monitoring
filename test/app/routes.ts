import { Request, Response} from 'express';

import { metrics } from './monitoring';

export const hello = (_: Request, res: Response) => {
    metrics.counter.hello_total.inc(1);
    res.status(200).send('hello');
};

export const goodbye = (_: Request, res: Response) => {
    metrics.counter.goodbye_total.inc(1);
    res.status(200).send('goodbye');
};
