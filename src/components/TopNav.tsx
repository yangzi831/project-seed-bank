import type { ThemeMode } from '../core/theme'

type TopNavProps = {
  active: string
  onGarden: () => void
  onList: () => void
  onBoard: () => void
  onWorld?: () => void
  onSettings?: () => void
  sceneReady?: boolean
  themeMode?: ThemeMode
  onToggleTheme?: () => void
}

export function TopNav({ active, onGarden, onList, onBoard, onWorld, onSettings, sceneReady = false, themeMode, onToggleTheme }: TopNavProps) {
  return (
    <header className="top-nav">
      <button className="brand-mark" type="button" onClick={onGarden}>
        <span aria-hidden="true">{themeMode === 'garden' ? '🌱' : '♜'}</span>
        <span>
          <small>{themeMode === 'garden' ? 'PROJECT SEED BANK' : 'THE SEED VAULT'}</small>
          <strong>{themeMode === 'garden' ? '种子银行' : '种子地牢'}</strong>
        </span>
      </button>
      <nav aria-label="Primary">
        <button className={active === 'home' || active === 'zone' ? 'active' : ''} type="button" onClick={onGarden}>
          {themeMode === 'garden' ? '庄园' : '墓塔'}
        </button>
        <button className={active === 'list' ? 'active' : ''} type="button" onClick={onList}>
          灵植遗物
        </button>
        <button className={active === 'board' ? 'active' : ''} type="button" onClick={onBoard}>
          {themeMode === 'garden' ? '生长看板' : '命运石板'}
        </button>
        {onWorld && (
          <button className={active === 'world' ? 'active' : ''} type="button" onClick={onWorld}>
            种子世界
          </button>
        )}
      </nav>
      <div className="nav-utilities">
        {onToggleTheme && (
          <button
            className="nav-theme-toggle"
            type="button"
            onClick={onToggleTheme}
            title={themeMode === 'garden' ? '切换至地牢主题' : '切换至花园主题'}
            aria-label={themeMode === 'garden' ? '切换至地牢主题' : '切换至花园主题'}
          >
            {themeMode === 'garden' ? '🏰' : '🌿'}
          </button>
        )}
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
