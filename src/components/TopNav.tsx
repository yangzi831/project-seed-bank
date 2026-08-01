type TopNavProps = {
  active: string
  onGarden: () => void
  onList: () => void
  onBoard: () => void
  onSettings?: () => void
  sceneReady?: boolean
}

export function TopNav({ active, onGarden, onList, onBoard, onSettings, sceneReady = false }: TopNavProps) {
  return (
    <header className="top-nav">
      <button className="brand-mark" type="button" onClick={onGarden}>
        <span aria-hidden="true">♜</span>
        <span>
          <small>THE SEED VAULT</small>
          <strong>种子地牢</strong>
        </span>
      </button>
      <nav aria-label="Primary">
        <button className={active === 'home' || active === 'zone' ? 'active' : ''} type="button" onClick={onGarden}>
          墓塔
        </button>
        <button className={active === 'list' ? 'active' : ''} type="button" onClick={onList}>
          灵植遗物
        </button>
        <button className={active === 'board' ? 'active' : ''} type="button" onClick={onBoard}>
          命运石板
        </button>
      </nav>
      <div className="nav-utilities">
        <span className={`scene-status ${sceneReady ? 'is-ready' : ''}`}>
          <i /> {sceneReady ? '3D 墓塔已唤醒' : '正在点燃火把'}
        </span>
        {onSettings && (
          <button className="nav-settings" type="button" onClick={onSettings} title="先知设置" aria-label="打开先知设置">
            ⚙
          </button>
        )}
      </div>
    </header>
  )
}
