import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase/client'

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

// 匿名登录：未配置 Supabase 时返回 unavailable，应用退回纯本地模式
export function useSupabaseSession() {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<SessionStatus>('idle')

  useEffect(() => {
    if (!supabase) {
      setStatus('unavailable')
      return
    }
    const client = supabase

    let cancelled = false
    setStatus('loading')

    async function ensureSession() {
      const { data, error } = await client.auth.getSession()
      if (cancelled) return

      if (error || !data.session?.user) {
        const { data: anonData, error: anonError } = await client.auth.signInAnonymously()
        if (cancelled) return
        if (anonError) {
          setStatus('unavailable')
          return
        }
        setUser(anonData.user)
        setStatus('ready')
        return
      }

      setUser(data.session.user)
      setStatus('ready')
    }

    void ensureSession()

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setStatus(session?.user ? 'ready' : 'idle')
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { user, status }
}
