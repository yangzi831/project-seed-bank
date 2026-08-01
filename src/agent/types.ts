import type { Outcome, PlantCategory, ProjectStatus, ZoneKey } from '../data/garden'

export type AgentScenario = 'seed-discovery' | 'growth-companion' | 'harvest-assistant'

export type ProjectAgentContext = {
  kind: 'project'
  projectId: string
  title: string
  description: string
  status: ProjectStatus
  logs: Array<{ text: string; createdAt: string }>
  outcomes: Outcome[]
  createdAt: string
  updatedAt: string
}

export type GardenAgentContext = {
  kind: 'garden'
  projects: Array<{
    title: string
    status: ProjectStatus
    zoneId: ZoneKey
  }>
}

export type AgentContext = ProjectAgentContext | GardenAgentContext

export type AgentRequest = {
  scenario: AgentScenario
  message: string
  context: AgentContext
}

export type AgentSuggestion = {
  id: string
  scenario: AgentScenario
  eyebrow: string
  title: string
  summary: string
  points: string[]
  draft?: string
  seedDraft?: AgentSeedDraft
  obstacles?: string[]
  milestoneSuggestions?: string[]
  createdAt: string
}

export type AgentResponse = {
  requestId: string
  suggestion: AgentSuggestion
  source: 'mock' | 'api'
}

export type AgentSeedDraft = {
  title: string
  description: string
  zoneId: ZoneKey
  plantCategory: PlantCategory
  goal: string
  tags: string[]
  firstMilestone: string
}

export interface GardenKeeperAgent {
  request(request: AgentRequest): Promise<AgentResponse>
}

export type SuggestionDecision = 'pending' | 'accepted' | 'ignored'
