import { useState } from 'react'
import type { AgentSeedDraft } from '../agent/types'

type SeedRefinerProps = {
  initialIdea: string
  onApply: (output: AgentSeedDraft) => void
  onCancel: () => void
  onRefine: (messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<unknown>
}

export function SeedRefiner({ initialIdea, onApply, onCancel, onRefine }: SeedRefinerProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState(initialIdea)
  const [draft, setDraft] = useState<AgentSeedDraft | null>(null)
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
      const parsed = response as AgentSeedDraft
      setDraft(parsed)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `先知已经把模糊火种刻成：${parsed.title}（${parsed.zoneId} / ${parsed.plantCategory}）\n${parsed.description}`,
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
          <h2>与墓中先知交谈</h2>
          <button className="dossier-close" type="button" onClick={onCancel}>
            合上石板
          </button>
        </div>

        <div className="seed-refiner-messages">
          {messages.length === 0 && <p className="eyebrow">说出模糊的愿望，先知会把它刻成一枚可执行的项目火种。</p>}
          {messages.map((message, index) => (
            <div key={index} className={`seed-refiner-message ${message.role}`}>
              {message.content}
            </div>
          ))}
          {loading && <div className="seed-refiner-message assistant">先知正在读取火焰...</div>}
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
