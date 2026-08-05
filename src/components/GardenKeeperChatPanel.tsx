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

type KeeperIntent = 'companion-chat' | 'idea-exploration' | 'plant-idea' | 'other'

const keeperLoadingMessages: Record<KeeperPersonality, string[]> = {
  '温暖治愈型': ['正在轻轻照看你的种子', '正在感受花园里的生长'],
  '灵感整理型': ['正在收拢漂浮的想法', '正在连接灵感的水纹'],
  '观察分析型': ['正在读取花园的生长轨迹', '正在梳理想法留下的变化'],
  '实验探索型': ['正在寻找新的生长可能', '正在观察一片陌生土壤'],
  '收藏陪伴型': ['正在唤醒沉睡的种子', '正在整理花园里的记忆'],
  '行动推进型': ['正在寻找下一步的光', '正在为种子聚拢能量'],
}

const projectAnalysisQuestions = new Set([
  '帮我看看最近的想法',
  '看看有什么被遗忘的种子',
  '帮我整理一下想法已经形成的内容',
  '哪些想法正在休眠？我想重新开始',
  dormantProjectFollowUp,
])

export function GardenKeeperChatPanel({ keeper, context, onOpenCottage, onChangeKeeper, onPlantSeed, onClose }: GardenKeeperChatPanelProps) {
  const messagesRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<LocalMessage[]>([
    { id: 1, role: 'keeper', text: `你好，我是${keeperChineseName(keeper)}，住在你的 Bloom 花园里。\n\n我是陪伴想法成长的数字园丁。你可以和我随便聊聊，也可以带来一个还没成形的念头，我们慢慢看看它想长成什么。` },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentProjectsDemoStarted, setRecentProjectsDemoStarted] = useState(false)
  const [seedCreationStarted, setSeedCreationStarted] = useState(false)
  const [pendingIdea, setPendingIdea] = useState<string | null>(null)
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
    const intent = usePresetDemo ? 'other' : detectKeeperIntent(next)
    let seedCreationResponse = null as ReturnType<typeof getSeedCreationDemoResponse>
    let localResponse: string | null = null
    let shouldInviteIdeaDescription = false

    if (!usePresetDemo && !demoResponse) {
      if (intent === 'companion-chat') {
        localResponse = getCompanionResponse(next, keeper)
      } else if (intent === 'plant-idea') {
        const ideaToPlant = extractIdeaFromPlantingMessage(next) || pendingIdea
        if (ideaToPlant) {
          seedCreationResponse = getSeedCreationDemoResponse(ideaToPlant, true)
        } else {
          localResponse = `可以。我会先替你留好一块土壤。\n\n告诉我这颗想法现在大概是什么样子，不用完整，一句话也可以。`
          shouldInviteIdeaDescription = true
        }
      } else if (seedCreationStarted) {
        seedCreationResponse = getSeedCreationDemoResponse(next, true)
      } else if (intent === 'idea-exploration') {
        setPendingIdea(next)
        localResponse = `我听见这个念头了。它现在还不需要马上变成一株植物。\n\n我们可以先看看：你最在意它的哪一部分？\n\n你想先聊聊这个想法，还是把它种进花园？`
      }
    }

    try {
      let keeperMessage: LocalMessage

      if (demoResponse || seedCreationResponse || localResponse) {
        if (usePresetDemo && next === '帮我看看最近的想法') setRecentProjectsDemoStarted(true)
        if (usePresetDemo && next === '我有一个新想法，帮我种下一颗种子') setSeedCreationStarted(true)
        if (shouldInviteIdeaDescription) setSeedCreationStarted(true)
        keeperMessage = {
          id: time + 1,
          role: 'keeper',
          text: seedCreationResponse?.message ?? demoResponse ?? localResponse ?? '',
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
        setPendingIdea(null)
        setSeedCreationStarted(false)
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
                      <div><dt>想法名称</dt><dd>{seedSuggestion.draft.projectName}</dd></div>
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
          <span>AI 由花园统一提供；离线时自动使用本地园丁回应。</span>
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
    || ['分析', '想法', '复盘', '休眠', '成果'].some((keyword) => message.includes(keyword))
  return isProjectAnalysis ? randomBetween(1800, 2800) : randomBetween(1000, 1800)
}

function randomBetween(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum
}

async function waitForMinimumThinkingTime(startedAt: number, minimumThinkingTime: number) {
  const remainingTime = minimumThinkingTime - (Date.now() - startedAt)
  if (remainingTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingTime))
}

function detectKeeperIntent(message: string): KeeperIntent {
  const normalized = message.toLowerCase().replace(/[\s，。！？!?、,.]/g, '')
  const companionMessages = [
    '你好', '您好', '嗨', 'hi', 'hello', '早上好', '早安', '下午好', '晚上好', '晚安',
    '你是谁', '你叫什么', '在吗', '谢谢', '谢谢你', '多谢', '感谢', '感谢你',
  ]
  if (companionMessages.includes(normalized)) return 'companion-chat'
  if (['你好', '您好', '嗨', '晚上好', '早上好', '谢谢', '感谢'].some((signal) => normalized.startsWith(signal)) && normalized.length <= 10) return 'companion-chat'

  const plantingSignals = ['帮我记录', '记录这个想法', '把它种下', '把这个种下', '种下来', '种进花园', '放进花园', '创建这个想法', '创建想法']
  if (plantingSignals.some((signal) => normalized.includes(signal))) return 'plant-idea'

  const explorationSignals = ['我最近想', '最近想', '我有个想法', '我有一个想法', '我有一个新想法', '我不知道这个', '不知道这个东西', '想做一个', '想试试', '在考虑', '有点想']
  if (explorationSignals.some((signal) => normalized.includes(signal))) return 'idea-exploration'

  return 'other'
}

function getCompanionResponse(message: string, keeper: GardenKeeper) {
  const normalized = message.replace(/[\s，。！？!?、,.]/g, '')
  const name = keeperChineseName(keeper)
  if (normalized.includes('你是谁') || normalized.includes('你叫什么')) {
    return `我是${name}，住在这座花园里的数字园丁。\n\n我不会替你决定想法应该长成什么，只会陪你观察、整理，也提醒你给重要的念头留一点空间。`
  }
  if (normalized.includes('谢谢') || normalized.includes('多谢') || normalized.includes('感谢')) {
    return `不用客气。想法不需要每次都得到答案，有时只是被认真听见，就已经获得了一点继续生长的空间。`
  }
  if (normalized.includes('晚安')) {
    return `晚安。今晚不用照料所有植物，让花园自己安静生长一会儿吧。`
  }
  if (normalized.includes('晚上好')) {
    return `晚上好。我在这里。\n\n今晚可以只是聊聊，不一定要种下什么。最近有没有一个念头，偶尔会回来找你？`
  }
  return `你好，我在这里。\n\n你不需要马上带来一个完整的想法。我们可以随便聊聊，也可以一起看看花园里哪株植物需要一点关注。`
}

function extractIdeaFromPlantingMessage(message: string) {
  const afterSeparator = message.split(/[：:]/).slice(1).join(':').trim()
  if (afterSeparator.length >= 4) return afterSeparator
  const cleaned = message
    .replace(/请|可以|能不能|麻烦/g, '')
    .replace(/帮我记录|记录这个想法|把它种下来|把它种下|把这个种下|种进花园|放进花园|创建这个想法|创建想法/g, '')
    .replace(/这个想法|这个念头/g, '')
    .replace(/[，。！？!?、,.]/g, ' ')
    .trim()
  return cleaned.length >= 6 ? cleaned : ''
}
