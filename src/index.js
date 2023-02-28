import { checkEnv, randString } from './utils.js'
import App from './App.js'

checkEnv()

const app = new App().setupRoutes()
app.start().catch((e) => console.error(e))


