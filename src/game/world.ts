import type { ProjectSeed } from '../data/garden'
import { createMockProjects } from '../data/garden'

/**
 * 多房间世界：房间注册表 + 邻居数据 provider + 大地图布局。
 * 纯逻辑可单测；真实后端通过实现 WorldProvider 接口注入（local/mock/http）。
 */

export type RoomId = string

export type Room = {
  id: RoomId
  ownerName: string
  /** 房间主题色（用于大地图浮岛与传送门点缀）。 */
  accent: string
  /** 房间里的项目（作物）。 */
  projects: ProjectSeed[]
  /** 是否为当前用户自己的房间。 */
  isOwn: boolean
}

/** 邻居/世界数据来源。本地默认用 mock，未来接后端时换成 http 实现。 */
export interface WorldProvider {
  listRooms(): Promise<Room[]>
  getRoom(id: RoomId): Promise<Room | undefined>
}

export const OWN_ROOM_ID: RoomId = 'me'

/** 大地图浮岛布局（金角螺旋，避免重叠、自然散开）。 */
export type WorldIsland = { roomId: RoomId; x: number; y: number; z: number; angle: number }

export function buildWorldLayout(roomIds: RoomId[]): WorldIsland[] {
  const golden = Math.PI * (3 - Math.sqrt(5)) // ~2.39996 rad
  return roomIds.map((roomId, i) => {
    // 自己的房间放中心，其余按金角螺旋排开。
    if (roomId === OWN_ROOM_ID) return { roomId, x: 0, y: 0, z: 0, angle: 0 }
    const n = Math.max(1, i) // 从 1 开始，避免与中心重叠
    const radius = 26 * Math.sqrt(n)
    const angle = n * golden
    return {
      roomId,
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
      angle,
    }
  })
}

/** 本地 mock provider：自己的房间用真实项目，邻居房间用确定性 mock 数据。 */
export function createLocalWorldProvider(ownProjects: ProjectSeed[], ownName = '我'): WorldProvider {
  const neighbors: Room[] = buildMockNeighbors()
  return {
    async listRooms() {
      return [{ id: OWN_ROOM_ID, ownerName: ownName, accent: '#7be3a0', projects: ownProjects, isOwn: true }, ...neighbors]
    },
    async getRoom(id: RoomId) {
      if (id === OWN_ROOM_ID) {
        return { id: OWN_ROOM_ID, ownerName: ownName, accent: '#7be3a0', projects: ownProjects, isOwn: true }
      }
      return neighbors.find((r) => r.id === id)
    },
  }
}

function buildMockNeighbors(): Room[] {
  const accents = ['#e3a97b', '#7bb0e3', '#c97be3', '#e37b8f', '#8fe37b']
  const names = ['晓枫', '阿澈', '柚子', '老白', '青柠']
  return names.map((ownerName, i) => ({
    id: `neighbor-${i + 1}`,
    ownerName,
    accent: accents[i % accents.length],
    projects: createMockProjects().slice(0, 3 + (i % 3)),
    isOwn: false,
  }))
}
