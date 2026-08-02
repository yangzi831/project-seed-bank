import { useState } from 'react'
import type { PublicProfile } from '../services/supabase/profiles'
import { claimHandle, isValidHandle, normalizeHandle } from '../services/supabase/profiles'

type ClaimHandleModalProps = {
  userId: string
  onClaimed: (profile: PublicProfile) => void
  onClose: () => void
}

export function ClaimHandleModal({ userId, onClaimed, onClose }: ClaimHandleModalProps) {
  const [handle, setHandle] = useState('')
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalized = normalizeHandle(handle)
  const valid = isValidHandle(normalized)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const profile = await claimHandle(userId, normalized, nickname)
      onClaimed(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : '认领失败，请重试')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="glass-panel project-dossier" onClick={(e) => e.stopPropagation()}>
        <div className="dossier-header">
          <h2>认领你的花园</h2>
          <button className="dossier-close" type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <p className="claim-intro">
          认领一个用户名，你的花园就有了公开地址 <code>/u/你的用户名</code>，
          朋友可以来串门、看你的灵感档案并留言。
        </p>

        <form className="dossier-grid compact-dossier-grid" style={{ marginTop: '16px' }} onSubmit={handleSubmit}>
          <label>
            用户名（handle）
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="如 yangzi，3–20 位小写字母/数字/下划线"
              autoFocus
            />
            {handle && !valid && <span className="field-hint error">仅限小写字母、数字、下划线，3–20 位</span>}
          </label>

          <label>
            昵称（可选，展示用）
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="中文昵称" />
          </label>

          {error && <p className="claim-error">{error}</p>}

          <div className="dossier-actions">
            <button className="primary-glass-button" type="submit" disabled={submitting || !valid}>
              {submitting ? '认领中…' : '认领'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
