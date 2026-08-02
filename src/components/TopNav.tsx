export type TopNavProfile = { handle: string; nickname: string | null } | null

type TopNavProps = {
  active: string
  onGarden: () => void
  onList: () => void
  onBoard: () => void
  onSettings?: () => void
  profile?: TopNavProfile
  sessionReady?: boolean
  onClaim?: () => void
}

export function TopNav({ active, onGarden, onList, onBoard, onSettings, profile, sessionReady, onClaim }: TopNavProps) {
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
        {onSettings && (
          <button className="ghost-button" type="button" onClick={onSettings} title="AI 设置">
            ⚙️
          </button>
        )}
      </div>
    </header>
  )
}
