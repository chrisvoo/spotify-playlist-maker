import { inspect } from 'node:util'
import { checkEnv } from './libs/utils.js'
import App from './libs/App.js'
import Scanner from './libs/scan/Scanner.js'

checkEnv()

const app = new App().setupRoutes()
app.start().catch((e) => console.error(e))

const s = new Scanner()
s.scan('/home/christian/Downloads/The Hives Complete Discography')
    .then((result) => {
        console.log(inspect(s.playlists, { colors: true, depth: 10 }))
    })