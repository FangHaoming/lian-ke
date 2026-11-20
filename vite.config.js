import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { baseURL } from './src/lib/config.js'
import { offlineServiceWorker } from './scripts/vite/offline-service-worker.js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const nativeBuild = process.env.CAPACITOR_BUILD === '1'

export default defineConfig({
  plugins: [svelte(), offlineServiceWorker()],
  base: nativeBuild ? './' : baseURL,
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        challenges: resolve(projectRoot, 'challenges/index.html'),
        share: resolve(projectRoot, 'share/index.html'),
        source: resolve(projectRoot, 'source/index.html'),
      },
    },
  },
})
