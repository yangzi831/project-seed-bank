import type { AISettings } from './settings'
import { loadAISettings } from './settings'
import type { AgentActionOutput, GardenerIntent, GardenerMessage, RefineSeedOutput, SummarizeGrowthOutput } from './types'
import { AGENT_ACTIONS } from './types'
import { decideAgentActionPrompt, gardenerSystemPrompt, refineSeedPrompt, summarizeGrowthPrompt } from './prompts'

const AnthropicVersion = '2023-06-01'

export type CallOptions = {
  intent: GardenerIntent
  messages: GardenerMessage[]
  system?: string
}

export class GardenerError extends Error {
  cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'GardenerError'
    this.cause = cause
  }
}

export async function callGardener(options: CallOptions): Promise<unknown> {
  const settings = loadAISettings()
  if (!settings.enabled) {
    throw new GardenerError('AI 功能尚未启用')
  }

  if (!settings.apiKey) {
    throw new GardenerError('请在设置中输入 API Key')
  }

  const system = options.system ?? gardenerSystemPrompt
  const promptContent = buildPromptForIntent(options.intent)

  const response = await fetchLLM(settings, system, promptContent, options.messages)
  console.info('[Garden Keeper] raw AI response:', response)

  const parsedResponse = parseJsonFromResponse(response)
  console.info('[Garden Keeper] parsed AI response:', JSON.stringify(parsedResponse, null, 2))
  return parsedResponse
}

function buildPromptForIntent(intent: GardenerIntent): string {
  switch (intent) {
    case 'refineSeed':
      return refineSeedPrompt()
    case 'summarizeGrowth':
      return summarizeGrowthPrompt()
    case 'decideAgentAction':
      return decideAgentActionPrompt()
    default:
      return ''
  }
}

async function fetchLLM(
  settings: AISettings,
  system: string,
  promptContent: string,
  messages: GardenerMessage[],
): Promise<string> {
  const baseUrl = settings.baseUrl?.replace(/\/+$/, '') ?? ''

  if (settings.provider === 'anthropic') {
    const url = `${baseUrl}/v1/messages`
    const body = {
      model: settings.model,
      max_tokens: settings.maxTokens,
      system: system,
      messages: [
        { role: 'user', content: promptContent },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey!,
        'anthropic-version': AnthropicVersion,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new GardenerError(`LLM API 请求失败: ${response.status} ${error}`)
    }

    const data = (await response.json()) as AnthropicResponse
    return data.content?.[0]?.text ?? ''
  }

  const url = settings.provider === 'openrouter' ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`
  const body = {
    model: settings.model,
    max_tokens: settings.maxTokens,
    temperature: settings.temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: promptContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new GardenerError(`LLM API 请求失败: ${response.status} ${error}`)
  }

  const data = (await response.json()) as OpenAIResponse
  return data.choices?.[0]?.message?.content ?? ''
}

function parseJsonFromResponse(text: string): unknown {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/```(?:json)?\n?([\s\S]*?)```/) ?? trimmed.match(/(\{[\s\S]*\})/)
  const jsonText = jsonMatch ? jsonMatch[1] : trimmed

  try {
    return JSON.parse(jsonText)
  } catch {
    return {
      summary: trimmed,
      suggestions: [],
    }
  }
}

export function assertRefineSeedOutput(data: unknown): RefineSeedOutput {
  const d = data as Partial<RefineSeedOutput>
  if (!d.title || !d.zoneId || !d.plantCategory) {
    throw new GardenerError('AI 返回的種子精煉結構不完整')
  }
  return {
    title: d.title,
    description: d.description ?? '',
    zoneId: d.zoneId as RefineSeedOutput['zoneId'],
    plantCategory: d.plantCategory as RefineSeedOutput['plantCategory'],
    goal: d.goal ?? '',
    tags: Array.isArray(d.tags) ? d.tags : [],
    firstMilestone: d.firstMilestone ?? '',
  }
}

export function assertSummarizeGrowthOutput(data: unknown): SummarizeGrowthOutput {
  const d = data as Partial<SummarizeGrowthOutput>
  return {
    summary: d.summary ?? '',
    obstacles: Array.isArray(d.obstacles) ? d.obstacles : [],
    nextSteps: Array.isArray(d.nextSteps) ? d.nextSteps : [],
    milestoneSuggestions: Array.isArray(d.milestoneSuggestions) ? d.milestoneSuggestions : [],
  }
}

/** Agent 行为输出：action 硬校验（必须在封闭集合内），其余软默认。 */
export function assertAgentActionOutput(data: unknown): AgentActionOutput {
  const d = data as Partial<AgentActionOutput>
  if (!d.action || !(AGENT_ACTIONS as readonly string[]).includes(d.action)) {
    throw new GardenerError('AI 返回的行動不在允許範圍內')
  }
  return {
    action: d.action,
    targetId: typeof d.targetId === 'string' ? d.targetId : undefined,
    dialogue: d.dialogue ?? '',
    mood: d.mood ?? 'calm',
    reason: d.reason ?? '',
  }
}

type AnthropicResponse = {
  content?: Array<{ type: string; text: string }>
}

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: string } }>
}
