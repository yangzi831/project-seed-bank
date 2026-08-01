export type GardenKeeperPersonality = {
  id: string
  name: string
  avatar: {
    idle: string
    active: string
  }
  style: 'warm-healing' | 'abstract-future'
  description: string
  tone: string
}

export const gardenKeeperPersonalities: GardenKeeperPersonality[] = [
  {
    id: 'mosslight',
    name: '苔光 Taiguang',
    avatar: {
      idle: '/images/keeper/taiguang-idle.png',
      active: '/images/keeper/taiguang-active.png',
    },
    style: 'warm-healing',
    description: '像清晨的苔藓和薄雾，记得每一株植物缓慢但真实的变化。',
    tone: '温暖、安静、接纳，不催促结果。',
  },
  {
    id: 'prism',
    name: '棱镜 Prism',
    avatar: {
      idle: '/images/keeper/prism-idle.png',
      active: '/images/keeper/prism-active.png',
    },
    style: 'abstract-future',
    description: '生活在花园信号之间，从状态、时间与关联中辨认尚未成形的方向。',
    tone: '克制、抽象、未来感，善于提出新的观看角度。',
  },
]

const keeperPersonalityKey = 'project-seed-bank:keeper-personality'

export function getGardenKeeperPersonality(id: string | null | undefined) {
  return gardenKeeperPersonalities.find((personality) => personality.id === id) ?? gardenKeeperPersonalities[0]
}

export function loadGardenKeeperPersonality() {
  try {
    return getGardenKeeperPersonality(localStorage.getItem(keeperPersonalityKey))
  } catch {
    return gardenKeeperPersonalities[0]
  }
}

export function saveGardenKeeperPersonality(id: string) {
  localStorage.setItem(keeperPersonalityKey, id)
}
