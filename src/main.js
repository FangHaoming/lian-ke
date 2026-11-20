import App from './app-shell.svelte'
import './app.css'
import { setupOfflineSupport } from './lib/service-worker-client.js'
import { setupPwaInstall } from './lib/pwa-install.js'

const target = document.getElementById('app')
target.innerHTML = ''

setupPwaInstall()
const app = new App({ target })
setupOfflineSupport()
export default app
