import { describe, it, expect } from 'vitest'
import { assignProjectsToPlots, createFarmState, plotNeedsCare, plotStageFor, tickFarm, waterPlot, FARM_PLOT_COUNT } from './farm'
import type { ProjectSeed } from '../data/garden'

function makeProject(id: string, status: ProjectSeed['status'] = 'growing'): ProjectSeed {
  return {
    id,
    title: `项目${id}`,
    description: '',
    tags: [],
    priority: 'none',
    zoneId: 'flower',
    status,
    plantCategory: 'flower',
    position: { x: 50, y: 50 },
    overviewPosition: { x: 50, y: 50 },
    logs: [],
    milestones: [],
    outcomes: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('game/farm', () => {
  it('createFarmState builds a full grid of empty plots', () => {
    const s = createFarmState('me', 1000)
    expect(s.plots.length).toBe(FARM_PLOT_COUNT)
    expect(s.ownerId).toBe('me')
    expect(s.lastTickAt).toBe(1000)
    expect(s.plots.every((p) => !p.projectId)).toBe(true)
  })

  it('plotStageFor maps project status to stage', () => {
    expect(plotStageFor(undefined)).toBe('empty')
    expect(plotStageFor(makeProject('a', 'growing'))).toBe('growing')
    expect(plotStageFor(makeProject('b', 'mature'))).toBe('mature')
    expect(plotStageFor(makeProject('c', 'harvested'))).toBe('harvested')
  })

  it('assignProjectsToPlots fills empty plots and skips duplicates', () => {
    const s = createFarmState('me')
    const projects = [makeProject('p1'), makeProject('p2'), makeProject('p1' as string)]
    const next = assignProjectsToPlots(s, projects)
    const filled = next.plots.filter((p) => p.projectId)
    expect(filled.length).toBe(2)
    // 再赋一次不应重复
    const again = assignProjectsToPlots(next, projects)
    expect(again.plots.filter((p) => p.projectId).length).toBe(2)
  })

  it('assignProjectsToPlots clears plots whose project was deleted', () => {
    const s = assignProjectsToPlots(createFarmState('me'), [makeProject('p1')])
    const cleared = assignProjectsToPlots(s, [])
    expect(cleared.plots.every((p) => !p.projectId)).toBe(true)
  })

  it('tickFarm decays moisture on planted plots only', () => {
    const s = assignProjectsToPlots(createFarmState('me', 0), [makeProject('p1')])
    const later = 3 * 60 * 1000 // 3 分钟
    const { state } = tickFarm(s, later)
    const planted = state.plots.find((p) => p.projectId)!
    const empty = state.plots.find((p) => !p.projectId)!
    expect(planted.moisture).toBeLessThan(0.6)
    expect(empty.moisture).toBe(1)
    expect(state.lastTickAt).toBe(later)
  })

  it('waterPlot restores moisture and emits an event', () => {
    const s = assignProjectsToPlots(createFarmState('me', 0), [makeProject('p1')])
    const plotId = s.plots.find((p) => p.projectId)!.id
    const dried = tickFarm(s, 5 * 60 * 1000).state
    const { state, events } = waterPlot(dried, plotId)
    expect(state.plots.find((p) => p.id === plotId)!.moisture).toBe(1)
    expect(events.length).toBe(1)
  })

  it('plotNeedsCare flags dry planted plots', () => {
    const dry = { id: 'x', col: 0, row: 0, projectId: 'p1', moisture: 0.2 }
    const wet = { id: 'y', col: 0, row: 0, projectId: 'p1', moisture: 0.9 }
    const empty = { id: 'z', col: 0, row: 0, moisture: 0.1 }
    expect(plotNeedsCare(dry)).toBe(true)
    expect(plotNeedsCare(wet)).toBe(false)
    expect(plotNeedsCare(empty)).toBe(false)
  })
})
