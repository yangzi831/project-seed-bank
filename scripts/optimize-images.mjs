// 构建后图片压缩：sips 降采样 + pngquant 有损量化（保持 .png 格式与文件名，零引用改动）
// 用法：node scripts/optimize-images.mjs（在项目根目录运行，作用于 dist/images）
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST_IMAGES = join(process.cwd(), 'dist', 'images')
const QUALITY = '70-85'
const MAX_WIDTH = 1600 // 背景大图降采样上限

function walk(dir) {
  const files = []
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walk(full))
    } else if (full.endsWith('.png')) {
      files.push(full)
    }
  }
  return files
}

function run(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: 'pipe' })
  } catch {
    // 单个文件失败不影响整体
  }
}

const files = walk(DIST_IMAGES)
let savedBytes = 0
let skipped = 0

for (const file of files) {
  const before = statSync(file).size

  // 大图（garden 背景/总览）先降采样，保留透明通道但减小像素
  if (file.includes('/garden/')) {
    const tmp = `${file}.tmp.png`
    run('sips', ['-Z', String(MAX_WIDTH), file, '--out', tmp])
    if (existsSync(tmp)) {
      run('pngquant', ['--quality', QUALITY, '--force', '-o', file, tmp])
      try {
        execFileSync('rm', [tmp])
      } catch {
        /* ignore */
      }
    }
  } else {
    run('pngquant', ['--quality', QUALITY, '--skip-if-larger', '--force', '-o', file, file])
  }

  const after = statSync(file).size
  if (after >= before) {
    skipped++
  } else {
    savedBytes += before - after
  }
}

console.log(
  `[optimize-images] ${files.length} 张图，压缩 ${(savedBytes / 1024 / 1024).toFixed(1)}MB，` +
    `${skipped} 张未变小保留原样`,
)
