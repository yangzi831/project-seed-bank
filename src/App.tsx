import { useEffect, useMemo, useState } from 'react'
import { TopNav } from './components/TopNav'
import {
  createMockProjects,
  createProjectSeed,
  createId,
  DEMO_DATA_VERSION,
  growthAdvanceOrder,
  loadGardenState,
  saveGardenState,
} from './data/garden'
import type { GardenState, OutcomeType, PlantCategory, ProjectSeed, ProjectStatus, Zone, ZoneKey } from './data/garden'
import { HomeView } from './views/HomeView'
import { ListView } from './views/ListView'
import { PlantLibraryView } from './views/PlantLibraryView'
import { ProjectDetailView } from './views/ProjectDetailView'
import { ZoneView } from './views/ZoneView'

type Route =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'board' }
  | { name: 'zone'; zoneId: ZoneKey }
  | { name: 'plantLibrary' }

export function App() {
  const [state, setState] = useState<GardenState>(() => loadGardenState())
  const [route, setRoute] = useState<Route>(() => parseRoute(getAppPathname()))
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    const nextPath = withBasePath(routeToPath(route))
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, '', nextPath)
    }

    const handlePopState = () => setRoute(parseRoute(getAppPathname()))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [route])

  useEffect(() => {
    saveGardenState(state)
  }, [state])

  const currentZone = useMemo(() => {
    if (route.name !== 'zone') return undefined
    return state.zones.find((zone) => zone.id === route.zoneId)
  }, [route, state.zones])

  const currentProject = useMemo(() => {
    if (!selectedProjectId) return undefined
    return state.projects.find((project) => project.id === selectedProjectId)
  }, [selectedProjectId, state.projects])

  function updateZone(zoneId: ZoneKey, patch: Partial<Pick<Zone, 'displayName' | 'description'>>) {
    setState((current) => ({
      ...current,
      zones: current.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
    }))
  }

  function addProject(zoneId: ZoneKey, title: string, description: string, plantCategory: PlantCategory, plantVariant?: string) {
    const project = createProjectSeed({ zoneId, title, description, plantCategory, plantVariant })
    setState((current) => ({
      ...current,
      projects: [project, ...current.projects],
    }))
  }

  function updateProject(projectId: string, patch: Partial<ProjectSeed>) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project,
      ),
    }))
  }

  function deleteProject(projectId: string) {
    const project = state.projects.find((item) => item.id === projectId)
    const confirmed = window.confirm(`确认删除这个项目吗？${project ? `\n\n${project.title}` : ''}`)
    if (!confirmed) return

    setState((current) => ({
      ...current,
      projects: current.projects.filter((item) => item.id !== projectId),
    }))
    setSelectedProjectId((current) => (current === projectId ? null : current))
  }

  function addProjectLog(projectId: string, text: string) {
    if (!text.trim()) return
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              updatedAt: new Date().toISOString(),
              logs: [{ id: createId('log'), createdAt: new Date().toISOString(), text: text.trim() }, ...project.logs],
            }
          : project,
      ),
    }))
  }

  function addOutcome(projectId: string, title: string, type: OutcomeType, value: string) {
    if (!title.trim() || !value.trim()) return
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              updatedAt: new Date().toISOString(),
              outcomes: [
                { id: createId('outcome'), title: title.trim(), type, value: value.trim(), createdAt: new Date().toISOString() },
                ...project.outcomes,
              ],
            }
          : project,
      ),
    }))
  }

  function advanceProject(project: ProjectSeed) {
    const index = growthAdvanceOrder.indexOf(project.status)
    const nextStatus: ProjectStatus = growthAdvanceOrder[Math.min(Math.max(index, 0) + 1, growthAdvanceOrder.length - 1)]
    updateProject(project.id, { status: nextStatus })
  }

  function generateMockProjects() {
    setState((current) => ({
      ...current,
      projects: createMockProjects(),
      demoDataVersion: DEMO_DATA_VERSION,
    }))
    setSelectedProjectId(null)
  }

  const nav = {
    goHome: () => navigate({ name: 'home' }),
    goList: () => navigate({ name: 'list' }),
    goBoard: () => navigate({ name: 'board' }),
    goZone: (zoneId: ZoneKey) => navigate({ name: 'zone', zoneId }),
    goProject: (projectId: string) => setSelectedProjectId(projectId),
  }

  function navigate(nextRoute: Route) {
    const nextPath = withBasePath(routeToPath(nextRoute))
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setRoute(nextRoute)
  }

  return (
    <div className="app-shell">
      <TopNav active={route.name} onGarden={nav.goHome} onList={nav.goList} onBoard={nav.goBoard} />
      {route.name === 'home' && (
        <HomeView
          zones={state.zones}
          projects={state.projects}
          onOpenZone={nav.goZone}
          onOpenProject={nav.goProject}
          onAddProject={addProject}
          onUpdateProject={updateProject}
          onDeleteProject={deleteProject}
        />
      )}
      {route.name === 'list' && (
        <ListView
          zones={state.zones}
          projects={state.projects}
          onOpenProject={nav.goProject}
          onDeleteProject={deleteProject}
          onGenerateMockProjects={generateMockProjects}
        />
      )}
      {route.name === 'board' && (
        <ListView
          zones={state.zones}
          projects={state.projects}
          onOpenProject={nav.goProject}
          onDeleteProject={deleteProject}
          onGenerateMockProjects={generateMockProjects}
          boardMode
        />
      )}
      {route.name === 'plantLibrary' && <PlantLibraryView />}
      {route.name === 'zone' && currentZone && (
        <ZoneView
          zone={currentZone}
          zones={state.zones}
          projects={state.projects.filter((project) => project.zoneId === currentZone.id)}
          onBack={nav.goHome}
          onUpdateZone={updateZone}
          onAddProject={addProject}
          onUpdateProject={updateProject}
          onAddLog={addProjectLog}
          onAddOutcome={addOutcome}
          onOpenProject={nav.goProject}
          onOpenZone={nav.goZone}
          onDeleteProject={deleteProject}
        />
      )}
      {currentProject && (
        <ProjectDetailView
          project={currentProject}
          zone={state.zones.find((zone) => zone.id === currentProject.zoneId)}
          onBack={() => setSelectedProjectId(null)}
          onUpdateProject={updateProject}
          onAddLog={addProjectLog}
          onAddOutcome={addOutcome}
          onAdvance={advanceProject}
          onDeleteProject={deleteProject}
        />
      )}
    </div>
  )
}

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '/garden') {
    return { name: 'home' }
  }

  if (pathname === '/plants' || pathname === '/plant-library') {
    return { name: 'list' }
  }

  if (pathname === '/board') {
    return { name: 'board' }
  }

  if (pathname === '/dev/plant-library') {
    return { name: 'plantLibrary' }
  }

  const zoneMatch = pathname.match(/^\/garden\/([^/]+)$/)
  if (zoneMatch && isZoneKey(zoneMatch[1])) {
    return { name: 'zone', zoneId: zoneMatch[1] }
  }

  return { name: 'home' }
}

function routeToPath(route: Route) {
  if (route.name === 'home') return '/garden'
  if (route.name === 'list') return '/plants'
  if (route.name === 'board') return '/board'
  if (route.name === 'plantLibrary') return '/dev/plant-library'
  return `/garden/${route.zoneId}`
}

function isZoneKey(value: string): value is ZoneKey {
  return ['flower', 'water', 'exhibition', 'woodland', 'experiment'].includes(value)
}

function getAppPathname() {
  const basePath = import.meta.env.BASE_URL
  const pathname = window.location.pathname
  if (basePath && basePath !== '/' && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length - 1) || '/'
  }
  return pathname
}

function withBasePath(path: string) {
  const basePath = import.meta.env.BASE_URL
  if (!basePath || basePath === '/') return path
  return `${basePath.replace(/\/$/, '')}${path}`
}
