import { checkEnv } from './libs/utils.js'
import App from './libs/App.js'

checkEnv()

const app = new App().setupRoutes()
app.start().catch((e: Error) => console.error(e))
