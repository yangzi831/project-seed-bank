import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { gardenAiProxy } from './vite-plugin-garden-ai'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/project-seed-bank/' : '/',
  plugins: [react(), gardenAiProxy()],
})
