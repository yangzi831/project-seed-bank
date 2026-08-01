import { useMemo, useRef, useState } from 'react'
import { loadGardenKeeperPersonality, saveGardenKeeperPersonality } from '../agent/personalities'
import type { GardenKeeperPersonality } from '../agent/personalities'
import { CanvasStage } from '../components/CanvasStage'
import { DraggablePlant } from '../components/DraggablePlant'
import { GardenKeeperPortal } from '../components/GardenKeeperPortal'
import { KeeperAvatar } from '../components/KeeperAvatar'
import { PlantPicker } from '../components/PlantPicker'
import { ProjectCard } from '../components/ProjectCard'
import { getRandomPlantVariant, statusMeta, statusOrder } from '../data/garden'
import type { PlantCategory, ProjectSeed, ProjectStatus, Zone, ZoneKey } from '../data/garden'

const markerPositions: Record<ZoneKey, { left: number; top: number }> = {
  flower: { left: 26, top: 26 },
  water: { left: 74, top: 25 },
  exhibition: { left: 51, top: 56 },
  woodland: { left: 80, top: 68 },
  experiment: { left: 23, top: 68 },
}

const overviewPlantSlots: Record<ZoneKey, Array<{ x: number; y: number }>> = {
  flower: [
    { x: 16, y: 18 },
    { x: 22, y: 23 },
    { x: 34, y: 18 },
    { x: 38, y: 34 },
    { x: 18, y: 39 },
    { x: 31, y: 42 },
  ],
  water: [
    { x: 60, y: 18 },
    { x: 66, y: 36 },
    { x: 82, y: 18 },
    { x: 86, y: 38 },
    { x: 77, y: 43 },
    { x: 61, y: 30 },
  ],
  exhibition: [
    { x: 45, y: 42 },
    { x: 57, y: 45 },
    { x: 44, y: 68 },
    { x: 58, y: 67 },
    { x: 52, y: 73 },
    { x: 50, y: 46 },
  ],
  woodland: [
    { x: 86, y: 56 },
    { x: 90, y: 67 },
    { x: 83, y: 78 },
    { x: 72, y: 78 },
    { x: 88, y: 75 },
    { x: 82, y: 58 },
  ],
  experiment: [
    { x: 16, y: 56 },
    { x: 18, y: 75 },
    { x: 31, y: 78 },
    { x: 36, y: 62 },
    { x: 29, y: 56 },
    { x: 38, y: 74 },
  ],
}

type HomeViewProps = {
  zones: Zone[]
  projects: ProjectSeed[]
  onOpenZone: (zoneId: ZoneKey) => void
  onOpenProject: (projectId: string) => void
  onOpenKeeper: (projectId: string) => void
  onAddProject: (zoneId: ZoneKey, title: string, description: string, plantCategory: PlantCategory, plantVariant?: string) => void
  onUpdateProject: (projectId: string, patch: Partial<ProjectSeed>) => void
  onDeleteProject: (projectId: string) => void
  onRefineSeed?: (idea: string) => void
}

export function HomeView({ zones, projects, onOpenZone, onOpenProject, onOpenKeeper, onAddProject, onUpdateProject, onDeleteProject, onRefineSeed }: HomeViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isKeeperOpen, setIsKeeperOpen] = useState(false)
  const [keeperPersonality, setKeeperPersonality] = useState(() => loadGardenKeeperPersonality())
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneKey>('flower')
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all')
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(() => getRandomPlantVariant('uncategorized'))
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const overviewRef = useRef<HTMLDivElement | null>(null)

  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [projects],
  )
  const recentlyUpdated = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0],
    [projects],
  )
  const summary = {
    total: projects.length,
    growing: projects.filter((project) => project.status === 'growing').length,
    mature: projects.filter((project) => project.status === 'mature').length,
    dormant: projects.filter((project) => project.status === 'dormant').length,
    harvested: projects.filter((project) => project.status === 'harvested').length,
  }
  const visibleProjects = statusFilter === 'all' ? projects : projects.filter((project) => project.status === statusFilter)

  function selectKeeperPersonality(personality: GardenKeeperPersonality) {
    setKeeperPersonality(personality)
    saveGardenKeeperPersonality(personality.id)
  }

  return (
    <main className="page workbench-page home-page">
      <section className="workbench-grid garden-workbench">
        <aside className="workbench-sidebar left-sidebar">
          <div className="glass-panel sidebar-section">
            <p className="eyebrow">Personal project cultivation field</p>
            <h1>Project Seed Bank</h1>
            <p>把灵感种进一座有秩序的创意庄园，观察它们生长、成熟、休眠与收获。</p>
          </div>

          <section className="glass-panel sidebar-section" aria-label="Garden statistics">
            <p className="eyebrow">Garden signal</p>
            <div className="sidebar-stats">
              <Stat label="Total" value={summary.total} />
              <Stat label="Growing" value={summary.growing} />
              <Stat label="Mature" value={summary.mature} />
              <Stat label="Dormant" value={summary.dormant} />
              <Stat label="Harvested" value={summary.harvested} />
            </div>
            <span className="recent-update compact">最近更新：{recentlyUpdated?.title ?? '暂无项目'}</span>
          </section>

          <section className="glass-panel sidebar-section">
            <p className="eyebrow">Recently planted</p>
            <div className="sidebar-seed-list">
              {recentProjects.length ? (
                recentProjects.map((project) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    zoneName={zones.find((zone) => zone.id === project.zoneId)?.displayName}
                  compact
                  onOpen={onOpenProject}
                  onDelete={onDeleteProject}
                />
                ))
              ) : (
                <div className="empty-panel">还没有项目。先种下一株正在生长的植物。</div>
              )}
            </div>
          </section>
        </aside>

        <section className="workbench-canvas" aria-label="Garden Overview">
          <div className="canvas-toolbar glass-panel">
            <div>
              <p className="eyebrow">Garden overview</p>
              <h2>庄园总览</h2>
              <small className="toolbar-hint">选择一个区域，进入你的项目生长场。</small>
            </div>
            <div className="toolbar-filter-group" aria-label="Status filters">
              <button className={statusFilter === 'all' ? 'active' : ''} type="button" onClick={() => setStatusFilter('all')}>
                全部
              </button>
              {statusOrder.map((status) => (
                <button
                  key={status}
                  className={statusFilter === status ? 'active' : ''}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                >
                  {statusMeta[status].label}
                </button>
              ))}
            </div>
            <button className="primary-glass-button toolbar-primary" type="button" onClick={() => setIsModalOpen(true)}>
              种下新项目
            </button>
          </div>
          <div className="overview-frame">
            <CanvasStage ref={overviewRef} src="/images/garden/overview.png" className="overview-map main-map">
              <div className="map-grid" aria-hidden="true" />
              <button className={`garden-keeper-character keeper-${keeperPersonality.style}`} type="button" onClick={() => setIsKeeperOpen(true)} aria-label={`拜访 Garden Keeper ${keeperPersonality.name}`}>
                <span className="keeper-character-aura" aria-hidden="true" />
                <span className="keeper-character-particles" aria-hidden="true"><i /><i /><i /><i /></span>
                <KeeperAvatar personality={keeperPersonality} size="presence" />
                <span className="keeper-character-presence">
                  <small>Garden Keeper</small>
                  <strong>{keeperPersonality.name}</strong>
                  <em>正在庄园里巡视</em>
                </span>
              </button>
              <div className="overview-plants" aria-label="Projects planted in the garden">
                {visibleProjects.map((project) => {
                  const zoneProjects = visibleProjects.filter((item) => item.zoneId === project.zoneId)
                  const projectIndex = zoneProjects.findIndex((item) => item.id === project.id)
                  const slot = project.overviewPositionManual ? project.overviewPosition : getOverviewPlantSlot(project.zoneId, projectIndex)
                  return (
                    <DraggablePlant
                      key={project.id}
                      project={project}
                      mode="overview"
                      position={slot}
                      boundsRef={overviewRef}
                      size="small"
                      showLabelMode="none"
                      onOpen={onOpenProject}
                      onPositionChange={(overviewPosition) => onUpdateProject(project.id, { overviewPosition, overviewPositionManual: true })}
                    />
                  )
                })}
              </div>
              {zones.map((zone) => {
                const marker = markerPositions[zone.id]
                const zoneProjectCount = visibleProjects.filter((project) => project.zoneId === zone.id).length
                return (
                  <button
                    key={zone.id}
                    className={`zone-marker garden-gate-card garden-gate-${zone.id}`}
                    style={{ left: `${marker.left}%`, top: `${marker.top}%` }}
                    type="button"
                    aria-label={`进入 ${zone.defaultName} ${zone.subtitle}`}
                    onClick={() => onOpenZone(zone.id)}
                  >
                    <span className="garden-gate-icon" aria-hidden="true">
                      <GardenGateIcon zoneId={zone.id} />
                    </span>
                    <span className="marker-body">
                      <strong>{zone.defaultName}</strong>
                      <small>{zone.subtitle}</small>
                      <em>{zoneProjectCount} projects</em>
                      <b className="garden-gate-cta">进入 →</b>
                    </span>
                  </button>
                )
              })}
            </CanvasStage>
          </div>
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
            <p className="eyebrow">Plant from overview</p>
            <h2>新增项目</h2>
            <input name="title" placeholder="项目名" autoFocus />
            <textarea name="description" placeholder="一句话描述" />
            <select value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.target.value as ZoneKey)}>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.defaultName} / {zone.subtitle}
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
      {isKeeperOpen && (
        <GardenKeeperPortal
          projects={projects}
          personality={keeperPersonality}
          onPersonalityChange={selectKeeperPersonality}
          onOpenProject={onOpenProject}
          onStartConversation={(projectId) => { setIsKeeperOpen(false); onOpenKeeper(projectId) }}
          onClose={() => setIsKeeperOpen(false)}
        />
      )}
    </main>
  )
}

function getOverviewPlantSlot(zoneId: ZoneKey, index: number) {
  const slots = overviewPlantSlots[zoneId]
  const slot = slots[index % slots.length]
  const loop = Math.floor(index / slots.length)
  return {
    x: Math.min(94, Math.max(6, slot.x + ((loop % 3) - 1) * 2.2)),
    y: Math.min(92, Math.max(8, slot.y + (loop % 2 === 0 ? 0 : 2.4))),
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="stat-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function GardenGateIcon({ zoneId }: { zoneId: ZoneKey }) {
  switch (zoneId) {
    case 'flower':
      return (
        <svg viewBox="0 0 32 32" role="img">
          <path d="M16 27V13" />
          <path d="M16 15c-4.5-1-7.6-4.2-8.5-8.5 4.4.2 7.7 2.7 8.5 8.5Z" />
          <path d="M16 17c4.9-.8 8-3.4 9.2-8.2-4.8.1-8.4 2.8-9.2 8.2Z" />
          <path d="M12 27h8" />
        </svg>
      )
    case 'water':
      return (
        <svg viewBox="0 0 32 32" role="img">
          <path d="M16 4c4.8 5.8 8 10 8 14a8 8 0 0 1-16 0c0-4 3.2-8.2 8-14Z" />
          <path d="M10 24c2.2 1.8 9.8 1.8 12 0" />
        </svg>
      )
    case 'exhibition':
      return (
        <svg viewBox="0 0 32 32" role="img">
          <circle cx="16" cy="16" r="8" />
          <circle cx="16" cy="16" r="3" />
          <path d="M16 3v5M16 24v5M3 16h5M24 16h5" />
          <path d="m7 7 3.5 3.5M21.5 21.5 25 25M25 7l-3.5 3.5M10.5 21.5 7 25" />
        </svg>
      )
    case 'woodland':
      return (
        <svg viewBox="0 0 32 32" role="img">
          <path d="M16 27V12" />
          <path d="M10 25h12" />
          <path d="M16 5c-4.2 0-7.5 3.2-7.5 7.2 0 3.8 3 6.7 7.5 6.7s7.5-2.9 7.5-6.7C23.5 8.2 20.2 5 16 5Z" />
          <path d="M12.5 16c2 1.1 5 1.1 7 0" />
        </svg>
      )
    case 'experiment':
      return (
        <svg viewBox="0 0 32 32" role="img">
          <path d="M16 27V15" />
          <circle cx="16" cy="12" r="3.8" />
          <circle cx="9" cy="15.5" r="3.2" />
          <circle cx="23" cy="15.5" r="3.2" />
          <path d="M7 27h18" />
          <path d="M24.5 5.5v4M22.5 7.5h4M7.5 6.5v3M6 8h3" />
        </svg>
      )
  }
}
