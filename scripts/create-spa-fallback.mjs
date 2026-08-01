import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve('dist')
const indexPath = resolve(distDir, 'index.html')
const fallbackPath = resolve(distDir, '404.html')

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html does not exist. Run vite build before creating the SPA fallback.')
}

copyFileSync(indexPath, fallbackPath)
console.log('Created dist/404.html for GitHub Pages SPA fallback.')
