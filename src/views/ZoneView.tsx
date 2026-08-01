import { useMemo, useRef, useState } from 'react'
import { CanvasStage } from '../components/CanvasStage'
import { DraggablePlant } from '../components/DraggablePlant'
import { PlantPicker } from '../components/PlantPicker'
import { getRandomPlantVariant, getZoneCounts, plantCategoryMeta, statusMeta } from '../data/garden'
import type { OutcomeType, PlantCategory, ProjectSeed, Zone, ZoneKey } from '../data/garden'

type ZoneViewProps = {
  zone: Zone
  zones: Zone[]
  projects: ProjectSeed[]
  onBack: () => void
  onUpdateZone: (zoneId: ZoneKey, patch: Partial<Pick<Zone, 'displayName' | 'description'>>) => void
  onAddProject: (zoneId: ZoneKey, title: string, description: string, plantCategory: PlantCategory, plantVariant?: string) => void
  onUpdateProject: (projectId: string, patch: Partial<ProjectSeed>) => void
  onAddLog: (projectId: string, text: string) => void
  onAddOutcome: (projectId: string, title: string, type: OutcomeType, value: string) => void
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
  onUpdateProject,
  onOpenProject,
  onOpenZone,
  onDeleteProject,
  onRefineSeed,
}: ZoneViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneKey>(zone.id)
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all')
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(() => getRandomPlantVariant('uncategorized'))
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const counts = getZoneCounts(projects, zone.id)
  const recentProjects = useMemo(() => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5), [projects])

  return (
    <main className="page workbench-page zone-page">
      <section className="workbench-grid zone-workbench">
        <aside className="workbench-sidebar left-sidebar">
          <div className="glass-panel sidebar-section zone-identity">
            <p className="eyebrow">{zone.subtitle}</p>
            <input
              className="zone-heading-title"
              value={zone.displayName}
              onChange={(event) => onUpdateZone(zone.id, { displayName: event.target.value })}
              aria-label="Zone name"
            />
            <textarea
              value={zone.description}
              onChange={(event) => onUpdateZone(zone.id, { description: event.target.value })}
              aria-label="Zone description"
            />
          </div>

          <section className="glass-panel sidebar-section">
            <p className="eyebrow">Zone statistics</p>
            <div className="sidebar-stats">
              <Stat label="Total" value={counts.total} />
              <Stat label="生长中" value={counts.growing} />
              <Stat label="长成" value={counts.mature} />
              <Stat label="休眠" value={counts.dormant} />
              <Stat label="已收获" value={counts.harvested} />
            </div>
          </section>

          <section className="glass-panel sidebar-section">
            <p className="eyebrow">Recent in this garden</p>
            <div className="zone-project-list compact-list soft-list">
              {recentProjects.length ? recentProjects.map((project) => (
                <button key={project.id} type="button" className="zone-project-row" onClick={() => onOpenProject(project.id)}>
                  <span>
                    <strong>{project.title}</strong>
                    <small>{plantCategoryMeta[project.plantCategory].label}</small>
                  </span>
                  <span className={`status-pill ${statusMeta[project.status].tone}`}>{statusMeta[project.status].label}</span>
                </button>
              )) : (
                <p>这里还没有项目。</p>
              )}
            </div>
          </section>
        </aside>

        <section className="workbench-canvas zone-canvas-shell">
          <div className="canvas-toolbar glass-panel">
            <div className="toolbar-left-group">
              <button type="button" className="ghost-button small" onClick={onBack}>
                返回庄园
              </button>
              <div className="garden-switcher toolbar-switcher" aria-label="Garden switcher">
                {zones.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === zone.id ? 'active' : ''}
                    type="button"
                    onClick={() => onOpenZone(item.id)}
                  >
                    <strong>{item.defaultName}</strong>
                    <small>{item.subtitle}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="toolbar-zone-summary">
              <strong>{zone.defaultName}</strong>
              <small>{zone.subtitle} · {counts.total} projects · 生长中 {counts.growing} · 长成 {counts.mature}</small>
            </div>
            <button
              type="button"
              className="primary-glass-button toolbar-primary"
              onClick={() => {
                setSelectedZoneId(zone.id)
                setIsModalOpen(true)
              }}
            >
              新增项目
            </button>
          </div>
          <CanvasStage ref={canvasRef} src={zone.image} className="zone-canvas main-map">
            <div className="canvas-grid" aria-hidden="true" />
            {projects.map((project) => (
              <DraggablePlant
                key={project.id}
                project={project}
                mode="zone"
                position={project.position}
                boundsRef={canvasRef}
                clampX={[4, 96]}
                clampY={[6, 94]}
                label={project.title}
                meta={statusMeta[project.status].label}
                detailRows={[plantCategoryMeta[project.plantCategory].label, new Date(project.updatedAt).toLocaleDateString()]}
                showLabelMode="always"
                onOpen={onOpenProject}
                onDelete={onDeleteProject}
                onPositionChange={(position) => onUpdateProject(project.id, { position })}
              />
            ))}
          </CanvasStage>
        </section>
      </section>

      {isModalOpen && (
        <div className="modal-scrim" role="presentation" onMouseDown={() => setIsModalOpen(false)}>
          <form
            className="glass-panel seed-modal"
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
            <p className="eyebrow">Plant a growing project</p>
            <h2>新增项目</h2>
            <input name="title" placeholder="项目名" autoFocus />
            <textarea name="description" placeholder="一句话描述" />
            <select value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.target.value as ZoneKey)}>
              {zones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.defaultName} / {item.subtitle}
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
              <button type="submit">种下项目</button>
              {onRefineSeed && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    const form = document.querySelector('.seed-modal') as HTMLFormElement | null
                    const title = form?.querySelector<HTMLInputElement>('input[name="title"]')?.value ?? ''
                    const description = form?.querySelector<HTMLTextAreaElement>('textarea[name="description"]')?.value ?? ''
                    onRefineSeed(`${title} ${description}`.trim())
                  }}
                >
                  和园丁聊聊
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="stat-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}
