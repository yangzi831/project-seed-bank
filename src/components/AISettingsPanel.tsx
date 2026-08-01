import { useState } from 'react'
import type { AISettings as AISettingsType } from '../services/ai/settings'

 type AISettingsPanelProps = {
  settings: AISettingsType
  onChange: (settings: AISettingsType) => void
  onClose: () => void
}

export function AISettingsPanel({ settings, onChange, onClose }: AISettingsPanelProps) {
  const [form, setForm] = useState<AISettingsType>(settings)

  function handleSave() {
    onChange(form)
    onClose()
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="glass-panel project-dossier" onClick={(e) => e.stopPropagation()}>
        <div className="dossier-header">
          <h2>AI 设置</h2>
          <button className="dossier-close" type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="dossier-grid compact-dossier-grid" style={{ marginTop: '16px' }}>
          <label>
            服务端 Provider
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as AISettingsType['provider'] })}
            >
              <option value="openai-compatible">DeepSeek / OpenAI 兼容</option>
              <option value="anthropic">Anthropic 兼容</option>
            </select>
          </label>

          <label>
            Model
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </label>

          <label>
            Max Tokens
            <input
              type="number"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
            />
          </label>

          <label>
            Temperature
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
            />
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '16px' }}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          启用数字园丁
        </label>

        <p className="modal-hint">密钥由本地开发服务读取，不会保存到浏览器或前端代码。</p>

        <div className="dossier-actions">
          <button className="primary-glass-button" type="button" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
