/**
 * Feature flags — 控制实验性功能的开关。
 *
 * 设置为 false 时，对应模块不会加载，回退到 P0 纯前端体验。
 * 生产环境建议全部关闭或通过 URL 参数控制。
 */

export type FeatureFlags = {
  /** 3D 渲染层（Three.js 墓塔场景、粒子植物） */
  enable3D: boolean
  /** 地牢桌游 HUD */
  enableDungeonGame: boolean
  /** AI 园丁/先知（LLM 调用） */
  enableAI: boolean
  /** Agent 系统（园丁守护者） */
  enableAgent: boolean
  /** 多房间种子世界 */
  enableWorld: boolean
  /** 农场系统 */
  enableFarm: boolean
}

/**
 * 从 URL 参数和环境读取特性开关。
 *
 * - `?ext=all` → 启用所有实验功能
 * - `?ext=none` → 仅 P0 核心
 * - `?ext=3d,ai` → 仅启用 3D 和 AI
 * - 默认：开发环境全开，生产环境全关
 */
export function loadFeatureFlags(): FeatureFlags {
  const params = new URLSearchParams(window.location.search)
  const ext = params.get('ext')

  if (ext === 'all') {
    return { enable3D: true, enableDungeonGame: true, enableAI: true, enableAgent: true, enableWorld: true, enableFarm: true }
  }

  if (ext === 'none') {
    return { enable3D: false, enableDungeonGame: false, enableAI: false, enableAgent: false, enableWorld: false, enableFarm: false }
  }

  if (ext) {
    const keys = ext.split(',').map(s => s.trim())
    return {
      enable3D: keys.includes('3d'),
      enableDungeonGame: keys.includes('game'),
      enableAI: keys.includes('ai'),
      enableAgent: keys.includes('agent'),
      enableWorld: keys.includes('world'),
      enableFarm: keys.includes('farm'),
    }
  }

  // 默认：开发环境全开
  const isDev = import.meta.env.DEV
  return {
    enable3D: isDev,
    enableDungeonGame: isDev,
    enableAI: isDev,
    enableAgent: isDev,
    enableWorld: isDev,
    enableFarm: isDev,
  }
}

/** 单例缓存 */
let _flags: FeatureFlags | null = null

export function getFeatureFlags(): FeatureFlags {
  if (!_flags) {
    _flags = loadFeatureFlags()
  }
  return _flags
}

/** 测试用：重置缓存 */
export function __resetFeatureFlagsForTest() {
  _flags = null
}
