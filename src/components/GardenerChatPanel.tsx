import { useEffect, useRef, useState } from 'react'
import { callGardener } from '../services/ai/gardener'
import type { GardenerMessage } from '../services/ai/types'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const HISTORY_KEY = 'gardener-chat:v1'
const HISTORY_LIMIT = 20

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : []
    return Array.isArray(parsed) ? parsed.slice(-HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

type GardenerChatPanelProps = {
  open: boolean
  onClose: () => void
  onOpen: () => void
  gardenContext: string
  buildFullContext: () => string
  projectContext?: string | null
  onProjectContextConsumed: () => void
}

export function GardenerChatPanel({
  open,
  onClose,
  onOpen,
  gardenContext,
  buildFullContext,
  projectContext,
  onProjectContextConsumed,
}: GardenerChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_LIMIT)))
    } catch {
      // 存储不可用时静默
    }
  }, [messages])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading, open])

  async function send(text: string, extraContext?: string) {
    const content = text.trim()
    if (!content || loading) return
    setLoading(true)
    setError(null)

    const userMsg: ChatMessage = { role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)

    const context = extraContext ?? projectContext ?? gardenContext
    if (extraContext || projectContext) {
      onProjectContextConsumed()
    }

    try {
      const history: GardenerMessage[] = next.map((m) => ({ role: m.role, content: m.content }))
      const reply = await callGardener({ intent: 'chat', messages: history, context })
      const assistantMsg: ChatMessage = { role: 'assistant', content: String(reply).trim() }
      setMessages((current) => [...current, assistantMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : '园丁暂时无法回应，请稍后再试')
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  function analyzeGarden() {
    const full = buildFullContext()
    void send('请分析一下我的花园目前的整体进展：哪些项目势头好、哪些卡住了、接下来最值得做的三件事是什么？', full)
  }

  if (!open) {
    return (
      <button className="gardener-fab" type="button" onClick={onOpen} title="和园丁聊聊">
        🌱 园丁
      </button>
    )
  }

  return (
    <div className="gardener-panel">
      <header className="gardener-header">
        <div>
          <strong>数字园丁</strong>
          <span className="gardener-subtitle">你的创意陪伴者</span>
        </div>
        <button className="gardener-analyze" type="button" onClick={analyzeGarden} disabled={loading}>
          🔍 分析我的花园
        </button>
        <button className="dossier-close" type="button" onClick={onClose}>
          关闭
        </button>
      </header>

      <div className="gardener-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="gardener-welcome">
            你好，我是数字园丁。可以和我聊聊你的灵感、计划，或点「分析我的花园」让我看看整个园子的情况。
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`gardener-msg ${m.role}`}>
            <span className="gardener-bubble">{m.content}</span>
          </div>
        ))}
        {loading && (
          <div className="gardener-msg assistant">
            <span className="gardener-bubble gardener-thinking">园丁正在查看花园…</span>
          </div>
        )}
        {error && <p className="claim-error">{error}</p>}
      </div>

      <form
        className="gardener-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="和园丁聊聊…"
          disabled={loading}
        />
        <button className="primary-glass-button" type="submit" disabled={loading || !input.trim()}>
          发送
        </button>
      </form>
    </div>
  )
}
