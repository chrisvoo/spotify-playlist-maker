import { Request, Response } from 'express';
import App from "../libs/App.js"

/**
 * Login route
 * @param {App} app
 */
export default function index(app: App) {
    app.express!.get('/', (req: Request, res: Response) => {
        res.render('index')
    })
}