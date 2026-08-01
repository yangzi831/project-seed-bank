type TopNavProps = {
  active: string
  onGarden: () => void
  onList: () => void
  onBoard: () => void
  onSettings?: () => void
}

export function TopNav({ active, onGarden, onList, onBoard, onSettings }: TopNavProps) {
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
      {onSettings && (
        <button className="ghost-button" type="button" onClick={onSettings} title="AI 设置">
          ⚙️
        </button>
      )}
    </header>
  )
}
