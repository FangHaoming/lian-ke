import App from './app-shell.svelte'
import './app.css'
import { setupOfflineSupport } from './lib/service-worker-client.js'

const target = document.getElementById('app')
target.innerHTML = ''

const app = new App({ target })
setupOfflineSupport()
export default app
