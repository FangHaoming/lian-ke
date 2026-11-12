import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { baseURL } from './src/lib/config.js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [svelte()],
  base: baseURL,
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        challenges: resolve(projectRoot, 'challenges/index.html'),
      },
    },
  },
})
