import type { PlantCategory, ProjectStatus, ZoneKey } from '../../data/garden'

export type RefineSeedOutput = {
  title: string
  description: string
  zoneId: ZoneKey
  plantCategory: PlantCategory
  goal: string
  tags: string[]
  firstMilestone: string
}

export type SummarizeGrowthOutput = {
  summary: string
  obstacles: string[]
  nextSteps: string[]
  milestoneSuggestions: string[]
}

export type GenerateHarvestOutput = {
  summary: string
  highlights: string[]
  markdown: string
}

export type SuggestWakeOutput = {
  reconnectReason: string
  microSteps: string[]
  recommendedStatus: ProjectStatus
}

export type GardenerIntent = 'refineSeed' | 'summarizeGrowth' | 'generateHarvest' | 'suggestWake' | 'decideAgentAction'

export type GardenerMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Agent 角色可执行的封闭动作集合。LLM 只能从这里选，防止幻觉动作崩溃行为状态机。 */
export const AGENT_ACTIONS = ['idle', 'walk', 'gesture', 'speak', 'tendCrop', 'moveToProject', 'goToPortal'] as const
export type AgentAction = (typeof AGENT_ACTIONS)[number]

export type AgentActionOutput = {
  action: AgentAction
  /** 目标 id（地块 / 项目 / 传送门），按 action 而定。 */
  targetId?: string
  /** Agent 说的话（气泡 bark）。 */
  dialogue?: string
  /** 情绪，驱动动画状态。 */
  mood?: string
  /** 决策理由（调试/日志用）。 */
  reason?: string
}
