// AI 连通性冒烟：验证 .env.local 配置的 OpenAI 兼容上游 + 模型可用、返回 JSON。
// 用法：node scripts/ai-smoke-test.mjs （在项目根目录运行）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raw = readFileSync(resolve('.env.local'), 'utf8')
const env = {}
for (const line of raw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx < 0) continue
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
}

const baseUrl = (env.GARDEN_AI_BASE_URL || env.OPENAI_BASE_URL || '').replace(/\/+$/, '')
const model = env.GARDEN_AI_MODEL || env.OPENAI_MODEL || 'gpt-5.5'
const apiKey = env.GARDEN_AI_API_KEY || env.OPENAI_API_KEY

if (!baseUrl || !apiKey) {
  console.error('SMOKE FAIL: 缺少 GARDEN_AI_BASE_URL / GARDEN_AI_API_KEY（.env.local）')
  process.exit(1)
}

const url = `${baseUrl}/chat/completions`
const started = Date.now()
let res
try {
  res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 120,
      temperature: 0.2,
      messages: [
        { role: 'system', content: '只返回 JSON，不要输出其他文字。' },
        { role: 'user', content: '{"test":"ok"}' },
      ],
    }),
  })
} catch (error) {
  console.error('SMOKE FAIL: 网络错误', error.message)
  process.exit(1)
}

console.log(`upstream: ${url}`)
console.log(`model: ${model}`)
console.log(`HTTP ${res.status} in ${Date.now() - started}ms`)

if (!res.ok) {
  const text = await res.text()
  console.error('SMOKE FAIL:', text.slice(0, 400))
  process.exit(1)
}

const data = await res.json()
const content = data.choices?.[0]?.message?.content ?? ''
console.log('reply:', content.slice(0, 200))
const ok = content.includes('test') || content.includes('ok')
console.log(ok ? 'SMOKE PASS: API 连通且返回 JSON' : 'SMOKE WARN: API 连通但内容与预期不符')
process.exit(ok ? 0 : 2)
