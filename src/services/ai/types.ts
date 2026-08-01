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

export type GardenerIntent = 'refineSeed' | 'summarizeGrowth' | 'generateHarvest' | 'suggestWake'

export type GardenerMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}
