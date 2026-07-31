export type AIProvider = 'anthropic' | 'openai' | 'openrouter'

export type AISettings = {
  provider: AIProvider
  model: string
  apiKey: string | null
  baseUrl: string | null
  enabled: boolean
  maxTokens: number
  temperature: number
}

export const defaultAISettings: AISettings = {
  provider: 'anthropic',
  model: 'step-3.7-flash',
  apiKey: null,
  baseUrl: 'https://api.stepfun.com',
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
    return {
      ...defaultAISettings,
      ...parsed,
    }
  } catch {
    return defaultAISettings
  }
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem(settingsKey, JSON.stringify(settings))
}
