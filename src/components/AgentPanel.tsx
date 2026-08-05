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
  { id: 'seed-discovery', name: 'Seed Discovery', description: '帮助发现和整理新的想法', prompt: '帮我理清这颗想法，找到一个最小的开始。' },
  { id: 'growth-companion', name: 'Growth Companion', description: '陪伴想法成长，观察植物的生长阶段', prompt: '读一读这颗想法最近的成长，并建议下一步。' },
  { id: 'harvest-assistant', name: 'Creation Companion', description: '陪想法逐渐形成清晰的作品表达', prompt: '帮我整理这颗想法已经形成的内容。' },
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
          <h3>你的 AI 园丁</h3>
          <p>陪伴想法成长，读一读植物留下的生长痕迹。决定始终由你来做。</p>
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
        <p>{project.title} · {project.logs.length} 条成长记录 · {project.outcomes.length} 项成果记录 · 更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</p>
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
