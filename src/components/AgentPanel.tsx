import { useState } from 'react'
import { createAgentContext } from '../agent/context'
import { requestGardenKeeper } from '../agent/service'
import type { AgentResponse, AgentScenario, AgentSuggestion, SuggestionDecision } from '../agent/types'
import type { ProjectSeed } from '../data/garden'

type AgentPanelProps = {
  project: ProjectSeed
  initialScenario?: AgentScenario
}

const scenarios: Array<{ id: AgentScenario; name: string; description: string; prompt: string }> = [
  { id: 'seed-discovery', name: 'Seed Discovery', description: '把模糊想法整理成可以开始的种子', prompt: '帮我理清这颗项目种子，找到一个最小的开始。' },
  { id: 'growth-companion', name: 'Growth Companion', description: '阅读日志，发现变化与下一步', prompt: '读一读这个项目最近的成长，并建议下一步。' },
  { id: 'harvest-assistant', name: 'Harvest Assistant', description: '整理项目故事与作品集描述', prompt: '帮我把这个项目整理成一段作品集介绍。' },
]

export function AgentPanel({ project, initialScenario = 'growth-companion' }: AgentPanelProps) {
  const initialFlow = scenarios.find((item) => item.id === initialScenario) ?? scenarios[1]
  const [scenario, setScenario] = useState<AgentScenario>(initialFlow.id)
  const [message, setMessage] = useState(initialFlow.prompt)
  const [suggestion, setSuggestion] = useState<AgentSuggestion | null>(null)
  const [source, setSource] = useState<AgentResponse['source']>('mock')
  const [decision, setDecision] = useState<SuggestionDecision>('pending')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function chooseScenario(nextScenario: AgentScenario) {
    const next = scenarios.find((item) => item.id === nextScenario) ?? scenarios[0]
    setScenario(next.id)
    setMessage(next.prompt)
    setSuggestion(null)
    setDecision('pending')
  }

  async function askKeeper() {
    if (!message.trim() || isThinking) return
    setIsThinking(true)
    setDecision('pending')
    setError(null)

    try {
      const response = await requestGardenKeeper({
        scenario,
        message: message.trim(),
        context: createAgentContext(project),
      })
      setSuggestion(response.suggestion)
      setSource(response.source)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '守护者暂时没有回应。')
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <section className="agent-panel" aria-label="AI Garden Keeper">
      <header className="agent-identity">
        <div className="keeper-orb" aria-hidden="true"><span>✦</span></div>
        <div>
          <p className="eyebrow">AI Garden Keeper · local preview</p>
          <h3>花园守护者</h3>
          <p>我会读一读这颗植物留下的生长痕迹，陪你辨认方向。决定始终由你来做。</p>
        </div>
        <span className="agent-presence"><i /> 正在花园里</span>
      </header>

      <div className="agent-scenario-grid" role="tablist" aria-label="Garden Keeper modes">
        {scenarios.map((item) => (
          <button
            key={item.id}
            className={scenario === item.id ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={scenario === item.id}
            onClick={() => chooseScenario(item.id)}
          >
            <strong>{item.name}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className="agent-context-note">
        <span>正在感知</span>
        <p>{project.title} · {project.logs.length} 条日志 · {project.outcomes.length} 项成果 · 更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</p>
      </div>

      <form className="agent-input" onSubmit={(event) => { event.preventDefault(); void askKeeper() }}>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="告诉守护者，你现在最想理清什么……" />
        <button type="submit" disabled={isThinking || !message.trim()}>{isThinking ? '正在聆听生长…' : '请守护者看看'}</button>
      </form>

      {error && <p className="agent-error" role="alert">{error}</p>}

      {suggestion && (
        <article className={`agent-suggestion ${decision !== 'pending' ? `is-${decision}` : ''}`}>
          <div className="suggestion-glow" aria-hidden="true" />
          <p className="eyebrow">{suggestion.eyebrow} · {source === 'api' ? 'model insight' : 'mock insight'}</p>
          <h4>{suggestion.title}</h4>
          <p>{suggestion.summary}</p>
          <ul>{suggestion.points.map((point) => <li key={point}>{point}</li>)}</ul>
          {suggestion.draft && <blockquote>{suggestion.draft}</blockquote>}
          {decision === 'pending' ? (
            <div className="suggestion-actions">
              <button type="button" onClick={() => setDecision('accepted')}>采纳这条建议</button>
              <button className="ghost-button" type="button" onClick={() => setDecision('ignored')}>暂时忽略</button>
            </div>
          ) : (
            <p className="suggestion-decision">{decision === 'accepted' ? '已收进这次生长计划。' : '已轻轻放下，你随时可以再问。'}</p>
          )}
        </article>
      )}
    </section>
  )
}
