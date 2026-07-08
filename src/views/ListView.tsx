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
          plant.id.toLowerCase().includes(lowered) ||
          plant.englishName.toLowerCase().includes(lowered) ||
          plant.chineseName.includes(query.trim())
        return matchesCategory && matchesQuery
      })
      .sort(comparePlantsForCatalog)
  }, [categoryFilter, query])

  if (!boardMode) {
    return (
      <main className="page list-page plants-page">
        <section className="list-workbench">
          <aside className="glass-panel list-filter-sidebar">
            <p className="eyebrow">Plant overview</p>
            <h1>All Plants</h1>
            <p>固定 24 株数字植物资产，查看生长中与长成两种状态。</p>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索植物名" />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as PlantCategory | 'all')}>
              <option value="all">全部植物类型</option>
              {plantCategories.map((category) => (
                <option key={category} value={category}>
                  {plantCategoryMeta[category].label}
                </option>
              ))}
            </select>
            <small>{filteredPlants.length} / {plantLibrary.length} plants</small>
          </aside>

          <section className="plant-catalog-grid">
            {filteredPlants.map((plant) => (
              <button key={plant.id} className="plant-catalog-card glass-panel" type="button" onClick={() => setSelectedPlant(plant)}>
                <span className="plant-catalog-image">
                  <img src={publicPath(plant.mature)} alt="" draggable={false} />
                  <img className="plant-mature-mini" src={publicPath(plant.growing)} alt="" draggable={false} />
                </span>
                <span className="plant-catalog-copy">
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
            <section className="plant-library-modal glass-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
              <header className="dossier-header">
                <div>
                  <p className="eyebrow">{selectedPlant.id} / {plantCategoryMeta[selectedPlant.category].label}</p>
                  <h2>{selectedPlant.chineseName}</h2>
                  <p>{selectedPlant.englishName}</p>
                </div>
                <button className="dossier-close" type="button" onClick={() => setSelectedPlant(null)}>
                  Close
                </button>
              </header>
              <div className="plant-state-compare">
                <figure>
                  <img src={publicPath(selectedPlant.growing)} alt={`${selectedPlant.chineseName} growing`} draggable={false} />
                  <figcaption>生长中 / Growing</figcaption>
                </figure>
                <figure>
                  <img src={publicPath(selectedPlant.mature)} alt={`${selectedPlant.chineseName} mature`} draggable={false} />
                  <figcaption>长成 / Mature</figcaption>
                </figure>
              </div>
            </section>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="page list-page board-page">
      <section className="list-workbench">
        <aside className="glass-panel list-filter-sidebar">
          <p className="eyebrow">Growth status board</p>
          <h1>Growth Board</h1>
          <p>按成长状态查看项目流转。</p>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目名" />
          <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
            <option value="all">全部区域</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.displayName}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusMeta[status].label}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as PlantCategory | 'all')}>
            <option value="all">全部植物</option>
            {plantCategories.map((category) => (
              <option key={category} value={category}>
                {plantCategoryMeta[category].label}
              </option>
            ))}
          </select>
          <button className="ghost-button small subtle-action" type="button" onClick={onGenerateMockProjects}>
            生成示例项目
          </button>
          <small>{filtered.length} projects matched</small>
        </aside>

        <section className="list-results">
          <section className="board-grid">
              {statusOrder.map((status) => {
                const laneProjects = filtered.filter((project) => project.status === status)
                return (
                  <div key={status} className="board-lane glass-panel">
                    <h2>
                      {statusMeta[status].label} <span>· {laneProjects.length}</span>
                    </h2>
                    <div className="seed-list">
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
                  </div>
                )
              })}
          </section>
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
