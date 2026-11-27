import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* The admin is served by the .NET API from its wwwroot, so the session cookie
   is same-origin. In dev, Vite proxies /api to `dotnet run` (Api/Properties/launchSettings.json). */
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../Api/wwwroot', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:5063' } },
})
