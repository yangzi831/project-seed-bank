import { supabase } from '../services/supabase/client'
import { mockGardenKeeperAgent } from './mockAgent'
import { realGardenKeeperAgent } from './realAgent'
import type { AgentRequest, AgentResponse, GardenKeeperAgent } from './types'

export async function requestGardenKeeper(request: AgentRequest): Promise<AgentResponse> {
  return selectAgent().request(request)
}

// 统一走 Edge Function（服务端持有 LLM key）；Supabase 未配置时退回 mock 演示
export function selectAgent(): GardenKeeperAgent {
  return supabase ? realGardenKeeperAgent : mockGardenKeeperAgent
}
