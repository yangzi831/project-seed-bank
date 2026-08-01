import { assertAgentActionOutput, callGardener, GardenerError } from '../services/ai/gardener'
import { agentSystemPrompt } from '../services/ai/prompts'
import type { AgentActionOutput } from '../services/ai/types'
import type { ProjectSeed } from '../data/garden'
import type { FarmPlot } from './farm'
import { plotNeedsCare } from './farm'

/**
 * Agent 大脑：限频调用 Web LLM，把房间状态 + 最近事件交给模型，
 * 让它从封闭动作集合里选一个行为。LLM 不可用 / 出错 / 返回非法动作时回退到本地规则。
 */

export type AgentDecisionContext = {
  ownerName: string
  plots: FarmPlot[]
  projects: ProjectSeed[]
  recentEvents: string[]
  /** 距上次决策的秒数。 */
  idleSeconds: number
}

export type AgentBrain = {
  /** 请求一次决策（内部限频，过于频繁时返回 null 表示「沿用上一个动作」）。 */
  decide(ctx: AgentDecisionContext): Promise<AgentActionOutput | null>
  /** 当前是否正在等待 LLM 响应。 */
  isThinking(): boolean
  cancel(): void
}

export type AgentBrainOptions = {
  /** 两次 LLM 决策的最小间隔（ms），默认 8s。 */
  minIntervalMs?: number
  /** 强制使用本地规则（不调用 LLM），用于低配或测试。 */
  forceLocal?: boolean
}

export function createAgentBrain(opts: AgentBrainOptions = {}): AgentBrain {
  const minInterval = opts.minIntervalMs ?? 8000
  let lastCallAt = 0
  let thinking = false
  let cancelled = false

  async function decide(ctx: AgentDecisionContext): Promise<AgentActionOutput | null> {
    if (cancelled) return null
    const now = Date.now()
    if (thinking || now - lastCallAt < minInterval) return null
    lastCallAt = now

    if (opts.forceLocal) return localDecision(ctx)

    thinking = true
    try {
      const raw = await callGardener({
        intent: 'decideAgentAction',
        system: agentSystemPrompt,
        messages: [{ role: 'user', content: buildContextText(ctx) }],
      })
      const output = assertAgentActionOutput(raw)
      // 校验 targetId 是否引用真实存在的对象；不合法则降级为本地规则。
      if (!isTargetValid(output, ctx)) return localDecision(ctx)
      return output
    } catch (err) {
      // LLM 未配置 / 网络错误 / 非法动作 → 本地规则兜底。
      if (!(err instanceof GardenerError)) {
        // 非预期错误也静默兜底，Agent 不应崩溃。
      }
      return localDecision(ctx)
    } finally {
      thinking = false
    }
  }

  return {
    decide,
    isThinking: () => thinking,
    cancel() {
      cancelled = true
      thinking = false
    },
  }
}

/** 组装给 LLM 的房间上下文（含可选 targetId 列表，供模型引用）。 */
export function buildContextText(ctx: AgentDecisionContext): string {
  const plotLines = ctx.plots
    .map((p) => {
      if (!p.projectId) return `地块 ${p.id}（第${p.row + 1}行第${p.col + 1}列）：空地`
      const proj = ctx.projects.find((x) => x.id === p.projectId)
      const need = plotNeedsCare(p) ? '，缺水' : ''
      return `地块 ${p.id}：种着「${proj?.title ?? p.projectId}」（状态 ${proj?.status ?? '未知'}，湿度 ${(p.moisture * 100) | 0}%${need}）`
    })
    .join('\n')
  const events = ctx.recentEvents.length ? ctx.recentEvents.slice(-3).join('；') : '暂无'
  return `房间主人：${ctx.ownerName}
距离上次决策：${Math.round(ctx.idleSeconds)} 秒

地块状况：
${plotLines}

可选 targetId：
- 地块 id：${ctx.plots.map((p) => p.id).join(', ')}
- 项目 id：${ctx.projects.map((p) => p.id).join(', ') || '无'}
- 传送门 id：portal-exit（通往大地图）

最近事件：${events}`
}

/** 校验 LLM 返回的 targetId 是否指向真实对象。 */
function isTargetValid(output: AgentActionOutput, ctx: AgentDecisionContext): boolean {
  if (!output.targetId) return true
  if (output.action === 'tendCrop') return ctx.plots.some((p) => p.id === output.targetId)
  if (output.action === 'moveToProject') return ctx.projects.some((p) => p.id === output.targetId)
  if (output.action === 'goToPortal') return output.targetId === 'portal-exit'
  return true
}

/** 本地规则兜底：优先照料缺水作物，其次随机散步/自言自语。 */
export function localDecision(ctx: AgentDecisionContext): AgentActionOutput {
  const needy = ctx.plots.find((p) => plotNeedsCare(p))
  if (needy) {
    return { action: 'tendCrop', targetId: needy.id, dialogue: '这株有点渴了，我来浇浇水。', mood: 'focused', reason: 'local:needy-crop' }
  }
  const matured = ctx.projects.find((p) => p.status === 'mature')
  if (matured && Math.random() < 0.4) {
    return { action: 'moveToProject', targetId: matured.id, dialogue: '这株长得真好。', mood: 'happy', reason: 'local:admire' }
  }
  const roll = Math.random()
  if (roll < 0.3) return { action: 'walk', dialogue: '', mood: 'calm', reason: 'local:wander' }
  if (roll < 0.5) return { action: 'speak', dialogue: '今天也是个适合生长的好天气。', mood: 'calm', reason: 'local:chatter' }
  return { action: 'idle', dialogue: '', mood: 'calm', reason: 'local:idle' }
}
