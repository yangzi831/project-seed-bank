import { useState } from 'react'
import { requestGardenKeeper } from '../agent/service'
import type { AgentResponse, GardenAgentContext } from '../agent/types'
import type { GardenKeeper } from '../data/keepers'
import { KeeperAvatar } from './KeeperAvatar'

type GardenKeeperChatPanelProps = {
  keeper: GardenKeeper
  context: GardenAgentContext
  onOpenCottage?: () => void
  onChangeKeeper?: () => void
  onClose: () => void
}

type LocalMessage = {
  id: number
  role: 'keeper' | 'user'
  text: string
  points?: string[]
  source?: AgentResponse['source']
}

const recommendedQuestions = [
  '帮我看看最近的项目',
  '整理我的想法',
  '下一步应该做什么',
]

export function GardenKeeperChatPanel({ keeper, context, onOpenCottage, onChangeKeeper, onClose }: GardenKeeperChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<LocalMessage[]>([
    { id: 1, role: 'keeper', text: `你好，我是${keeperChineseName(keeper)}。我会在这里陪你照料项目。今天想看看哪颗种子？` },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function leaveMessage(text: string) {
    const next = text.trim()
    if (!next || isLoading) return
    const time = Date.now()
    setMessages((current) => [...current, { id: time, role: 'user', text: next }])
    setDraft('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await requestGardenKeeper({
        scenario: 'growth-companion',
        message: next,
        context,
      })
      console.info('[Garden Keeper] requestGardenKeeper response:', JSON.stringify(response, null, 2))

      const keeperMessage: LocalMessage = {
        id: time + 1,
        role: 'keeper',
        text: response.suggestion.summary,
        points: response.suggestion.points,
        source: response.source,
      }
      console.info('[Garden Keeper] chat state message:', JSON.stringify(keeperMessage, null, 2))
      setMessages((current) => [...current, keeperMessage])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '园丁暂时没有回应，请稍后再试。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-scrim keeper-chat-scrim" role="presentation" onMouseDown={onClose}>
      <section className="glass-panel keeper-chat-panel" role="dialog" aria-modal="true" aria-labelledby="keeper-chat-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="keeper-chat-header">
          <KeeperAvatar keeper={keeper} size="chat" active />
          <div>
            <p className="eyebrow">A quiet corner in your garden</p>
            <h2 id="keeper-chat-title">和{keeperChineseName(keeper)}聊聊</h2>
            <small>{keeper.personality} · {keeper.recommendedUse}</small>
            <p className="keeper-chat-personality">{keeper.description}</p>
          </div>
          <button className="dossier-close" type="button" onClick={onClose}>Close</button>
        </header>

        <div className="keeper-chat-messages" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`keeper-chat-bubble is-${message.role}`}>
              {message.role === 'keeper' && <KeeperAvatar keeper={keeper} size="small" />}
              <div className="keeper-chat-message-content">
                {message.role === 'keeper' && <small>{keeper.name}{message.source === 'mock' ? ' · local companion' : ''}</small>}
                <p>{message.text}</p>
                {message.points?.length ? <ul>{message.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="keeper-chat-bubble is-keeper is-loading">
              <KeeperAvatar keeper={keeper} size="small" />
              <div className="keeper-chat-message-content"><small>{keeper.name}</small><p>正在读一读花园里的生长信号…</p></div>
            </div>
          )}
        </div>

        {error && <p className="keeper-chat-error" role="alert">{error}</p>}

        <div className="keeper-question-prompts" aria-label="推荐问题">
          <small>可以从这里开始</small>
          <div>
            {recommendedQuestions.map((question) => (
              <button key={question} type="button" disabled={isLoading} onClick={() => { void leaveMessage(question) }}>{question}</button>
            ))}
          </div>
        </div>

        <form className="keeper-chat-input" onSubmit={(event) => { event.preventDefault(); void leaveMessage(draft) }}>
          <input value={draft} disabled={isLoading} onChange={(event) => setDraft(event.target.value)} placeholder={`告诉${keeperChineseName(keeper)}，你正在想什么……`} autoFocus />
          <button type="submit" disabled={isLoading || !draft.trim()}>{isLoading ? '正在倾听…' : '留下一句话'}</button>
        </form>

        <footer className="keeper-chat-footer">
          <span>没有 API Key 时会自动使用本地园丁回应。</span>
          <div>
            {onChangeKeeper && <button type="button" className="ghost-button" onClick={onChangeKeeper}>更换园丁</button>}
            {onOpenCottage && <button type="button" className="ghost-button" onClick={onOpenCottage}>进入园丁小屋 →</button>}
          </div>
        </footer>
      </section>
    </div>
  )
}

export function keeperChineseName(keeper: GardenKeeper) {
  return keeper.name.split(' ')[0]
}
