import { Request, Response, NextFunction } from 'express';
import App from '../libs/App.js';

/**
 * Error route
 * @param {App} app
 */
export default function internalError(app: App): void {
    app.express!.use(function(err: Error, req: Request, res: Response, next: NextFunction): void{
        // we may use properties of the error object
        // here and next(err) appropriately, or if
        // we possibly recovered from the error, simply next().
        res.status(500);
        res.render('errors/500', { error: err });
    });
}