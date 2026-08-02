import { supabase } from './client'

export type PublicProfile = {
  user_id: string
  handle: string
  nickname: string | null
  created_at: string
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isValidHandle(raw: string): boolean {
  return HANDLE_RE.test(normalizeHandle(raw))
}

export async function claimHandle(userId: string, rawHandle: string, nickname?: string): Promise<PublicProfile> {
  if (!supabase) throw new Error('Supabase 未配置')
  const handle = normalizeHandle(rawHandle)
  if (!isValidHandle(handle)) throw new Error('用户名需为 3–20 位小写字母、数字或下划线')

  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, handle, nickname: nickname?.trim() || null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('这个用户名已被占用')
    throw new Error(error.message)
  }
  return data as PublicProfile
}

export async function getMyProfile(userId: string): Promise<PublicProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select().eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PublicProfile | null) ?? null
}
