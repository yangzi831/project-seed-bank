import { useEffect, useMemo, useRef, useState } from 'react'
import { TopNav } from './components/TopNav'
import { ClaimHandleModal } from './components/ClaimHandleModal'
import { GlobalGardenKeeper } from './components/GlobalGardenKeeper'
import { GardenKeeperPortal } from './components/GardenKeeperPortal'
import { KeeperSelection } from './components/KeeperSelection'
import { SeedRefiner } from './components/SeedRefiner'
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
import { createAgentContext, createGardenAgentContext } from './agent/context'
import { requestGardenKeeper } from './agent/service'
import type { AgentScenario, AgentSeedDraft } from './agent/types'
import type { DemoSeedDraft } from './agent/demoConversation'
import { loadSelectedKeeper, saveSelectedKeeper } from './data/keepers'
import type { GardenKeeper } from './data/keepers'
import { useSupabaseSession } from './hooks/useSupabaseSession'
import { getMyProfile } from './services/supabase/profiles'
import type { PublicProfile } from './services/supabase/profiles'
import { syncGardenSnapshot } from './services/supabase/gardens'
import { getUnreadCommentCount } from './services/supabase/comments'
import { HomeView } from './views/HomeView'
import { GardenProfileView } from './views/GardenProfileView'
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
  | { name: 'profile'; handle: string }

export function App() {
  const [state, setState] = useState<GardenState>(() => loadGardenState())
  const [route, setRoute] = useState<Route>(() => parseRoute(getAppPathname()))
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProjectTab, setSelectedProjectTab] = useState<'overview' | 'keeper'>('overview')
  const [selectedAgentScenario, setSelectedAgentScenario] = useState<AgentScenario>('growth-companion')
  const [selectedKeeper, setSelectedKeeper] = useState<GardenKeeper>(() => loadSelectedKeeper())
  const [showKeeperSelection, setShowKeeperSelection] = useState(false)
  const [showKeeperPortal, setShowKeeperPortal] = useState(false)
  const [seedRefiner, setSeedRefiner] = useState<{ open: boolean; initialIdea: string }>({ open: false, initialIdea: '' })
  const { user, status: sessionStatus } = useSupabaseSession()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [showClaim, setShowClaim] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const syncTimerRef = useRef<number | null>(null)

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
    if (!user) {
      setProfile(null)
      return
    }
    let cancelled = false
    getMyProfile(user.id)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // 公开快照防抖推送（本地为源）
  useEffect(() => {
    if (!user || sessionStatus !== 'ready') return
    const userId = user.id
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
    syncTimerRef.current = window.setTimeout(() => {
      void syncGardenSnapshot(userId, state)
    }, 2000)
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
    }
  }, [state, user, sessionStatus])

  // 铃铛未读数轮询
  useEffect(() => {
    if (!user || sessionStatus !== 'ready') {
      setUnreadCount(0)
      return
    }
    const userId = user.id
    let cancelled = false
    async function poll() {
      try {
        const count = await getUnreadCommentCount(userId)
        if (!cancelled) setUnreadCount(count)
      } catch {
        // 轮询失败静默
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 45000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [user, sessionStatus])

  const currentZone = useMemo(() => {
    if (route.name !== 'zone') return undefined
    return state.zones.find((zone) => zone.id === route.zoneId)
  }, [route, state.zones])

  const currentProject = useMemo(() => {
    if (!selectedProjectId) return undefined
    return state.projects.find((project) => project.id === selectedProjectId)
  }, [selectedProjectId, state.projects])

  const keeperChatContext = useMemo(() => {
    const focusProject =
      currentProject ??
      [...state.projects]
        .filter((project) => route.name !== 'zone' || project.zoneId === route.zoneId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    const focusZone = state.zones.find((zone) => zone.id === focusProject?.zoneId) ?? currentZone
    const gardenProjects = focusZone ? state.projects.filter((project) => project.zoneId === focusZone.id) : state.projects

    return createGardenAgentContext(
      { projects: gardenProjects },
      { keeper: selectedKeeper, project: focusProject, zone: focusZone },
    )
  }, [currentProject, currentZone, route, selectedKeeper, state.projects, state.zones])

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
    const response = await requestGardenKeeper({
      scenario: 'seed-discovery',
      message: messages[messages.length - 1]?.content ?? '',
      context: createGardenAgentContext(state),
    })
    if (!response.suggestion.seedDraft) throw new Error('园丁没有返回可应用的项目种子')
    return response.suggestion.seedDraft
  }

  async function summarizeProject(projectId: string) {
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) return

    const response = await requestGardenKeeper({
      scenario: 'growth-companion',
      message: '整理这个项目目前的成长轨迹，并提出下一步。',
      context: createAgentContext(project),
    })
    updateProject(projectId, {
      aiSummary: {
        summary: response.suggestion.summary,
        obstacles: response.suggestion.obstacles ?? [],
        nextSteps: response.suggestion.points,
        logHash: project.logs.map((l) => l.text).join(''),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
    })
  }

  function applyRefinedSeed(output: AgentSeedDraft) {
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
      projects: [
        {
          ...project,
          milestones: milestone ? [milestone] : [],
        },
        ...current.projects,
      ],
    }))
    setSeedRefiner({ open: false, initialIdea: '' })
  }

  function selectKeeper(keeper: GardenKeeper) {
    setSelectedKeeper(keeper)
    saveSelectedKeeper(keeper.id)
  }

  const nav = {
    goHome: () => navigate({ name: 'home' }),
    goList: () => navigate({ name: 'list' }),
    goBoard: () => navigate({ name: 'board' }),
    goZone: (zoneId: ZoneKey) => navigate({ name: 'zone', zoneId }),
    goProject: (projectId: string) => {
      setSelectedProjectTab('overview')
      setSelectedProjectId(projectId)
    },
    goProfile: (handle: string) => navigate({ name: 'profile', handle }),
    goKeeper: (projectId: string, scenario: AgentScenario = 'growth-companion') => {
      setSelectedProjectTab('keeper')
      setSelectedAgentScenario(scenario)
      setSelectedProjectId(projectId)
    },
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
      <TopNav
        active={route.name}
        onGarden={nav.goHome}
        onList={nav.goList}
        onBoard={nav.goBoard}
        profile={profile ? { handle: profile.handle, nickname: profile.nickname } : null}
        sessionReady={sessionStatus === 'ready'}
        onClaim={() => setShowClaim(true)}
        onVisit={(handle) => nav.goProfile(handle)}
        unreadCount={unreadCount}
        onBell={profile ? () => {
          setUnreadCount(0)
          nav.goProfile(profile.handle)
        } : undefined}
      />
      {selectedKeeper && !showKeeperSelection && !showKeeperPortal && (route.name === 'home' || route.name === 'zone' || Boolean(currentProject)) && (
        <GlobalGardenKeeper
          keeper={selectedKeeper}
          context={keeperChatContext}
          onPlantSeed={(draft: DemoSeedDraft) =>
            addProject(draft.zoneId, draft.projectName, draft.description, draft.plantCategory)
          }
          onChangeKeeper={() => setShowKeeperSelection(true)}
          onOpenCottage={() => setShowKeeperPortal(true)}
        />
      )}
      {route.name === 'home' && (
        <HomeView
          zones={state.zones}
          projects={state.projects}
          onOpenZone={nav.goZone}
          onOpenProject={nav.goProject}
          onAddProject={addProject}
          onUpdateProject={updateProject}
          onDeleteProject={deleteProject}
          onRefineSeed={(idea) => setSeedRefiner({ open: true, initialIdea: idea })}
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
      {route.name === 'profile' && (
        <GardenProfileView
          handle={route.handle}
          currentUserId={user?.id ?? null}
          myProfile={profile}
          onBack={nav.goHome}
        />
      )}
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
          initialTab={selectedProjectTab}
          initialAgentScenario={selectedAgentScenario}
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
      {showClaim && user && (
        <ClaimHandleModal
          userId={user.id}
          onClaimed={(p) => {
            setProfile(p)
            setShowClaim(false)
          }}
          onClose={() => setShowClaim(false)}
        />
      )}
      {showKeeperSelection && (
        <div className="modal-scrim keeper-selection-scrim" role="presentation" onMouseDown={() => setShowKeeperSelection(false)}>
          <div className="keeper-selection-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <KeeperSelection
              initialKeeperId={selectedKeeper.id}
              onConfirm={(keeper) => {
                selectKeeper(keeper)
                setShowKeeperSelection(false)
              }}
              onCancel={() => setShowKeeperSelection(false)}
            />
          </div>
        </div>
      )}
      {showKeeperPortal && (
        <GardenKeeperPortal
          projects={state.projects}
          keeper={selectedKeeper}
          onChangeKeeper={() => {
            setShowKeeperPortal(false)
            setShowKeeperSelection(true)
          }}
          onOpenProject={(projectId) => {
            setShowKeeperPortal(false)
            nav.goProject(projectId)
          }}
          onStartFlow={(projectId, scenario) => {
            setShowKeeperPortal(false)
            nav.goKeeper(projectId, scenario)
          }}
          onClose={() => setShowKeeperPortal(false)}
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

  const profileMatch = pathname.match(/^\/u\/([a-z0-9_]+)$/)
  if (profileMatch) {
    return { name: 'profile', handle: profileMatch[1] }
  }

  return { name: 'home' }
}

function routeToPath(route: Route) {
  if (route.name === 'home') return '/garden'
  if (route.name === 'list') return '/plants'
  if (route.name === 'board') return '/board'
  if (route.name === 'plantLibrary') return '/dev/plant-library'
  if (route.name === 'profile') return `/u/${route.handle}`
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
