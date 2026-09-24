import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
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

export default defineConfig({
  plugins: [react(), thankYouRoute()],
})
