import { describe, it, expect, beforeEach } from 'vitest'
import { loadGardenState, saveGardenState, createProjectSeed, normalizeStatus, DEMO_DATA_VERSION, SCHEMA_VERSION, createMockProjects } from './garden'
import type { GardenState } from './garden'

describe('garden state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should load fallback when no state is stored', () => {
    const state = loadGardenState()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.projects.length).toBeGreaterThan(0)
    // 所有 fallback 项目应标记为 demo 来源
    expect(state.projects.every((p) => p.seedOrigin === 'demo')).toBe(true)
  })

  it('should persist and load state', () => {
    const state = loadGardenState()
    saveGardenState(state)
    const loaded = loadGardenState()
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.projects.length).toBe(state.projects.length)
  })

  it('should use v2 storage key', () => {
    const state = loadGardenState()
    state.projects = [createProjectSeed({ zoneId: 'flower', title: 'V2 Test', description: '', plantCategory: 'flower' })]
    saveGardenState(state)

    // 验证写入 v2 key
    const raw = localStorage.getItem('project-seed-bank:v2')
    expect(raw).not.toBeNull()
  })

  it('should read from legacy v3 key', () => {
    const project = createProjectSeed({ zoneId: 'water', title: 'Legacy', description: '', plantCategory: 'green' })
    const oldState: GardenState = {
      schemaVersion: 3,
      zones: [],
      projects: [project],
      demoDataVersion: DEMO_DATA_VERSION,
    }
    localStorage.setItem('project-seed-bank:v3', JSON.stringify(oldState))
    const loaded = loadGardenState()
    expect(loaded.projects.length).toBe(1)
    expect(loaded.projects[0].title).toBe('Legacy')
  })

  it('should migrate old project without aiSummary', () => {
    const oldState: GardenState = {
      schemaVersion: 2,
      zones: [],
      projects: [
        {
          id: 'seed-123',
          title: 'Old project',
          description: 'description',
          zoneId: 'flower',
          status: 'growing',
          plantCategory: 'green',
          position: { x: 0, y: 0 },
          overviewPosition: { x: 0, y: 0 },
          logs: [],
          outcomes: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        } as unknown as GardenState['projects'][number],
      ],
      demoDataVersion: DEMO_DATA_VERSION,
    }
    localStorage.setItem('project-seed-bank:v2', JSON.stringify(oldState))
    const loaded = loadGardenState()
    const project = loaded.projects[0]
    expect(project.tags).toEqual([])
    expect(project.priority).toBe('none')
    expect(project.milestones).toEqual([])
    expect(project.aiSummary).toBeUndefined()
  })

  it('should preserve user-modified demo projects on demo version change', () => {
    // 先加载初始状态
    const initial = loadGardenState()
    const demoProjectId = initial.projects[0].id

    // 模拟用户修改
    initial.projects = initial.projects.map((p) =>
      p.id === demoProjectId ? { ...p, title: 'User Modified Title', userModified: true } : p,
    )
    // 用旧版本保存
    saveGardenState({ ...initial, demoDataVersion: 'old-version' })

    // 重新加载（版本变化应触发 demo 刷新）
    const reloaded = loadGardenState()
    const kept = reloaded.projects.find((p) => p.id === demoProjectId)
    expect(kept).toBeDefined()
    expect(kept?.title).toBe('User Modified Title')
    expect(kept?.userModified).toBe(true)
  })

  it('should replace unmodified demo projects on version change', () => {
    const initial = loadGardenState()

    // 保存为旧版本（不修改任何项目）
    saveGardenState({ ...initial, demoDataVersion: 'old-version' })

    // 重新加载 — demo 应被重建
    const reloaded = loadGardenState()
    expect(reloaded.demoDataVersion).toBe(DEMO_DATA_VERSION)
    // 所有项目应是新的 demo（seedOrigin = 'demo', userModified = false）
    expect(reloaded.projects.every((p) => p.seedOrigin === 'demo')).toBe(true)
    expect(reloaded.projects.every((p) => !p.userModified)).toBe(true)
  })
})

describe('createProjectSeed', () => {
  it('should create a project with default fields', () => {
    const project = createProjectSeed({
      zoneId: 'flower',
      title: 'Test',
      description: 'Test description',
      plantCategory: 'flower',
    })
    expect(project.title).toBe('Test')
    expect(project.tags).toEqual([])
    expect(project.priority).toBe('none')
    expect(project.milestones).toEqual([])
  })

  it('should mark user-created projects with seedOrigin and userModified', () => {
    const project = createProjectSeed({
      zoneId: 'exhibition',
      title: 'User Project',
      description: 'My project',
      plantCategory: 'tree',
    })
    expect(project.seedOrigin).toBe('user')
    expect(project.userModified).toBe(true)
  })

  it('should set initial status to growing', () => {
    const project = createProjectSeed({
      zoneId: 'woodland',
      title: 'Growing Test',
      description: '',
      plantCategory: 'green',
    })
    expect(project.status).toBe('growing')
  })
})

describe('normalizeStatus', () => {
  it('should normalize sprout to growing', () => {
    expect(normalizeStatus('sprout')).toBe('growing')
  })

  it('should normalize unknown status to growing', () => {
    expect(normalizeStatus('invalid')).toBe('growing')
  })

  it('should pass through valid statuses', () => {
    expect(normalizeStatus('growing')).toBe('growing')
    expect(normalizeStatus('mature')).toBe('mature')
    expect(normalizeStatus('dormant')).toBe('dormant')
    expect(normalizeStatus('harvested')).toBe('harvested')
  })
})

describe('createMockProjects', () => {
  it('should create 32 demo projects', () => {
    const projects = createMockProjects()
    expect(projects.length).toBe(32)
  })

  it('should distribute across 5 zones as 6,7,6,6,7', () => {
    const projects = createMockProjects()
    const counts = { flower: 0, water: 0, exhibition: 0, woodland: 0, experiment: 0 }
    for (const p of projects) {
      counts[p.zoneId]++
    }
    expect(counts.flower).toBe(6)
    expect(counts.water).toBe(7)
    expect(counts.exhibition).toBe(6)
    expect(counts.woodland).toBe(6)
    expect(counts.experiment).toBe(7)
  })

  it('should have all four statuses represented', () => {
    const projects = createMockProjects()
    const statuses = new Set(projects.map((p) => p.status))
    expect(statuses.has('growing')).toBe(true)
    expect(statuses.has('mature')).toBe(true)
    expect(statuses.has('dormant')).toBe(true)
    expect(statuses.has('harvested')).toBe(true)
  })
})
