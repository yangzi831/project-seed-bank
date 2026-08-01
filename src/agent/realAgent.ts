import { callGardener, assertRefineSeedOutput, assertSummarizeGrowthOutput, assertGenerateHarvestOutput } from '../services/ai/gardener'
import type { GardenerIntent } from '../services/ai/types'
import { buildAgentContextText } from './serialize'
import type { AgentRequest, AgentSuggestion, GardenKeeperAgent } from './types'

export const realGardenKeeperAgent: GardenKeeperAgent = {
  async request(request) {
    const data = await callGardener({
      intent: intentForScenario(request.scenario),
      messages: [{ role: 'user', content: `${buildAgentContextText(request.context)}\n\n用户关注：${request.message}` }],
    })

    return {
      requestId: createId('request'),
      suggestion: suggestionFromProvider(request, data),
      source: 'api',
    }
  },
}

function suggestionFromProvider(request: AgentRequest, data: unknown): AgentSuggestion {
  const base = {
    id: createId('suggestion'),
    scenario: request.scenario,
    createdAt: new Date().toISOString(),
  }

  if (request.scenario === 'seed-discovery') {
    const seed = assertRefineSeedOutput(data)
    return {
      ...base,
      eyebrow: 'Seed Discovery',
      title: seed.title,
      summary: seed.description,
      points: [seed.goal, seed.firstMilestone, ...seed.tags].filter(Boolean),
      seedDraft: seed,
    }
  }

  if (request.scenario === 'growth-companion') {
    const growth = assertSummarizeGrowthOutput(data)
    return {
      ...base,
      eyebrow: 'Growth Companion',
      title: '读一读最近的生长轨迹',
      summary: growth.summary,
      points: growth.nextSteps,
      obstacles: growth.obstacles,
      milestoneSuggestions: growth.milestoneSuggestions,
    }
  }

  const harvest = assertGenerateHarvestOutput(data)
  return {
    ...base,
    eyebrow: 'Harvest Assistant',
    title: '把成长整理成可以分享的故事',
    summary: harvest.summary,
    points: harvest.highlights,
    draft: harvest.markdown,
  }
}

function intentForScenario(scenario: AgentRequest['scenario']): GardenerIntent {
  const intents: Record<AgentRequest['scenario'], GardenerIntent> = {
    'seed-discovery': 'refineSeed',
    'growth-companion': 'summarizeGrowth',
    'harvest-assistant': 'generateHarvest',
  }
  return intents[scenario]
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
