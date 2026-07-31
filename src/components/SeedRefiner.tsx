import { useState } from 'react'
import type { RefineSeedOutput } from '../services/ai/types'

type SeedRefinerProps = {
  initialIdea: string
  onApply: (output: RefineSeedOutput) => void
  onCancel: () => void
  onRefine: (messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<unknown>
}

export function SeedRefiner({ initialIdea, onApply, onCancel, onRefine }: SeedRefinerProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState(initialIdea)
  const [draft, setDraft] = useState<RefineSeedOutput | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)

    try {
      const response = await onRefine(newMessages)
      const parsed = response as RefineSeedOutput
      setDraft(parsed)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `已為你整理成：${parsed.title}（${parsed.zoneId} / ${parsed.plantCategory}）\n${parsed.description}`,
        },
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 调用失败'
      setMessages([...newMessages, { role: 'assistant', content: `错误：${message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (draft) {
      onApply(draft)
    }
  }

  return (
    <div className="modal-scrim" onClick={onCancel}>
      <div className="glass-panel project-dossier" onClick={(e) => e.stopPropagation()}>
        <div className="dossier-header">
          <h2>和园丁聊聊</h2>
          <button className="dossier-close" type="button" onClick={onCancel}>
            关闭
          </button>
        </div>

        <div className="seed-refiner-messages">
          {messages.length === 0 && <p className="eyebrow">描述你的想法，园丁会帮你把灵感变成一颗具体的种子。</p>}
          {messages.map((message, index) => (
            <div key={index} className={`seed-refiner-message ${message.role}`}>
              {message.content}
            </div>
          ))}
          {loading && <div className="seed-refiner-message assistant">园丁正在思考...</div>}
        </div>

        <div className="dossier-inline-form" style={{ marginTop: '16px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入你的想法..."
            disabled={loading}
          />
          <button className="primary-glass-button" type="button" onClick={handleSend} disabled={loading}>
            发送
          </button>
        </div>

        <div className="dossier-actions">
          <button className="primary-glass-button" type="button" onClick={handleApply} disabled={!draft}>
            采用建议
          </button>
          <button className="ghost-button" type="button" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
