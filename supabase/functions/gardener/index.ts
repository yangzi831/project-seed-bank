// 园丁 LLM 代理：统一服务端 key，客户端不接触任何密钥
// 环境变量（supabase secrets set 配置）：
//   LLM_KEY      必填，openai-next.com 的 API key
//   LLM_BASE_URL 默认 https://api.openai-next.com
//   LLM_MODEL    默认 claude-opus-4-7
//
// 协议：Anthropic Messages API（POST /v1/messages，x-api-key + anthropic-version）
// 入参：{ intent, messages: {role,content}[], system? }
// 出参：{ text }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ANTHROPIC_VERSION = '2023-06-01'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type GardenerMessage = { role: 'user' | 'assistant'; content: string }

type RequestBody = {
  intent: 'refineSeed' | 'summarizeGrowth' | 'generateHarvest' | 'suggestWake' | 'chat'
  messages: GardenerMessage[]
  system?: string
}

const defaultSystem =
  '你是「数字园丁」，Project Seed Bank 的创意陪伴者。' +
  '你了解用户花园里的每一个项目，帮助整理成长、发现阻碍、给出下一步建议，' +
  '并给出可执行的建议。你尊重用户的创造，只辅助不代替。' +
  '请使用繁体中文回覆，语气温和，像一位懂植物的园丁。'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  // 鉴权：functions 网关 verify_jwt 已校验（客户端带 anon JWT），这里不再重复校验
  const apiKey = Deno.env.get('LLM_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LLM_KEY 未配置' }), { status: 500, headers: corsHeaders })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: corsHeaders })
  }

  const system = body.system ?? defaultSystem
  const baseUrl = (Deno.env.get('LLM_BASE_URL') ?? 'https://api.openai-next.com').replace(/\/+$/, '')
  const model = Deno.env.get('LLM_MODEL') ?? 'claude-opus-4-7'

  const messages: GardenerMessage[] = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) {
    messages.push({ role: 'user', content: '你好，看看我的花园吧。' })
  }

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(
      JSON.stringify({ error: `LLM API 请求失败: ${response.status} ${errorText.slice(0, 500)}` }),
      { status: 502, headers: corsHeaders },
    )
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text ?? ''
  return new Response(JSON.stringify({ text }), { headers: corsHeaders })
})
