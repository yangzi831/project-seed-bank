/**
 * WebGL 可用性探测 + 设备分档。
 * 结果按会话缓存，避免重复创建上下文。
 */

export type DeviceTier = 'high' | 'medium' | 'low'

let cachedSupport: boolean | null = null
let cachedTier: DeviceTier | null = null

export function webglAvailable(): boolean {
  if (cachedSupport !== null) return cachedSupport
  if (typeof window === 'undefined') {
    cachedSupport = false
    return false
  }
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    cachedSupport = Boolean(gl)
    if (gl) {
      const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
  } catch {
    cachedSupport = false
  }
  return cachedSupport
}

export function getDeviceTier(): DeviceTier {
  if (cachedTier) return cachedTier
  if (typeof navigator === 'undefined') {
    cachedTier = 'medium'
    return cachedTier
  }
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  if (cores <= 4 || memory <= 4 || mobile) cachedTier = 'low'
  else if (cores <= 8 || memory <= 8) cachedTier = 'medium'
  else cachedTier = 'high'
  return cachedTier
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 是否应回退到 2D DOM 渲染。 */
export function shouldForce2D(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  if (!webglAvailable()) return true
  return /[?&]force2d\b/.test(search)
}

/** 每株植物的粒子点预算（按设备档）。 */
export function pointBudget(tier: DeviceTier = getDeviceTier()): number {
  switch (tier) {
    case 'high':
      return 2600
    case 'medium':
      return 1900
    case 'low':
      return 1100
  }
}

/** 测试用：重置缓存。 */
export function __resetWebglCacheForTest() {
  cachedSupport = null
  cachedTier = null
}
