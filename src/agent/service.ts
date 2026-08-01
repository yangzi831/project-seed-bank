import { loadAISettings } from '../services/ai/settings'
import { mockGardenKeeperAgent } from './mockAgent'
import { realGardenKeeperAgent } from './realAgent'
import type { AgentRequest, AgentResponse, GardenKeeperAgent } from './types'

export async function requestGardenKeeper(request: AgentRequest): Promise<AgentResponse> {
  return selectAgent().request(request)
}

export function selectAgent(): GardenKeeperAgent {
  const settings = loadAISettings()
  return settings.enabled && settings.apiKey ? realGardenKeeperAgent : mockGardenKeeperAgent
}
