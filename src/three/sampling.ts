/**
 * 植物 PNG → 3D 粒子点云采样。
 *
 * 把透明发光的植物贴图画到离屏 canvas，按 alpha 阈值收集像素，
 * 再给每个采样点一个 z 深度（椭球壳：中轴最深、轮廓边缘渐浅 + 确定性抖动），
 * 旋转时产生内部视差 → 看起来像一株灌木而非一张卡片。
 *
 * 纯算法部分（椭球壳 z 深度、抖动、点预算下采样）与 DOM 解耦，可单测。
 */

export type SampledPoint = { x: number; y: number; z: number; r: number; g: number; b: number }
export type SampledCloud = { positions: Float32Array; colors: Float32Array; count: number }

export const SAMPLE_ALPHA_THRESHOLD = 40

/** 确定性 0..1 伪随机（避免每次渲染抖动图案变化）。 */
export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * 椭球壳 z 深度。
 * nx / ny：以点云包围盒中心为原点的归一化坐标（-1..1）。
 * 中轴（nx=0,ny=0）最深 = maxDepth，轮廓边缘（nx²+ny²→1）渐浅至 0。
 */
export function ellipsoidShellZ(nx: number, ny: number, maxDepth: number): number {
  const d2 = nx * nx + ny * ny
  if (d2 >= 1) return 0
  return Math.sqrt(1 - d2) * maxDepth
}

/** 将像素数组按预算下采样（确定性：步长抽样，起点按 hash）。 */
export function downsample<T>(items: T[], budget: number): T[] {
  if (items.length <= budget) return items
  const step = items.length / budget
  const start = Math.floor(hash01(items.length) * step)
  const out: T[] = []
  for (let i = 0; i < budget; i++) {
    out.push(items[Math.min(items.length - 1, Math.floor(start + i * step))])
  }
  return out
}

export type BuildCloudOptions = {
  /** 目标点预算。 */
  budget: number
  /** 点云半宽（world 单位）。 */
  halfWidth: number
  /** 点云半高（world 单位）。 */
  halfHeight: number
  /** 最大 z 深度（world 单位）。 */
  maxDepth: number
}

/**
 * 由原始像素点构造粒子点云（纯函数，可单测）。
 * pixels：已按 alpha 过滤的像素（含归一化坐标与颜色）。
 */
export function buildCloud(
  pixels: Array<{ nx: number; ny: number; r: number; g: number; b: number }>,
  opts: BuildCloudOptions,
): SampledCloud {
  const picked = downsample(pixels, opts.budget)
  const count = picked.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const p = picked[i]
    const jitter = (hash01(i) - 0.5) * 0.3 * opts.maxDepth
    const z = ellipsoidShellZ(p.nx, p.ny, opts.maxDepth) + jitter
    positions[i * 3] = p.nx * opts.halfWidth
    positions[i * 3 + 1] = p.ny * opts.halfHeight
    positions[i * 3 + 2] = z
    colors[i * 3] = p.r / 255
    colors[i * 3 + 1] = p.g / 255
    colors[i * 3 + 2] = p.b / 255
  }

  return { positions, colors, count }
}

/**
 * 从一张植物 PNG（可跨域同源）采样粒子点云。
 * 依赖 DOM（Image / canvas），浏览器环境使用。
 */
export async function samplePlantImage(url: string, opts: BuildCloudOptions): Promise<SampledCloud> {
  const img = await loadImage(url)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0 }

  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h).data

  // 以内容包围盒中心为原点归一化，避免透明边距导致偏移。
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]
      if (a > SAMPLE_ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0 }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const halfContentW = (maxX - minX) / 2 || 1
  const halfContentH = (maxY - minY) / 2 || 1

  const pixels: Array<{ nx: number; ny: number; r: number; g: number; b: number }> = []
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * w + x) * 4
      const a = data[idx + 3]
      if (a <= SAMPLE_ALPHA_THRESHOLD) continue
      pixels.push({
        nx: (x - cx) / halfContentW,
        ny: (cy - y) / halfContentH, // y 翻转：图像向下为正，世界向上为正
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      })
    }
  }

  return buildCloud(pixels, opts)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load plant image: ${url}`))
    img.src = url
  })
}
