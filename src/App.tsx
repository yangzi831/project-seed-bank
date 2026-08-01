import { useEffect, useMemo, useRef, useState } from 'react'
import { AISettingsPanel } from './components/AISettingsPanel'
import { DungeonHUD } from './components/DungeonHUD'
import { SeedRefiner } from './components/SeedRefiner'
import { TopNav } from './components/TopNav'
import {
  createId,
  createMockProjects,
  createProjectSeed,
  DEMO_DATA_VERSION,
  growthAdvanceOrder,
  loadGardenState,
  saveGardenState,
} from './data/garden'
import type { GardenState, OutcomeType, PlantCategory, ProjectSeed, ProjectStatus, Zone, ZoneKey } from './data/garden'
import { createInitialDungeonGame, resolveDungeonTurn, rollDungeonDice, startDungeonGame } from './game/dungeon'
import type { FateEvent } from './game/dungeon'
import { buildProjectContext } from './services/ai/context'
import { assertRefineSeedOutput, callGardener } from './services/ai/gardener'
import { loadAISettings, saveAISettings } from './services/ai/settings'
import type { RefineSeedOutput, SummarizeGrowthOutput } from './services/ai/types'
import { DungeonBoardScene } from './three/DungeonBoardScene'
import type { DungeonSceneMode } from './three/DungeonBoardScene'
import { HomeView } from './views/HomeView'
import { ListView } from './views/ListView'
import { PlantLibraryView } from './views/PlantLibraryView'
import { ProjectDetailView } from './views/ProjectDetailView'
import { WorldView } from './views/WorldView'
import { ZoneView } from './views/ZoneView'

type Route =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'board' }
  | { name: 'zone'; zoneId: ZoneKey }
  | { name: 'plantLibrary' }
  | { name: 'world' }

export function App() {
  const [state, setState] = useState<GardenState>(() => loadGardenState())
  const [route, setRoute] = useState<Route>(() => parseRoute(getAppPathname()))
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [aiSettings, setAISettings] = useState(() => loadAISettings())
  const [showAISettings, setShowAISettings] = useState(false)
  const [seedRefiner, setSeedRefiner] = useState<{ open: boolean; initialIdea: string }>({ open: false, initialIdea: '' })

  const [game, setGame] = useState(() => createInitialDungeonGame())
  const gameRef = useRef(game)
  const [rolling, setRolling] = useState(false)
  const [dice, setDice] = useState<[number, number] | null>(null)
  const [fate, setFate] = useState<FateEvent | null>(null)
  const [dangerFlash, setDangerFlash] = useState(false)
  const [screenShake, setScreenShake] = useState(false)
  const [devilEnraged, setDevilEnraged] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const effectSequence = useRef(0)
  const effectTimers = useRef<number[]>([])

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

  useEffect(() => {
    gameRef.current = game
  }, [game])

  useEffect(() => {
    return () => {
      effectTimers.current.forEach((timer) => window.clearTimeout(timer))
      effectTimers.current = []
    }
  }, [])

  const currentZone = useMemo(() => {
    if (route.name !== 'zone') return undefined
    return state.zones.find((zone) => zone.id === route.zoneId)
  }, [route, state.zones])

  const currentProject = useMemo(() => {
    if (!selectedProjectId) return undefined
    return state.projects.find((project) => project.id === selectedProjectId)
  }, [selectedProjectId, state.projects])

  const sceneMode: DungeonSceneMode = route.name === 'board' ? 'board' : route.name === 'list' || route.name === 'plantLibrary' ? 'archive' : route.name === 'zone' ? 'floor' : 'overview'
  const activeFloor = route.name === 'zone' ? state.zones.findIndex((zone) => zone.id === route.zoneId) : undefined
  const isWorldRoute = route.name === 'world'

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
    const confirmed = window.confirm(`确认让这枚火种永远熄灭吗？${project ? `\n\n${project.title}` : ''}`)
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
              logs: [{ id: createId('log'), createdAt: new Date().toISOString(), text: text.trim(), author: 'user' }, ...project.logs],
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

  async function refineSeed(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<unknown> {
    const context = state.projects.slice(0, 5).map((project) => `項目：${project.title}，狀態：${project.status}，區域：${project.zoneId}`).join('\n')
    const response = await callGardener({
      intent: 'refineSeed',
      messages: [{ role: 'user', content: `現有專案參考：\n${context}\n\n${messages[messages.length - 1].content}` }],
    })
    return assertRefineSeedOutput(response)
  }

  async function summarizeProject(projectId: string) {
    const project = state.projects.find((item) => item.id === projectId)
    if (!project) return

    const response = await callGardener({
      intent: 'summarizeGrowth',
      messages: [{ role: 'user', content: buildProjectContext(project) }],
    })
    const summary = response as SummarizeGrowthOutput
    updateProject(projectId, {
      aiSummary: {
        summary: summary.summary,
        obstacles: summary.obstacles,
        nextSteps: summary.nextSteps,
        logHash: project.logs.map((log) => log.text).join(''),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    })
  }

  function applyRefinedSeed(output: RefineSeedOutput) {
    const project = createProjectSeed({
      zoneId: output.zoneId,
      title: output.title,
      description: output.description,
      plantCategory: output.plantCategory,
      goal: output.goal,
      tags: output.tags,
      priority: 'medium',
    })
    const milestone = output.firstMilestone
      ? { id: createId('milestone'), text: output.firstMilestone, completed: false, createdAt: new Date().toISOString() }
      : undefined

    setState((current) => ({
      ...current,
      projects: [{ ...project, milestones: milestone ? [milestone] : [] }, ...current.projects],
    }))
    setSeedRefiner({ open: false, initialIdea: '' })
  }

  function clearEffectTimers() {
    effectTimers.current.forEach((timer) => window.clearTimeout(timer))
    effectTimers.current = []
  }

  function schedule(sequence: number, delay: number, action: () => void) {
    const timer = window.setTimeout(() => {
      if (effectSequence.current === sequence) action()
    }, delay)
    effectTimers.current.push(timer)
  }

  function resetTransientEffects() {
    setDice(null)
    setFate(null)
    setDangerFlash(false)
    setScreenShake(false)
    setDevilEnraged(false)
    setRolling(false)
  }

  function beginAdventure() {
    effectSequence.current += 1
    clearEffectTimers()
    resetTransientEffects()
    const next = startDungeonGame()
    gameRef.current = next
    setGame(next)
  }

  function resetAdventure() {
    beginAdventure()
  }

  function rollFate() {
    if (rolling || gameRef.current.winner || !gameRef.current.started) return
    const sequence = effectSequence.current + 1
    effectSequence.current = sequence
    setFate(null)
    setDangerFlash(false)
    setScreenShake(false)
    const rolled = rollDungeonDice()
    setDice(rolled)
    setRolling(true)

    schedule(sequence, 900, () => {
      const resolution = resolveDungeonTurn(gameRef.current, rolled)
      gameRef.current = resolution.state
      setGame(resolution.state)
      setFate(resolution.fate ?? null)
      if (resolution.danger) {
        setDangerFlash(true)
        setScreenShake(true)
        schedule(sequence, 450, () => setScreenShake(false))
        schedule(sequence, 700, () => setDangerFlash(false))
      }
      if (resolution.devilEnraged) {
        setDevilEnraged(true)
        schedule(sequence, 1000, () => setDevilEnraged(false))
      }
    })
    schedule(sequence, 1400, () => {
      setDice(null)
      setRolling(false)
    })
    schedule(sequence, 2700, () => setFate(null))
  }

  function navigate(nextRoute: Route) {
    const nextPath = withBasePath(routeToPath(nextRoute))
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setRoute(nextRoute)
  }

  const nav = {
    goHome: () => navigate({ name: 'home' }),
    goList: () => navigate({ name: 'list' }),
    goBoard: () => navigate({ name: 'board' }),
    goZone: (zoneId: ZoneKey) => navigate({ name: 'zone', zoneId }),
    goWorld: () => navigate({ name: 'world' }),
    goProject: (projectId: string) => setSelectedProjectId(projectId),
  }

  function openFloor(floor: number) {
    if (floor >= 0 && floor < state.zones.length) nav.goZone(state.zones[floor].id)
    else nav.goBoard()
  }

  return (
    <div className={`app-shell ${screenShake ? 'screen-shake' : ''}`}>
      {!isWorldRoute && (
        <DungeonBoardScene
          mode={sceneMode}
          activeFloor={activeFloor}
          projects={state.projects}
          players={game.players}
          devilPosition={game.devilPosition}
          devilEnraged={devilEnraged}
          started={game.started}
          onProjectOpen={nav.goProject}
          onFloorSelect={openFloor}
          onReady={() => setSceneReady(true)}
        />
      )}
      <div className="permanent-vignette" aria-hidden="true" />
      <div className="stone-grain" aria-hidden="true" />
      <TopNav
        active={route.name}
        onGarden={nav.goHome}
        onList={nav.goList}
        onBoard={nav.goBoard}
        onWorld={nav.goWorld}
        onSettings={() => setShowAISettings(true)}
        sceneReady={sceneReady}
      />

      {route.name === 'world' && <WorldView ownProjects={state.projects} onProjectOpen={nav.goProject} />}

      {route.name === 'home' && (
        <>
          <HomeView
            zones={state.zones}
            projects={state.projects}
            onOpenZone={nav.goZone}
            onOpenProject={nav.goProject}
            onAddProject={addProject}
            onDeleteProject={deleteProject}
            onRefineSeed={(idea) => setSeedRefiner({ open: true, initialIdea: idea })}
          />
          <DungeonHUD
            game={game}
            rolling={rolling}
            dice={dice}
            fate={fate}
            devilEnraged={devilEnraged}
            projectCount={state.projects.length}
            onStart={beginAdventure}
            onRoll={rollFate}
            onReset={resetAdventure}
          />
        </>
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
          onOpenProject={nav.goProject}
          onOpenZone={nav.goZone}
          onDeleteProject={deleteProject}
          onRefineSeed={(idea) => setSeedRefiner({ open: true, initialIdea: idea })}
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
          onAskGardener={(projectId) => summarizeProject(projectId)}
        />
      )}
      {showAISettings && (
        <AISettingsPanel
          settings={aiSettings}
          onChange={(settings) => {
            setAISettings(settings)
            saveAISettings(settings)
          }}
          onClose={() => setShowAISettings(false)}
        />
      )}
      {seedRefiner.open && (
        <SeedRefiner
          initialIdea={seedRefiner.initialIdea}
          onApply={applyRefinedSeed}
          onCancel={() => setSeedRefiner({ open: false, initialIdea: '' })}
          onRefine={refineSeed}
        />
      )}
      <div className={`danger-flash ${dangerFlash ? 'is-visible' : ''}`} aria-hidden="true" />
    </div>
  )
}

function parseRoute(pathname: string): Route {
  if (pathname === '/' || pathname === '/garden') return { name: 'home' }
  if (pathname === '/plants' || pathname === '/plant-library') return { name: 'list' }
  if (pathname === '/board') return { name: 'board' }
  if (pathname === '/world' || pathname.startsWith('/room')) return { name: 'world' }
  if (pathname === '/dev/plant-library') return { name: 'plantLibrary' }

  const zoneMatch = pathname.match(/^\/garden\/([^/]+)$/)
  if (zoneMatch && isZoneKey(zoneMatch[1])) return { name: 'zone', zoneId: zoneMatch[1] }
  return { name: 'home' }
}

function routeToPath(route: Route) {
  if (route.name === 'home') return '/garden'
  if (route.name === 'list') return '/plants'
  if (route.name === 'board') return '/board'
  if (route.name === 'world') return '/world'
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
