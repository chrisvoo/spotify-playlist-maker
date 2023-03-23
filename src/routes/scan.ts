import { existsSync, lstatSync } from 'node:fs'
import { Request, Response, NextFunction } from 'express';
import App from '../libs/App.js';
import Scanner, { ScanEvent, ScanEventAction } from '../libs/scan/Scanner.js';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

/**
 * Scan local files for creating the playlist
 * @param {App} app
 */
export default function scan(app: App) {
    app.express!.get('/scan', async (req: Request, res: Response, next: NextFunction) => {
        if (!app.spotifyClient || !app.spotifyClient.hasLoggedIn()) {
            return res.redirect('/')
        }

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

        res.on('close', () => {
            console.log('client dropped me');
            res.end();
        });

        const scanner = new Scanner(app.spotifyClient)
        scanner.events.on('scan_event', (data: ScanEvent) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);

            if (data.action === ScanEventAction.DONE) {
                res.end();
            }
        })

        scanner.scan(process.env.MUSIC_DIRECTORY!)
    })
}