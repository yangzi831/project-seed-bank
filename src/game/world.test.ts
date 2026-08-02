import { describe, expect, it } from 'vitest'
import type { Room } from './world'
import { buildWorldLayout, countClues, countLitTonight, countPartnerManors, deriveManorMeta, isTodayActive, zoneImageForRoom } from './world'
import type { ProjectSeed } from '../data/garden'

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'test-room',
    ownerName: '测试',
    accent: '#7be3a0',
    projects: [],
    isOwn: false,
    ...overrides,
  }
}

function makeProject(overrides: Partial<ProjectSeed> = {}): ProjectSeed {
  return {
    id: 'p1',
    title: '测试项目',
    description: '',
    tags: [],
    priority: 'none',
    zoneId: 'flower',
    status: 'growing',
    plantCategory: 'green',
    position: { x: 50, y: 50 },
    overviewPosition: { x: 50, y: 50 },
    logs: [],
    milestones: [],
    outcomes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildWorldLayout', () => {
  it('自己房间放中心', () => {
    const layout = buildWorldLayout(['me', 'neighbor-1', 'neighbor-2'])
    expect(layout[0]).toMatchObject({ roomId: 'me', x: 0, z: 0 })
  })

  it('所有 roomId 唯一', () => {
    const ids = ['me', 'n1', 'n2', 'n3', 'n4', 'n5']
    const layout = buildWorldLayout(ids)
    const roomIds = layout.map((l) => l.roomId)
    expect(new Set(roomIds).size).toBe(ids.length)
  })
})

describe('zoneImageForRoom', () => {
  it('自己的房间 → overview.png', () => {
    const room = makeRoom({ isOwn: true })
    expect(zoneImageForRoom(room)).toBe('/images/garden/overview.png')
  })

  it('邻居按首个项目 zoneId 映射', () => {
    const room = makeRoom({ projects: [makeProject({ zoneId: 'water' })] })
    expect(zoneImageForRoom(room)).toBe('/images/garden/zone-water.png')
  })

  it('无项目 → fallback overview.png', () => {
    const room = makeRoom({ projects: [] })
    expect(zoneImageForRoom(room)).toBe('/images/garden/overview.png')
  })

  it('各 zoneId 映射正确', () => {
    const zones = ['flower', 'water', 'exhibition', 'woodland', 'experiment'] as const
    for (const zoneId of zones) {
      const room = makeRoom({ projects: [makeProject({ zoneId })] })
      expect(zoneImageForRoom(room)).toBe(`/images/garden/zone-${zoneId}.png`)
    }
  })
})

describe('deriveManorMeta', () => {
  it('自己的星球半径更大', () => {
    const own = makeRoom({ isOwn: true, projects: [makeProject()] })
    const neighbor = makeRoom({ isOwn: false, projects: [makeProject()] })
    expect(deriveManorMeta(own).radius).toBeGreaterThan(deriveManorMeta(neighbor).radius)
  })

  it('有 mature 项目 → hasClue = true', () => {
    const room = makeRoom({ projects: [makeProject({ status: 'mature' })] })
    expect(deriveManorMeta(room).hasClue).toBe(true)
  })

  it('有 harvested 项目 → hasClue = true', () => {
    const room = makeRoom({ projects: [makeProject({ status: 'harvested' })] })
    expect(deriveManorMeta(room).hasClue).toBe(true)
  })

  it('全 growing 项目 → hasClue = false', () => {
    const room = makeRoom({ projects: [makeProject({ status: 'growing' })] })
    expect(deriveManorMeta(room).hasClue).toBe(false)
  })

  it('imagePath 与 zoneImageForRoom 一致', () => {
    const room = makeRoom({ projects: [makeProject({ zoneId: 'woodland' })] })
    expect(deriveManorMeta(room).imagePath).toBe(zoneImageForRoom(room))
  })
})

describe('isTodayActive', () => {
  it('今天更新的项目 → litTonight = true', () => {
    const room = makeRoom({ projects: [makeProject({ updatedAt: new Date().toISOString() })] })
    expect(isTodayActive(room)).toBe(true)
  })

  it('昨天更新的项目 → litTonight = false', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const room = makeRoom({ projects: [makeProject({ updatedAt: yesterday })] })
    expect(isTodayActive(room)).toBe(false)
  })
})

describe('countPartnerManors', () => {
  it('计算不含自己的庄园数', () => {
    const rooms = [makeRoom({ isOwn: true }), makeRoom({ isOwn: false, id: 'n1' }), makeRoom({ isOwn: false, id: 'n2' })]
    expect(countPartnerManors(rooms)).toBe(2)
  })

  it('只有自己时返回 0', () => {
    expect(countPartnerManors([makeRoom({ isOwn: true })])).toBe(0)
  })
})

describe('countClues', () => {
  it('有 mature 项目的庄园计入', () => {
    const rooms = [makeRoom({ isOwn: true, projects: [makeProject({ status: 'mature' })] }), makeRoom({ isOwn: false, id: 'n1', projects: [makeProject({ status: 'growing' })] })]
    expect(countClues(rooms)).toBe(1)
  })
})

describe('countLitTonight', () => {
  it('今天更新的庄园计入', () => {
    const rooms = [makeRoom({ isOwn: true, projects: [makeProject({ updatedAt: new Date().toISOString() })] }), makeRoom({ isOwn: false, id: 'n1', projects: [] })]
    expect(countLitTonight(rooms)).toBe(1)
  })
})