import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { baseURL } from './src/lib/config.js'

export default defineConfig({
  plugins: [svelte()],
  base: baseURL,
})
