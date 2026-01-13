import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-static-config',
      closeBundle() {
        // Copy staticwebapp.config.json to dist folder for Azure Static Web Apps
        const src = resolve(__dirname, 'staticwebapp.config.json')
        const dest = resolve(__dirname, 'dist', 'staticwebapp.config.json')
        try {
          copyFileSync(src, dest)
          console.log('✓ Copied staticwebapp.config.json to dist/')
        } catch (err) {
          console.warn('⚠ Could not copy staticwebapp.config.json:', err)
        }
      }
    }
  ],
})
