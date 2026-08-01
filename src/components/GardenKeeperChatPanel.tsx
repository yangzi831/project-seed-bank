import { useEffect, useRef, useState } from 'react'
import {
  demoPresetQuestions,
  dormantProjectFollowUp,
  getDormantProjectDemoResponse,
  getPresetDemoResponse,
  getSeedCreationDemoResponse,
} from '../agent/demoConversation'
import type { DemoSeedDraft } from '../agent/demoConversation'
import { requestGardenKeeper } from '../agent/service'
import type { AgentResponse, GardenAgentContext } from '../agent/types'
import type { GardenKeeper, KeeperPersonality } from '../data/keepers'
import { KeeperAvatar } from './KeeperAvatar'

type GardenKeeperChatPanelProps = {
  keeper: GardenKeeper
  context: GardenAgentContext
  onOpenCottage?: () => void
  onChangeKeeper?: () => void
  onPlantSeed?: (draft: DemoSeedDraft) => void
  onClose: () => void
}

type LocalMessage = {
  id: number
  role: 'keeper' | 'user'
  text: string
  points?: string[]
  source?: AgentResponse['source']
}

const keeperLoadingMessages: Record<KeeperPersonality, string[]> = {
  '温暖治愈型': ['正在轻轻照看你的种子', '正在感受花园里的生长'],
  '灵感整理型': ['正在收拢漂浮的想法', '正在连接灵感的水纹'],
  '观察分析型': ['正在读取花园的生长轨迹', '正在梳理项目留下的变化'],
  '实验探索型': ['正在寻找新的生长可能', '正在观察一片陌生土壤'],
  '收藏陪伴型': ['正在唤醒沉睡的种子', '正在整理花园里的记忆'],
  '行动推进型': ['正在寻找下一步的光', '正在为种子聚拢能量'],
}

const projectAnalysisQuestions = new Set([
  '帮我看看最近的项目',
  '看看有什么被遗忘的种子',
  '帮我整理一下项目成果',
  '哪些项目正在休眠？我想重新开始做',
  dormantProjectFollowUp,
])

export function GardenKeeperChatPanel({ keeper, context, onOpenCottage, onChangeKeeper, onPlantSeed, onClose }: GardenKeeperChatPanelProps) {
  const messagesRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<LocalMessage[]>([
    { id: 1, role: 'keeper', text: `你好，我是${keeperChineseName(keeper)}。我会在这里陪你照料项目。今天想看看哪颗种子？` },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentProjectsDemoStarted, setRecentProjectsDemoStarted] = useState(false)
  const [seedCreationStarted, setSeedCreationStarted] = useState(false)
  const [seedSuggestion, setSeedSuggestion] = useState<{ messageId: number; draft: DemoSeedDraft; planted: boolean } | null>(null)
  const [typingDots, setTypingDots] = useState(1)
  const [loadingMessage, setLoadingMessage] = useState('正在观察花园')

  useEffect(() => {
    const messagesElement = messagesRef.current
    if (!messagesElement) return
    messagesElement.scrollTo({ top: messagesElement.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!isLoading) return
    setTypingDots(1)
    const typingInterval = window.setInterval(() => {
      setTypingDots((current) => current === 3 ? 1 : current + 1)
    }, 360)
    return () => window.clearInterval(typingInterval)
  }, [isLoading])

  async function leaveMessage(text: string, usePresetDemo = false) {
    const next = text.trim()
    if (!next || isLoading) return
    const time = Date.now()
    setMessages((current) => [...current, { id: time, role: 'user', text: next }])
    setDraft('')
    setError(null)
    setIsLoading(true)
    const thinkingStartedAt = Date.now()
    const thinkingTime = getSimulatedThinkingTime(next)
    setLoadingMessage(getKeeperLoadingMessage(keeper.personality))

    const demoResponse = usePresetDemo
      ? getPresetDemoResponse(next)
      : getDormantProjectDemoResponse(next, recentProjectsDemoStarted)
    const seedCreationResponse = usePresetDemo ? null : getSeedCreationDemoResponse(next, seedCreationStarted)

    try {
      let keeperMessage: LocalMessage

      if (demoResponse || seedCreationResponse) {
        if (usePresetDemo && next === '帮我看看最近的项目') setRecentProjectsDemoStarted(true)
        if (usePresetDemo && next === '我有一个新想法，帮我种下一颗种子') setSeedCreationStarted(true)
        keeperMessage = {
          id: time + 1,
          role: 'keeper',
          text: seedCreationResponse?.message ?? demoResponse ?? '',
          points: [],
          source: 'demo',
        }
        console.info('[Garden Keeper] demo chat state message:', JSON.stringify(keeperMessage, null, 2))
      } else {
        const response = await requestGardenKeeper({
          scenario: 'growth-companion',
          message: next,
          context,
        })
        console.info('[Garden Keeper] requestGardenKeeper response:', JSON.stringify(response, null, 2))
        keeperMessage = {
          id: time + 1,
          role: 'keeper',
          text: response.suggestion.summary,
          points: response.suggestion.points,
          source: response.source,
        }
        console.info('[Garden Keeper] chat state message:', JSON.stringify(keeperMessage, null, 2))
      }

      await waitForMinimumThinkingTime(thinkingStartedAt, thinkingTime)
      setMessages((current) => [...current, keeperMessage])
      if (seedCreationResponse) {
        setSeedSuggestion({ messageId: keeperMessage.id, draft: seedCreationResponse.draft, planted: false })
      }
    } catch (requestError) {
      await waitForMinimumThinkingTime(thinkingStartedAt, thinkingTime)
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

        <div ref={messagesRef} className="keeper-chat-messages" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`keeper-chat-bubble is-${message.role}`}>
              {message.role === 'keeper' && <KeeperAvatar keeper={keeper} size="small" />}
              <div className="keeper-chat-message-content">
                {message.role === 'keeper' && <small>{keeper.name}{message.source === 'mock' ? ' · local companion' : ''}</small>}
                <p style={{ whiteSpace: 'pre-line' }}>{message.text}</p>
                {message.points?.length ? <ul>{message.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
                {seedSuggestion?.messageId === message.id && (
                  <div className="keeper-seed-suggestion">
                    <dl>
                      <div><dt>项目名称</dt><dd>{seedSuggestion.draft.projectName}</dd></div>
                      <div><dt>类型</dt><dd>{seedSuggestion.draft.type}</dd></div>
                      <div><dt>推荐区域</dt><dd>{seedSuggestion.draft.recommendedZone}</dd></div>
                      <div><dt>简短描述</dt><dd>{seedSuggestion.draft.description}</dd></div>
                    </dl>
                    <button
                      type="button"
                      disabled={seedSuggestion.planted}
                      onClick={() => {
                        onPlantSeed?.(seedSuggestion.draft)
                        setSeedSuggestion((current) => current ? { ...current, planted: true } : current)
                      }}
                    >
                      {seedSuggestion.planted ? '已种进花园 ✓' : '种下这颗种子'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="keeper-chat-bubble is-keeper is-loading">
              <KeeperAvatar keeper={keeper} size="small" />
              <div className="keeper-chat-message-content">
                <small>{keeper.name}</small>
                <p>{loadingMessage}<span aria-hidden="true">{'.'.repeat(typingDots)}</span></p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="keeper-chat-error" role="alert">{error}</p>}

        <div className="keeper-question-prompts" aria-label="推荐问题">
          <small>可以从这里开始</small>
          <div>
            {demoPresetQuestions.map((question) => (
              <button key={question} type="button" disabled={isLoading} onClick={() => { void leaveMessage(question, true) }}>{question}</button>
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

function getKeeperLoadingMessage(personality: KeeperPersonality) {
  const messages = keeperLoadingMessages[personality]
  return messages[Math.floor(Math.random() * messages.length)]
}

function getSimulatedThinkingTime(message: string) {
  const isProjectAnalysis = projectAnalysisQuestions.has(message)
    || ['分析', '项目', '复盘', '休眠', '成果'].some((keyword) => message.includes(keyword))
  return isProjectAnalysis ? randomBetween(1800, 2800) : randomBetween(1000, 1800)
}

function randomBetween(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
}

async function waitForMinimumThinkingTime(startedAt: number, minimumThinkingTime: number) {
  const remainingTime = minimumThinkingTime - (Date.now() - startedAt)
  if (remainingTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingTime))
}
