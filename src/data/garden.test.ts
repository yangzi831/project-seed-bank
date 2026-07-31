import { describe, it, expect, beforeEach } from 'vitest'
import { loadGardenState, saveGardenState, createProjectSeed, normalizeStatus, DEMO_DATA_VERSION, SCHEMA_VERSION } from './garden'
import type { GardenState } from './garden'

describe('garden state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should load fallback when no state is stored', () => {
    const state = loadGardenState()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.projects.length).toBeGreaterThan(0)
  })

  it('should persist and load state', () => {
    const state = loadGardenState()
    saveGardenState(state)
    const loaded = loadGardenState()
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION)
    expect(loaded.projects.length).toBe(state.projects.length)
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
    localStorage.setItem('project-seed-bank:v3', JSON.stringify(oldState))
    const loaded = loadGardenState()
    const project = loaded.projects[0]
    expect(project.tags).toEqual([])
    expect(project.priority).toBe('none')
    expect(project.milestones).toEqual([])
    expect(project.aiSummary).toBeUndefined()
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
})

describe('normalizeStatus', () => {
  it('should normalize sprout to growing', () => {
    expect(normalizeStatus('sprout')).toBe('growing')
  })
})
