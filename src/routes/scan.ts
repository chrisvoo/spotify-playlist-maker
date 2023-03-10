import { existsSync, lstatSync } from 'node:fs'
import { Request, Response, NextFunction } from 'express';
import App from '../libs/App.js';

/**
 * Scan local files for creating the playlist
 * @param {App} app
 */
export default function scan(app: App) {
    app.express!.get('/scan', async (req: Request, res: Response, next: NextFunction) => {
        if (
            !existsSync(process.env.MUSIC_DIRECTORY!) ||
            !lstatSync(process.env.MUSIC_DIRECTORY!).isDirectory()
        ) {
            throw new Error('MUSIC_DIRECTORY must be a directory')
        }

        res.set({
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive'
        });
        res.flushHeaders();
        res.write('retry: 3000\n\n');

        let goOnCondition = true

        res.on('close', () => {
            goOnCondition = false
            console.log('client dropped me');
            res.end();
        });

        let count = 0;

        while (goOnCondition) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Emit', ++count);

            res.write(`event: ciccio\ndata: ${count}\n\n`);
        }
    })
}