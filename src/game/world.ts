import type { ProjectSeed } from '../data/garden'
import { createMockProjects, defaultZones } from '../data/garden'

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

// ---- 庄园星图：星球元数据 ---- //

/** 庄园星球元数据（纯函数，可单测）。 */
export type ManorMeta = {
  /** 星球半径：自己的大、邻居略小。 */
  radius: number
  /** 对应花园贴图路径（zone-*.png 或 overview.png）。 */
  imagePath: string
  /** 是否有机密线索（有 mature/harvested 项目的庄园）。 */
  hasClue: boolean
  /** 今晚是否亮起（updatedAt 为今天的项目数 > 0）。 */
  litTonight: boolean
}

/** 根据房间首个项目 zoneId 映射到对应的花园贴图路径。
 *  自己的房间用 overview.png；邻居按首个项目 zoneId 映射；
 *  无项目则 fallback 到 overview.png。 */
export function zoneImageForRoom(room: Room): string {
  if (room.isOwn) return '/images/garden/overview.png'
  const firstProject = room.projects[0]
  if (!firstProject) return '/images/garden/overview.png'
  const zoneId = firstProject.zoneId
  const zone = defaultZones.find((z) => z.id === zoneId)
  if (zone) return zone.image
  return '/images/garden/overview.png'
}

/** 推导庄园星球元数据。 */
export function deriveManorMeta(room: Room): ManorMeta {
  const isOwn = room.isOwn
  return {
    radius: isOwn ? 3.5 : 2.5 + (room.projects.length > 5 ? 0.5 : 0),
    imagePath: zoneImageForRoom(room),
    hasClue: room.projects.some((p) => p.status === 'mature' || p.status === 'harvested'),
    litTonight: isTodayActive(room),
  }
}

/** 庄园是否有今天更新的项目。 */
export function isTodayActive(room: Room): boolean {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10) // YYYY-MM-DD
  return room.projects.some((p) => {
    const updated = p.updatedAt.slice(0, 10)
    return updated === todayStr
  })
}

/** 计算伙伴庄园数（不含自己）。 */
export function countPartnerManors(rooms: Room[]): number {
  return rooms.filter((r) => !r.isOwn).length
}

/** 计算线索数（有 mature 或 harvested 项目的庄园数）。 */
export function countClues(rooms: Room[]): number {
  return rooms.filter((r) => r.projects.some((p) => p.status === 'mature' || p.status === 'harvested')).length
}

/** 计算今晚亮起的庄园数。 */
export function countLitTonight(rooms: Room[]): number {
  return rooms.filter((r) => isTodayActive(r)).length
}
