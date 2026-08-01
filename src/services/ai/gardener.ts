import { supabase } from '../supabase/client'
import type { GardenerIntent, GardenerMessage, GenerateHarvestOutput, RefineSeedOutput, SummarizeGrowthOutput } from './types'
import { gardenerSystemPrompt, refineSeedPrompt, summarizeGrowthPrompt, generateHarvestPrompt, gardenerChatPrompt } from './prompts'

export type CallOptions = {
  intent: GardenerIntent
  messages: GardenerMessage[]
  system?: string
  /** 花园/项目上下文：注入为请求首条 user 消息（不进入对话历史） */
  context?: string
}

export class GardenerError extends Error {
  cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'GardenerError'
    this.cause = cause
  }
}

// 统一走 Edge Function（服务端持有 LLM key，客户端不接触密钥）
export async function callGardener(options: CallOptions): Promise<unknown> {
  if (!supabase) {
    throw new GardenerError('AI 服务尚未配置（缺少 Supabase 环境变量）')
  }

  const system = options.system ?? buildSystemForIntent(options.intent)
  const promptContent = buildPromptForIntent(options.intent)
  const contextLine = options.context ? `以下是你需要了解的花园现状（供参考，无需复述）：\n${options.context}\n\n` : ''
  const messages: GardenerMessage[] = [
    ...(contextLine ? [{ role: 'user' as const, content: contextLine }] : []),
    ...(promptContent ? [{ role: 'user' as const, content: promptContent }] : []),
    ...options.messages.map((m) => ({ role: m.role === 'system' ? ('user' as const) : m.role, content: m.content })),
  ]

  const { data, error } = await supabase.functions.invoke('gardener', {
    body: { intent: options.intent, system, messages },
  })

  if (error) {
    // 透传 Edge Function 返回的具体错误（如 LLM 配额不足）
    let detail = error.message
    try {
      const context = (error as { context?: Response }).context
      if (context) {
        const body = (await context.json()) as { error?: string }
        if (body?.error) detail = body.error
      }
    } catch {
      // 解析失败则保留默认信息
    }
    throw new GardenerError(`园丁服务调用失败: ${detail}`)
  }

  const text = (data as { text?: string } | null)?.text ?? ''
  if (!text) {
    throw new GardenerError('园丁没有返回内容')
  }

  if (options.intent === 'chat') {
    return text
  }
  return parseJsonFromResponse(text)
}

function buildSystemForIntent(intent: GardenerIntent): string {
  if (intent === 'chat') return gardenerChatPrompt()
  return gardenerSystemPrompt
}

function buildPromptForIntent(intent: GardenerIntent): string {
  switch (intent) {
    case 'refineSeed':
      return refineSeedPrompt()
    case 'summarizeGrowth':
      return summarizeGrowthPrompt()
    case 'generateHarvest':
      return generateHarvestPrompt()
    default:
      return ''
  }
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

export function assertGenerateHarvestOutput(data: unknown): GenerateHarvestOutput {
  const d = data as Partial<GenerateHarvestOutput>
  return {
    summary: d.summary ?? '',
    highlights: Array.isArray(d.highlights) ? d.highlights : [],
    markdown: d.markdown ?? '',
  }
}
