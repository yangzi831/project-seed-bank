import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

type JsonObject = Record<string, unknown>

export function gardenAiProxy(): Plugin {
  let env: Record<string, string> = {}

  return {
    name: 'garden-ai-proxy',
    config(_, { mode }) {
      env = loadEnv(mode, process.cwd(), '')
      return {}
    },
    configureServer(server) {
      server.middlewares.use('/api/ai', (req, res) => routeRequest(req, res))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ai', (req, res) => routeRequest(req, res))
    },
  }

  async function routeRequest(req: IncomingMessage, res: ServerResponse) {
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed')
      const apiKey = env.GARDEN_AI_API_KEY || env.OPENAI_API_KEY
      if (!apiKey) throw new HttpError(503, 'ai_not_configured')

      const payload = (await readJsonBody(req)) as GardenAIRequest
      if (!payload.intent || !Array.isArray(payload.messages)) throw new HttpError(400, 'invalid_request')
      const baseUrl = (env.GARDEN_AI_BASE_URL || env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '')
      const model = env.GARDEN_AI_MODEL || env.OPENAI_MODEL || payload.settings?.model || 'deepseek-chat'
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: payload.settings?.maxTokens ?? 2048,
          temperature: payload.settings?.temperature ?? 0.7,
          messages: [
            { role: 'system', content: payload.system ?? '你是 Project Seed Bank 的数字园丁。只返回 JSON。' },
            { role: 'user', content: payload.prompt ?? '' },
            ...payload.messages.filter((message) => message.role !== 'system'),
          ],
        }),
      })
      if (!response.ok) throw new Error(`upstream_${response.status}`)
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const content = data.choices?.[0]?.message?.content ?? ''
      sendJson(res, 200, { ok: true, data: parseJsonObject(content) })
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { ok: false, error: error.code })
      } else {
        sendJson(res, 502, { ok: false, error: 'upstream_error' })
      }
    }
  }
}

type GardenAIRequest = {
  intent?: string
  system?: string
  prompt?: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  settings?: { model?: string; maxTokens?: number; temperature?: number }
}

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function parseJsonObject(content: string): JsonObject {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('invalid_json')
  const parsed = JSON.parse(trimmed.slice(start, end + 1))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_json')
  return parsed as JsonObject
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}
