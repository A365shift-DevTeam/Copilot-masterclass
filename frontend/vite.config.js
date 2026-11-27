import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/* /thank-you is rendered by the same bundle (see src/main.jsx). Copying the
   built index.html to thank-you/index.html lets any static host serve that
   URL directly, with no SPA rewrite rules needed. */
function thankYouRoute() {
  let outDir
  return {
    name: 'thank-you-route',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      mkdirSync(resolve(outDir, 'thank-you'), { recursive: true })
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, 'thank-you/index.html'))
    },
  }
}

export default defineConfig(({ command, mode }) => {
  // The admin backend is the source of prices, dates and offers; a live build without it would sell at stale prices.
  if (command === 'build' && mode === 'production' && !loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL)
    throw new Error('Set VITE_API_URL (the admin API address) in .env.production or the build environment.')
  return {
    plugins: [react(), thankYouRoute()],
    build: {
      // Hashed JS/CSS go to static/, apart from the fixed-name files in
      // public/assets, so web.config can cache them for a year.
      assetsDir: 'static',
    },
  }
})
