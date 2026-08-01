import type { ProjectSeed } from '../data/garden'

/**
 * 农场房间纯逻辑：地块 + 作物（项目灵植）+ 浇水/收获。
 * 与 dungeon.ts 同一风格：状态不可变更新、事件驱动 UI、可注入随机源、纯函数可单测。
 *
 * 作物即项目：每块地种一株项目灵植，生长阶段由项目 status 派生。
 */

export const FARM_COLS = 4
export const FARM_ROWS = 3
export const FARM_PLOT_COUNT = FARM_COLS * FARM_ROWS

export type PlotStage = 'empty' | 'growing' | 'mature' | 'dormant' | 'harvested'

export type FarmPlot = {
  id: string
  /** 网格位置。 */
  col: number
  row: number
  /** 种在这块地上的项目 id（empty 时为 undefined）。 */
  projectId?: string
  /** 土壤湿度 0..1，随时间下降，浇水恢复。 */
  moisture: number
}

export type FarmEvent = {
  icon: string
  title: string
  copy: string
  tone: 'gold' | 'danger' | 'success' | 'info'
}

export type FarmState = {
  ownerId: string
  plots: FarmPlot[]
  /** 上次 tick 的时间戳（ms）。 */
  lastTickAt: number
}

export type FarmResolution = {
  state: FarmState
  events: FarmEvent[]
}

/** 由项目状态派生地块生长阶段。 */
export function plotStageFor(project: ProjectSeed | undefined): PlotStage {
  if (!project) return 'empty'
  switch (project.status) {
    case 'growing':
      return 'growing'
    case 'mature':
      return 'mature'
    case 'dormant':
      return 'dormant'
    case 'harvested':
      return 'harvested'
    default:
      return 'growing'
  }
}

export function createFarmState(ownerId: string, now: number = Date.now()): FarmState {
  const plots: FarmPlot[] = []
  for (let row = 0; row < FARM_ROWS; row++) {
    for (let col = 0; col < FARM_COLS; col++) {
      plots.push({ id: `plot-${row}-${col}`, col, row, moisture: 0.6 })
    }
  }
  return { ownerId, plots, lastTickAt: now }
}

/** 把项目铺到空地块（按 projectId 去重，已存在的跳过）。 */
export function assignProjectsToPlots(state: FarmState, projects: ProjectSeed[]): FarmState {
  const assigned = new Set(state.plots.map((p) => p.projectId).filter(Boolean))
  const next = state.plots.map((p) => ({ ...p }))
  let cursor = 0
  for (const project of projects) {
    if (assigned.has(project.id)) continue
    while (cursor < next.length && next[cursor].projectId) cursor++
    if (cursor >= next.length) break
    next[cursor].projectId = project.id
    assigned.add(project.id)
  }
  // 清掉已删除项目占据的地块
  const alive = new Set(projects.map((p) => p.id))
  for (const plot of next) {
    if (plot.projectId && !alive.has(plot.projectId)) plot.projectId = undefined
  }
  return { ...state, plots: next }
}

/** 湿度随时间下降（约 6 分钟从 1 降到 0）。 */
export function tickFarm(state: FarmState, now: number = Date.now()): FarmResolution {
  const elapsed = Math.max(0, now - state.lastTickAt)
  const decay = elapsed / (6 * 60 * 1000)
  const events: FarmEvent[] = []
  const plots = state.plots.map((plot) => {
    if (!plot.projectId) return { ...plot, moisture: 1 }
    const moisture = Math.max(0, plot.moisture - decay)
    if (moisture < 0.25 && plot.moisture >= 0.25) {
      events.push({ icon: '💧', title: '土壤偏干', copy: `有作物缺水了，去浇浇水吧。`, tone: 'danger' })
    }
    return { ...plot, moisture }
  })
  return { state: { ...state, plots, lastTickAt: now }, events }
}

/** 浇水：恢复一块地的湿度。 */
export function waterPlot(state: FarmState, plotId: string): FarmResolution {
  const events: FarmEvent[] = []
  const plots = state.plots.map((plot) => {
    if (plot.id !== plotId) return plot
    events.push({ icon: '💦', title: '浇水中', copy: '作物喝饱了水，精神多了。', tone: 'success' })
    return { ...plot, moisture: 1 }
  })
  return { state: { ...state, plots }, events }
}

/** 某块地是否需要照料（缺水）。 */
export function plotNeedsCare(plot: FarmPlot): boolean {
  return Boolean(plot.projectId) && plot.moisture < 0.4
}
