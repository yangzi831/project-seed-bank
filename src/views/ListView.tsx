import { useMemo, useState } from 'react'
import { ProjectCard } from '../components/ProjectCard'
import { plantCategories, plantCategoryMeta, statusMeta, statusOrder } from '../data/garden'
import type { PlantCategory, ProjectSeed, Zone } from '../data/garden'
import { plantLibrary } from '../data/plantLibrary'
import type { PlantLibraryItem } from '../data/plantLibrary'
import { publicPath } from '../utils/publicPath'

const featuredPlantOrder = new Map([
  ['plant-19', 6],
  ['plant-20', 7],
  ['plant-21', 8],
])

const statusLore = {
  growing: { numeral: 'I', icon: '🔥', name: '火种初醒' },
  mature: { numeral: 'II', icon: '☀️', name: '灵植长成' },
  dormant: { numeral: 'III', icon: '🌑', name: '沉眠封印' },
  harvested: { numeral: 'IV', icon: '🕊️', name: '逃出生天' },
} as const

type ListViewProps = {
  zones: Zone[]
  projects: ProjectSeed[]
  boardMode?: boolean
  onOpenProject: (projectId: string) => void
  onDeleteProject: (projectId: string) => void
  onGenerateMockProjects: () => void
}

export function ListView({ zones, projects, boardMode = false, onOpenProject, onDeleteProject, onGenerateMockProjects }: ListViewProps) {
  const [zoneFilter, setZoneFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<PlantCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selectedPlant, setSelectedPlant] = useState<PlantLibraryItem | null>(null)

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const matchesZone = zoneFilter === 'all' || project.zoneId === zoneFilter
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || project.plantCategory === categoryFilter
      const matchesQuery = project.title.toLowerCase().includes(query.toLowerCase())
      return matchesZone && matchesStatus && matchesCategory && matchesQuery
    })
  }, [categoryFilter, projects, query, statusFilter, zoneFilter])

  const filteredPlants = useMemo(() => {
    const lowered = query.toLowerCase()
    return plantLibrary
      .filter((plant) => {
        const matchesCategory = categoryFilter === 'all' || plant.category === categoryFilter
        const matchesQuery =
          plant.id.toLowerCase().includes(lowered) || plant.englishName.toLowerCase().includes(lowered) || plant.chineseName.includes(query.trim())
        return matchesCategory && matchesQuery
      })
      .sort(comparePlantsForCatalog)
  }, [categoryFilter, query])

  if (!boardMode) {
    return (
      <main className="page dungeon-page archive-page">
        <section className="dungeon-dialog archive-shell">
          <aside className="archive-filter-panel">
            <p className="dungeon-kicker">THE BOTANICAL RELIQUARY</p>
            <h1>灵植遗物图鉴</h1>
            <p>二十四种被守墓人封入晶砂的植物灵魂。它们会在 3D 墓塔里化作旋转粒子，替项目火种照路。</p>
            <div className="dungeon-rule" />
            <label>
              <span>检索铭文</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="植物名 / 编号" />
            </label>
            <label>
              <span>灵植谱系</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as PlantCategory | 'all')}>
                <option value="all">全部谱系</option>
                {plantCategories.map((category) => (
                  <option key={category} value={category}>
                    {plantCategoryMeta[category].label}
                  </option>
                ))}
              </select>
            </label>
            <strong className="archive-count">{String(filteredPlants.length).padStart(2, '0')} / {plantLibrary.length}</strong>
            <small>固定图鉴不会因项目状态而减少。</small>
          </aside>

          <section className="reliquary-grid" aria-label="24 株固定灵植图鉴">
            {filteredPlants.map((plant, index) => (
              <button key={plant.id} className="reliquary-card" type="button" onClick={() => setSelectedPlant(plant)}>
                <span className="reliquary-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="reliquary-image">
                  <img src={publicPath(plant.mature)} alt="" draggable={false} />
                  <img className="reliquary-seedling" src={publicPath(plant.growing)} alt="" draggable={false} />
                </span>
                <span>
                  <strong>{plant.chineseName}</strong>
                  <small>{plant.englishName}</small>
                  <em>{plant.id} · {plantCategoryMeta[plant.category].label}</em>
                </span>
              </button>
            ))}
          </section>
        </section>

        {selectedPlant && (
          <div className="modal-scrim" role="presentation" onMouseDown={() => setSelectedPlant(null)}>
            <section className="plant-library-modal dungeon-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
              <header className="dossier-header">
                <div>
                  <p className="dungeon-kicker">{selectedPlant.id} · {plantCategoryMeta[selectedPlant.category].label}</p>
                  <h2>{selectedPlant.chineseName}</h2>
                  <p>{selectedPlant.englishName}</p>
                </div>
                <button className="bronze-icon-button" type="button" onClick={() => setSelectedPlant(null)} aria-label="关闭图鉴">
                  ×
                </button>
              </header>
              <div className="plant-state-compare">
                <figure>
                  <img src={publicPath(selectedPlant.growing)} alt={`${selectedPlant.chineseName} growing`} draggable={false} />
                  <figcaption>🌱 火种初醒 / Growing</figcaption>
                </figure>
                <figure>
                  <img src={publicPath(selectedPlant.mature)} alt={`${selectedPlant.chineseName} mature`} draggable={false} />
                  <figcaption>✨ 灵植长成 / Mature</figcaption>
                </figure>
              </div>
              <p className="reliquary-note">被项目选中后，这两张静态灵植图会在墓塔中采样为带深度的旋转 3D 粒子云。</p>
            </section>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="page dungeon-page fate-board-page">
      <section className="board-command dungeon-dialog">
        <header>
          <div>
            <p className="dungeon-kicker">THE LEDGER OF FATES</p>
            <h1>命运石板</h1>
            <p>每一列都是火种当前被古墓判定的命运。</p>
          </div>
          <strong>{filtered.length} RELICS</strong>
        </header>
        <div className="board-filters">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目铭文" />
          <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
            <option value="all">全部墓层</option>
            {zones.map((zone, index) => (
              <option key={zone.id} value={zone.id}>
                第 {index + 1} 层 · {zone.displayName}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部命运</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusMeta[status].label}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as PlantCategory | 'all')}>
            <option value="all">全部灵植</option>
            {plantCategories.map((category) => (
              <option key={category} value={category}>
                {plantCategoryMeta[category].label}
              </option>
            ))}
          </select>
          <button className="bronze-button" type="button" onClick={onGenerateMockProjects}>
            ↻ 重铸示例石板
          </button>
        </div>

        <section className="fate-lanes">
          {statusOrder.map((status) => {
            const lane = statusLore[status]
            const laneProjects = filtered.filter((project) => project.status === status)
            return (
              <section key={status} className={`fate-lane fate-lane-${status}`}>
                <header>
                  <b>{lane.numeral}</b>
                  <span>{lane.icon}</span>
                  <div>
                    <strong>{lane.name}</strong>
                    <small>{statusMeta[status].label} · {laneProjects.length}</small>
                  </div>
                </header>
                <div className="fate-lane-scroll">
                  {laneProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      zoneName={zones.find((zone) => zone.id === project.zoneId)?.displayName}
                      compact
                      board
                      onOpen={onOpenProject}
                      onDelete={onDeleteProject}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </section>
      </section>
    </main>
  )
}

function comparePlantsForCatalog(a: PlantLibraryItem, b: PlantLibraryItem) {
  return getCatalogOrder(a) - getCatalogOrder(b)
}

function getCatalogOrder(plant: PlantLibraryItem) {
  const plantNumber = Number(plant.id.replace('plant-', ''))
  if (plantNumber <= 6) return plantNumber - 1
  return featuredPlantOrder.get(plant.id) ?? plantNumber + 3
}
