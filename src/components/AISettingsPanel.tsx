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
            Provider
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value as AISettingsType['provider'] })}
            >
              <option value="anthropic">Anthropic / 兼容</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
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
            Base URL
            <input
              type="text"
              value={form.baseUrl ?? ''}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            />
          </label>

          <label>
            API Key
            <input
              type="password"
              value={form.apiKey ?? ''}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="输入 API Key"
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

        <div className="dossier-actions">
          <button className="primary-glass-button" type="button" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
