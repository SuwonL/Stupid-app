import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'))

function getDeployCount() {
  try {
    return execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return '0'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.1'),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_DEPLOY_COUNT__: JSON.stringify(getDeployCount()),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
