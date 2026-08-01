import { useMemo, useState } from 'react'
import { PlantPicker } from '../components/PlantPicker'
import { ProjectCard } from '../components/ProjectCard'
import { getRandomPlantVariant } from '../data/garden'
import type { PlantCategory, ProjectSeed, Zone, ZoneKey } from '../data/garden'

const floorLore: Record<ZoneKey, { floor: string; icon: string; name: string }> = {
  flower: { floor: 'I', icon: '🔥', name: '灰烬门厅' },
  water: { floor: 'II', icon: '🜄', name: '溺影回廊' },
  exhibition: { floor: 'III', icon: '🗿', name: '献祭展室' },
  woodland: { floor: 'IV', icon: '🌑', name: '枯王林墓' },
  experiment: { floor: 'V', icon: '⚗️', name: '炼金禁层' },
}

type HomeViewProps = {
  zones: Zone[]
  projects: ProjectSeed[]
  onOpenZone: (zoneId: ZoneKey) => void
  onOpenProject: (projectId: string) => void
  onAddProject: (zoneId: ZoneKey, title: string, description: string, plantCategory: PlantCategory, plantVariant?: string) => void
  onDeleteProject: (projectId: string) => void
  onRefineSeed?: (idea: string) => void
}

export function HomeView({ zones, projects, onOpenZone, onOpenProject, onAddProject, onDeleteProject, onRefineSeed }: HomeViewProps) {
  const [isVaultOpen, setIsVaultOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneKey>('flower')
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all')
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(() => getRandomPlantVariant('uncategorized'))
  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4),
    [projects],
  )

  return (
    <main className="page dungeon-page dungeon-home-page">
      <button className={`vault-toggle ${isVaultOpen ? 'is-open' : ''}`} type="button" onClick={() => setIsVaultOpen((value) => !value)}>
        <span>🗝️</span>
        <span>
          <small>SEED VAULT</small>
          <strong>{isVaultOpen ? '收起火种档案' : '查看火种档案'}</strong>
        </span>
      </button>

      <aside className={`seed-vault-drawer dungeon-dialog ${isVaultOpen ? 'is-open' : ''}`} aria-hidden={!isVaultOpen}>
        <header className="vault-drawer-header">
          <div>
            <p className="dungeon-kicker">BURIED PROJECT RELICS</p>
            <h2>六层墓塔索引</h2>
          </div>
          <button type="button" className="bronze-icon-button" onClick={() => setIsVaultOpen(false)} aria-label="关闭火种档案">
            ×
          </button>
        </header>

        <div className="floor-index-list">
          {zones.map((zone) => {
            const lore = floorLore[zone.id]
            const count = projects.filter((project) => project.zoneId === zone.id).length
            return (
              <button key={zone.id} type="button" className={`floor-index floor-${zone.id}`} onClick={() => onOpenZone(zone.id)}>
                <b>{lore.floor}</b>
                <span>{lore.icon}</span>
                <span>
                  <strong>{lore.name}</strong>
                  <small>{zone.subtitle} · 封存 {count} 枚火种</small>
                </span>
                <em>进入 →</em>
              </button>
            )
          })}
        </div>

        <div className="dungeon-rule" />
        <section className="recent-relics">
          <div className="vault-section-title">
            <div>
              <small>RECENTLY AWAKENED</small>
              <strong>最近苏醒的灵植</strong>
            </div>
            <button className="gold-pill compact" type="button" onClick={() => setIsModalOpen(true)}>
              ＋ 封存新火种
            </button>
          </div>
          <div className="recent-relic-grid">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                zoneName={floorLore[project.zoneId].name}
                compact
                onOpen={onOpenProject}
                onDelete={onDeleteProject}
              />
            ))}
          </div>
        </section>
      </aside>

      {isModalOpen && (
        <div className="modal-scrim" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <form
            className="dungeon-dialog seed-modal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              const data = new FormData(form)
              const title = data.get('title')?.toString().trim() ?? ''
              const description = data.get('description')?.toString().trim() ?? ''
              if (!title) return
              onAddProject(selectedZoneId, title, description, selectedCategory === 'all' ? 'uncategorized' : selectedCategory, selectedVariant)
              form.reset()
              setIsModalOpen(false)
            }}
          >
            <p className="dungeon-kicker">ENTOMB A NEW SEED</p>
            <h2>封存新的项目火种</h2>
            <p>守墓石板会记住它的名字、愿望与灵植形态。</p>
            <input name="title" placeholder="火种名 / 项目名" autoFocus />
            <textarea name="description" placeholder="向守墓人描述它想完成的事" />
            <select value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.target.value as ZoneKey)}>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  第 {floorLore[zone.id].floor} 层 · {floorLore[zone.id].name}
                </option>
              ))}
            </select>
            <PlantPicker
              category={selectedCategory}
              selectedVariant={selectedVariant}
              onCategoryChange={(category) => {
                setSelectedCategory(category)
                setSelectedVariant(category === 'all' ? getRandomPlantVariant('uncategorized') : getRandomPlantVariant(category))
              }}
              onSelectVariant={setSelectedVariant}
            />
            <div className="action-row">
              <button className="gold-pill" type="submit">
                🔥 点燃火种
              </button>
              {onRefineSeed && (
                <button
                  type="button"
                  className="bronze-button"
                  onClick={(event) => {
                    const form = event.currentTarget.form
                    const title = form?.querySelector<HTMLInputElement>('input[name="title"]')?.value ?? ''
                    const description = form?.querySelector<HTMLTextAreaElement>('textarea[name="description"]')?.value ?? ''
                    onRefineSeed(`${title} ${description}`.trim())
                  }}
                >
                  🔮 请先知精炼
                </button>
              )}
              <button type="button" className="ghost-button" onClick={() => setIsModalOpen(false)}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
