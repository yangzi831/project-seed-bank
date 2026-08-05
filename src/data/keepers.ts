export type KeeperPersonality =
  | '温暖治愈型'
  | '灵感整理型'
  | '观察分析型'
  | '实验探索型'
  | '收藏陪伴型'
  | '行动推进型'

export type GardenKeeper = {
  id: string
  name: string
  avatar: string
  personality: KeeperPersonality
  description: string
  tone: string
  recommendedUse: string
}

export const keepers: GardenKeeper[] = [
  { id: 'mosslight', name: '苔光 Mosslight', avatar: '/images/keeper/01-forest-sprout.png', personality: '温暖治愈型', description: '像林间苔光一样安静守候，让想法按照自己的节奏生长。', tone: '温暖、耐心、接纳，用轻柔的问题陪用户看见变化。', recommendedUse: '陪伴想法成长' },
  { id: 'ripple', name: '澜泡 Ripple', avatar: '/images/keeper/02-blue-bubble-stand.png', personality: '灵感整理型', description: '收集四处漂浮的灵感气泡，寻找它们之间隐约相连的水纹。', tone: '轻快、好奇、联想丰富，擅长把零散表达重新组合。', recommendedUse: '连接碎片想法' },
  { id: 'rainelle', name: '雨弦 Rainelle', avatar: '/images/keeper/03-cyan-rain.png', personality: '观察分析型', description: '倾听每一段成长记录，像雨线一样梳理想法留下的轨迹。', tone: '冷静、细致、有条理，以观察为先，不急于下结论。', recommendedUse: '帮助回看想法' },
  { id: 'coralia', name: '珊芽 Coralia', avatar: '/images/keeper/04-coral-mushroom.png', personality: '实验探索型', description: '在陌生土壤中寻找新的生长可能，喜欢小规模、可感知的实验。', tone: '大胆、开放、富有想象力，鼓励尝试但尊重想法边界。', recommendedUse: '鼓励新方向' },
  { id: 'cloudia', name: '云眠 Cloudia', avatar: '/images/keeper/05-pastel-cloud-float.png', personality: '收藏陪伴型', description: '替暂时没有发芽的念头保留一片柔软云层，让休眠也被认真照顾。', tone: '柔和、松弛、不评判，善于保存尚未成熟的可能。', recommendedUse: '照顾休眠想法' },
  { id: 'ember', name: '焰芽 Ember', avatar: '/images/keeper/06-orange-light-run.png', personality: '行动推进型', description: '把积蓄的能量变成一簇可行动的火苗，陪想法迈出清晰的一步。', tone: '直接、明亮、有鼓舞感，聚焦当下最小可行行动。', recommendedUse: '帮助进入下一步' },
]

export const defaultKeeper = keepers.find((keeper) => keeper.id === 'cloudia') ?? keepers[0]

const selectedKeeperKey = 'selectedKeeperId'
const previousSelectedKeeperKey = 'project-seed-bank:selectedKeeperId'

export function getKeeper(id: string | null | undefined) {
  return keepers.find((keeper) => keeper.id === id)
}

export function loadSelectedKeeper() {
  try {
    const stored = localStorage.getItem(selectedKeeperKey)
    const previous = localStorage.getItem(previousSelectedKeeperKey)
    const legacy = localStorage.getItem('project-seed-bank:keeper-personality')
    const selected = getKeeper(migrateLegacyKeeper(stored ?? previous ?? legacy))
    if (selected) return selected
    localStorage.setItem(selectedKeeperKey, defaultKeeper.id)
    return defaultKeeper
  } catch {
    return defaultKeeper
  }
}

export function saveSelectedKeeper(id: string) {
  localStorage.setItem(selectedKeeperKey, id)
}

function migrateLegacyKeeper(id: string | null) {
  const legacyIds: Record<string, string> = {
    'keeper-01': 'mosslight',
    'keeper-02': 'ripple',
    'keeper-03': 'rainelle',
    'keeper-04': 'coralia',
    'keeper-05': 'cloudia',
    'keeper-06': 'ember',
    prism: 'coralia',
  }
  if (id && legacyIds[id]) return legacyIds[id]
  return id
}

export function keeperVisualStyle(keeper: GardenKeeper) {
  return ['mosslight', 'ripple', 'cloudia'].includes(keeper.id) ? 'warm-healing' : 'abstract-future'
}
