import { useEffect, useState } from 'react'
import { searchProfiles } from '../services/supabase/profiles'
import type { PublicProfile } from '../services/supabase/profiles'

export type TopNavProfile = { handle: string; nickname: string | null } | null

type TopNavProps = {
  active: string
  onGarden: () => void
  onList: () => void
  onBoard: () => void
  profile?: TopNavProfile
  sessionReady?: boolean
  onClaim?: () => void
  onVisit: (handle: string) => void
  unreadCount?: number
  onBell?: () => void
}

export function TopNav({
  active,
  onGarden,
  onList,
  onBoard,
  profile,
  sessionReady,
  onClaim,
  onVisit,
  unreadCount = 0,
  onBell,
}: TopNavProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (!query.trim() || !sessionReady) {
      setResults([])
      setSearchOpen(false)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const rs = await searchProfiles(query)
        if (!cancelled) {
          setResults(rs)
          setSearchOpen(true)
        }
      } catch {
        if (!cancelled) {
          setResults([])
          setSearchOpen(false)
        }
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, sessionReady])

  function selectProfile(p: PublicProfile) {
    setQuery('')
    setResults([])
    setSearchOpen(false)
    onVisit(p.handle)
  }

  return (
    <header className="top-nav">
      <button className="brand-mark" type="button" onClick={onGarden}>
        Project Seed Bank
      </button>
      <nav aria-label="Primary">
        <button className={active === 'home' || active === 'zone' ? 'active' : ''} type="button" onClick={onGarden}>
          Garden
        </button>
        <button className={active === 'list' ? 'active' : ''} type="button" onClick={onList}>
          Plants
        </button>
        <button className={active === 'board' ? 'active' : ''} type="button" onClick={onBoard}>
          Board
        </button>
      </nav>
      <div className="top-nav-actions">
        <div className="top-nav-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
            placeholder="串门：搜用户名"
            aria-label="搜索花园"
          />
          {searchOpen && (
            <ul className="search-results" role="listbox">
              {results.map((p) => (
                <li key={p.user_id}>
                  <button type="button" onClick={() => selectProfile(p)}>
                    <span className="search-name">{p.nickname ?? p.handle}</span>
                    <span className="search-handle">@{p.handle}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="search-empty">没有找到花园</li>}
            </ul>
          )}
        </div>
        {onBell && profile && (
          <button className="ghost-button bell-button" type="button" onClick={onBell} title="留言提醒">
            🔔
            {unreadCount > 0 && <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        )}
        {profile ? (
          <span className="top-nav-profile" title={`@${profile.handle}`}>
            {profile.nickname ?? profile.handle}
          </span>
        ) : (
          sessionReady &&
          onClaim && (
            <button className="ghost-button" type="button" onClick={onClaim}>
              认领用户名
            </button>
          )
        )}
      </div>
    </header>
  )
}
