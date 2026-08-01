import { loadAISettings } from './settings'
import type { GardenerIntent, GardenerMessage, RefineSeedOutput, SummarizeGrowthOutput } from './types'
import { gardenerSystemPrompt, refineSeedPrompt, summarizeGrowthPrompt } from './prompts'

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
    return localFallback(options)
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: options.intent,
        system: options.system ?? gardenerSystemPrompt,
        prompt: buildPromptForIntent(options.intent),
        messages: options.messages,
        settings: {
          provider: settings.provider,
          model: settings.model,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
        },
      }),
    })
    if (!response.ok) throw new GardenerError(`AI 服务不可用（${response.status}）`)
    const data = (await response.json()) as { data?: unknown }
    if (!data.data) throw new GardenerError('AI 返回为空')
    return data.data
  } catch {
    return localFallback(options)
  }
}

function buildPromptForIntent(intent: GardenerIntent): string {
  if (intent === 'refineSeed') return refineSeedPrompt()
  if (intent === 'summarizeGrowth') return summarizeGrowthPrompt()
  return ''
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

function localFallback(options: CallOptions): RefineSeedOutput | SummarizeGrowthOutput {
  const text = options.messages[options.messages.length - 1]?.content ?? ''
  if (options.intent === 'refineSeed') {
    const idea = text.replace(/^现有专案参考：[\s\S]*?\n\n/, '').trim()
    const isSystemIdea = /系统|知识库|归档|组件|长期|结构|收藏|资料/.test(idea)
    const isExperiment = /AI|工具|自动|生成|原型|实验|黑客松|脚本|助手/.test(idea)
    return {
      title: idea.replace(/[。！？!?，,、\s]+$/g, '').slice(0, 12) || '未命名种子',
      description: idea.slice(0, 40),
      zoneId: isSystemIdea ? 'woodland' : isExperiment ? 'experiment' : 'flower',
      plantCategory: isSystemIdea ? 'tree' : isExperiment ? 'green' : 'flower',
      goal: '先做出一个可以被观察和继续推进的最小版本',
      tags: [],
      firstMilestone: '完成第一次最小尝试并记录结果',
    }
  }

  const hasLogs = /最近成长日志：/.test(text)
  return {
    summary: hasLogs ? '项目已经留下了一些生长痕迹，可以把最近一次进展收束成下一步。' : '项目还没有足够的生长记录，先留下第一条观察。',
    obstacles: hasLogs ? [] : ['还没有生长日志，暂时无法判断具体阻塞。'],
    nextSteps: ['写下当前最小可推进的一步', '完成后把结果记入生长日志'],
    milestoneSuggestions: ['完成第一次可验证尝试'],
  }
}
