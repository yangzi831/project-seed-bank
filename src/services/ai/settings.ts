export type AIProvider = 'openai-compatible' | 'anthropic'

export type AISettings = {
  provider: AIProvider
  model: string
  enabled: boolean
  maxTokens: number
  temperature: number
}

export const defaultAISettings: AISettings = {
  provider: 'openai-compatible',
  model: 'deepseek-chat',
  enabled: true,
  maxTokens: 2048,
  temperature: 0.7,
}

const settingsKey = 'project-seed-bank:ai-settings'

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(settingsKey)
    if (!raw) {
      return defaultAISettings
    }
    const parsed = JSON.parse(raw) as Partial<AISettings>
    const safeSettings: AISettings = {
      ...defaultAISettings,
      provider: parsed.provider === 'anthropic' ? 'anthropic' : 'openai-compatible',
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : defaultAISettings.model,
      enabled: parsed.enabled !== false,
      maxTokens: Number.isFinite(parsed.maxTokens) ? Math.max(256, Math.min(8192, Number(parsed.maxTokens))) : defaultAISettings.maxTokens,
      temperature: Number.isFinite(parsed.temperature) ? Math.max(0, Math.min(2, Number(parsed.temperature))) : defaultAISettings.temperature,
    }
    localStorage.setItem(settingsKey, JSON.stringify(safeSettings))
    return safeSettings
  } catch {
    return defaultAISettings
  }
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem(settingsKey, JSON.stringify({
    provider: settings.provider,
    model: settings.model,
    enabled: settings.enabled,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
  }))
}
