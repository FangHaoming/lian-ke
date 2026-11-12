import App from './app-shell.svelte'
import './app.css'

const target = document.getElementById('app')
target.innerHTML = ''

const app = new App({ target })
export default app
