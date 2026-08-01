import { useMemo, useState } from 'react'
import { PlantPicker } from '../components/PlantPicker'
import { ProjectCard } from '../components/ProjectCard'
import { getRandomPlantVariant, getZoneCounts } from '../data/garden'
import type { PlantCategory, ProjectSeed, Zone, ZoneKey } from '../data/garden'

const zoneLore: Record<ZoneKey, { numeral: string; icon: string; title: string; warning: string }> = {
  flower: { numeral: 'I', icon: '🔥', title: '灰烬门厅', warning: '火种在这里学习第一次呼吸。' },
  water: { numeral: 'II', icon: '🜄', title: '溺影回廊', warning: '水面会复述所有迟疑的声音。' },
  exhibition: { numeral: 'III', icon: '🗿', title: '献祭展室', warning: '只有完成之物才敢直视石像。' },
  woodland: { numeral: 'IV', icon: '🌑', title: '枯王林墓', warning: '根系穿过棺木，把碎片编成系统。' },
  experiment: { numeral: 'V', icon: '⚗️', title: '炼金禁层', warning: '失败在这里不是罪名，而是配方。' },
}

type ZoneViewProps = {
  zone: Zone
  zones: Zone[]
  projects: ProjectSeed[]
  onBack: () => void
  onUpdateZone: (zoneId: ZoneKey, patch: Partial<Pick<Zone, 'displayName' | 'description'>>) => void
  onAddProject: (zoneId: ZoneKey, title: string, description: string, plantCategory: PlantCategory, plantVariant?: string) => void
  onOpenProject: (projectId: string) => void
  onOpenZone: (zoneId: ZoneKey) => void
  onDeleteProject: (projectId: string) => void
  onRefineSeed?: (idea: string) => void
}

export function ZoneView({
  zone,
  zones,
  projects,
  onBack,
  onUpdateZone,
  onAddProject,
  onOpenProject,
  onOpenZone,
  onDeleteProject,
  onRefineSeed,
}: ZoneViewProps) {
  const lore = zoneLore[zone.id]
  const counts = getZoneCounts(projects, zone.id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all')
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(() => getRandomPlantVariant('uncategorized'))
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects],
  )

  return (
    <main className="page dungeon-page zone-dungeon-page">
      <section className="dungeon-dialog zone-dossier-panel">
        <header className="zone-dossier-header">
          <button className="bronze-icon-button" type="button" onClick={onBack} aria-label="返回墓塔">
            ←
          </button>
          <span className="zone-lore-icon" aria-hidden="true">
            {lore.icon}
          </span>
          <div>
            <p className="dungeon-kicker">FLOOR {lore.numeral} · PROJECT CHAMBER</p>
            <h1>{lore.title}</h1>
            <p>{lore.warning}</p>
          </div>
        </header>

        <div className="zone-stats-grid">
          <Stat label="封存火种" value={counts.total} />
          <Stat label="仍在生长" value={counts.growing} />
          <Stat label="已经长成" value={counts.mature} />
          <Stat label="逃出循环" value={counts.harvested} success />
        </div>

        <div className="dungeon-rule" />
        <label className="engraved-field">
          <span>墓室铭牌</span>
          <input value={zone.displayName} onChange={(event) => onUpdateZone(zone.id, { displayName: event.target.value })} />
        </label>
        <label className="engraved-field">
          <span>守墓人批注</span>
          <textarea value={zone.description} onChange={(event) => onUpdateZone(zone.id, { description: event.target.value })} />
        </label>

        <div className="zone-project-heading">
          <div>
            <small>SOUL RELICS ON THIS FLOOR</small>
            <strong>本层灵植火种</strong>
          </div>
          <button className="gold-pill compact" type="button" onClick={() => setIsModalOpen(true)}>
            ＋ 新火种
          </button>
        </div>

        <div className="zone-project-scroll">
          {sortedProjects.length ? (
            sortedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} zoneName={lore.title} compact onOpen={onOpenProject} onDelete={onDeleteProject} />
            ))
          ) : (
            <div className="dungeon-empty-state">
              <span>🕯️</span>
              <strong>这间墓室还没有火种</strong>
              <p>点亮第一株灵植，让它在 3D 石阶上留下光。</p>
            </div>
          )}
        </div>
      </section>

      <nav className="floor-rail" aria-label="切换墓塔楼层">
        {zones.map((item) => {
          const itemLore = zoneLore[item.id]
          return (
            <button key={item.id} type="button" className={item.id === zone.id ? 'active' : ''} onClick={() => onOpenZone(item.id)}>
              <b>{itemLore.numeral}</b>
              <span>{itemLore.icon}</span>
              <small>{itemLore.title}</small>
            </button>
          )
        })}
      </nav>

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
              onAddProject(zone.id, title, description, selectedCategory === 'all' ? 'uncategorized' : selectedCategory, selectedVariant)
              form.reset()
              setIsModalOpen(false)
            }}
          >
            <p className="dungeon-kicker">AWAKEN A RELIC ON FLOOR {lore.numeral}</p>
            <h2>在{lore.title}点燃火种</h2>
            <input name="title" placeholder="项目火种名" autoFocus />
            <textarea name="description" placeholder="它为何值得从古墓里醒来？" />
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
                🔥 点燃
              </button>
              {onRefineSeed && (
                <button
                  className="bronze-button"
                  type="button"
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
              <button className="ghost-button" type="button" onClick={() => setIsModalOpen(false)}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

function Stat({ label, value, success = false }: { label: string; value: number; success?: boolean }) {
  return (
    <span className={success ? 'is-success' : ''}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}
