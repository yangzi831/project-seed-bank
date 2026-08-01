import { describe, it, expect } from 'vitest'
import { buildWorldLayout, createLocalWorldProvider, OWN_ROOM_ID } from './world'
import { localDecision, buildContextText } from './agentBrain'
import type { AgentDecisionContext } from './agentBrain'
import { createFarmState, assignProjectsToPlots } from './farm'
import type { ProjectSeed } from '../data/garden'

function makeProject(id: string, status: ProjectSeed['status'] = 'growing'): ProjectSeed {
  return {
    id, title: `项目${id}`, description: '', tags: [], priority: 'none', zoneId: 'flower', status,
    plantCategory: 'flower', position: { x: 50, y: 50 }, overviewPosition: { x: 50, y: 50 },
    logs: [], milestones: [], outcomes: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('game/world', () => {
  it('buildWorldLayout places own room at center and spreads others', () => {
    const layout = buildWorldLayout([OWN_ROOM_ID, 'a', 'b', 'c'])
    const own = layout.find((l) => l.roomId === OWN_ROOM_ID)!
    expect(own.x).toBe(0)
    expect(own.z).toBe(0)
    // 邻居不与中心重叠且彼此分离
    const others = layout.filter((l) => l.roomId !== OWN_ROOM_ID)
    for (const o of others) {
      expect(Math.hypot(o.x, o.z)).toBeGreaterThan(10)
    }
    const dists = others.map((o) => Math.hypot(o.x, o.z))
    expect(new Set(dists.map((d) => d.toFixed(2))).size).toBe(others.length)
  })

  it('local world provider returns own room + neighbors', async () => {
    const provider = createLocalWorldProvider([makeProject('p1')], '我')
    const rooms = await provider.listRooms()
    expect(rooms.some((r) => r.id === OWN_ROOM_ID && r.isOwn)).toBe(true)
    expect(rooms.length).toBeGreaterThan(1)
    const own = await provider.getRoom(OWN_ROOM_ID)
    expect(own?.projects.length).toBe(1)
    const neighbor = await provider.getRoom('neighbor-1')
    expect(neighbor?.isOwn).toBe(false)
  })
})

describe('game/agentBrain (local rules)', () => {
  function ctx(overrides: Partial<AgentDecisionContext> = {}): AgentDecisionContext {
    const state = assignProjectsToPlots(createFarmState('me', 0), [makeProject('p1')])
    return {
      ownerName: '我',
      plots: state.plots,
      projects: [makeProject('p1')],
      recentEvents: [],
      idleSeconds: 10,
      ...overrides,
    }
  }

  it('localDecision tends a needy (dry) crop first', () => {
    const c = ctx()
    // 强制让一块地缺水
    c.plots = c.plots.map((p) => (p.projectId ? { ...p, moisture: 0.1 } : p))
    const d = localDecision(c)
    expect(d.action).toBe('tendCrop')
    expect(d.targetId).toBe(c.plots.find((p) => p.projectId)!.id)
  })

  it('localDecision returns a valid closed-set action when nothing needs care', () => {
    const d = localDecision(ctx())
    expect(['idle', 'walk', 'gesture', 'speak', 'tendCrop', 'moveToProject', 'goToPortal']).toContain(d.action)
  })

  it('buildContextText includes plot ids and project titles for the LLM', () => {
    const text = buildContextText(ctx())
    expect(text).toContain('plot-')
    expect(text).toContain('项目p1')
    expect(text).toContain('portal-exit')
  })
})
