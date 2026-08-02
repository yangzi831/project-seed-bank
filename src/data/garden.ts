import { plantLibrary } from './plantLibrary'

export type ProjectStatus = 'growing' | 'mature' | 'dormant' | 'harvested'

export type LegacyProjectStatus = ProjectStatus | 'sprout'

export type PlantCategory = 'flower' | 'green' | 'tree' | 'uncategorized'

export type OutcomeType = 'link' | 'text' | 'image' | 'file'

export type ZoneKey = 'flower' | 'water' | 'exhibition' | 'woodland' | 'experiment'

export type Priority = 'low' | 'medium' | 'high' | 'none'

export type Zone = {
  id: ZoneKey
  defaultName: string
  displayName: string
  subtitle: string
  description: string
  image: string
  position: {
    left: number
    top: number
    width: number
    height: number
  }
}

export type GrowthLog = {
  id: string
  text: string
  createdAt: string
  author: 'user' | 'ai'
  mood?: 'stuck' | 'progressing' | 'excited'
  progressPercent?: number
}

export type Milestone = {
  id: string
  text: string
  completed: boolean
  createdAt: string
  updatedAt?: string
}

export type AISummary = {
  summary: string
  obstacles: string[]
  nextSteps: string[]
  logHash: string
  updatedAt: string
  version: number
}

export type Outcome = {
  id: string
  title: string
  type: OutcomeType
  value: string
  createdAt: string
}

export type ProjectSeed = {
  id: string
  title: string
  description: string
  goal?: string
  tags: string[]
  priority: Priority
  zoneId: ZoneKey
  status: ProjectStatus
  previousStatus?: Exclude<ProjectStatus, 'dormant'>
  plantCategory: PlantCategory
  plantVariant?: string
  position: {
    x: number
    y: number
  }
  overviewPosition: {
    x: number
    y: number
  }
  overviewPositionManual?: boolean
  logs: GrowthLog[]
  milestones: Milestone[]
  outcomes: Outcome[]
  aiSummary?: AISummary
  createdAt: string
  updatedAt: string
  /** 标记项目来源：'demo' = 演示预置，'user' = 用户创建 */
  seedOrigin?: 'demo' | 'user'
  /** 用户是否曾修改该项目（创建/编辑/移动/写日志/加成果均触发） */
  userModified?: boolean
}

export type GardenState = {
  schemaVersion: number
  zones: Zone[]
  projects: ProjectSeed[]
  demoDataVersion?: string
}

export const DEMO_DATA_VERSION = 'demo-projects-v2-realistic-names'
export const SCHEMA_VERSION = 3

export const plantCategoryMeta: Record<PlantCategory, { label: string; tone: string }> = {
  flower: { label: '花', tone: 'rose' },
  green: { label: '绿植', tone: 'mint' },
  tree: { label: '树', tone: 'gold' },
  uncategorized: { label: '不确定', tone: 'cyan' },
}

export const plantCategories: PlantCategory[] = ['flower', 'green', 'tree', 'uncategorized']

export const statusMeta: Record<ProjectStatus, { label: string; tone: string }> = {
  growing: { label: '生长中', tone: 'cyan' },
  mature: { label: '长成', tone: 'gold' },
  dormant: { label: '休眠', tone: 'violet' },
  harvested: { label: '已收获', tone: 'rose' },
}

export const statusOrder: ProjectStatus[] = ['growing', 'mature', 'dormant', 'harvested']

export const growthAdvanceOrder: ProjectStatus[] = ['growing', 'mature', 'harvested']

export const defaultZones: Zone[] = [
  {
    id: 'flower',
    defaultName: 'Garden 01',
    displayName: 'Garden 01',
    subtitle: '花园区',
    description: '适合安放细腻、审美驱动、需要持续照料的项目种子。',
    image: '/images/garden/zone-flower.png',
    position: { left: 9, top: 25, width: 24, height: 34 },
  },
  {
    id: 'water',
    defaultName: 'Garden 02',
    displayName: 'Garden 02',
    subtitle: '水镜区',
    description: '适合安放反思、记录、流动性探索和长期沉淀的项目。',
    image: '/images/garden/zone-water.png',
    position: { left: 36, top: 15, width: 25, height: 31 },
  },
  {
    id: 'exhibition',
    defaultName: 'Garden 03',
    displayName: 'Garden 03',
    subtitle: '展园区',
    description: '适合安放正在成形、值得展示和打磨表达方式的项目。',
    image: '/images/garden/zone-exhibition.png',
    position: { left: 64, top: 22, width: 25, height: 34 },
  },
  {
    id: 'woodland',
    defaultName: 'Garden 04',
    displayName: 'Garden 04',
    subtitle: '林地区',
    description: '适合安放需要自然扩张、积累素材和形成系统的项目。',
    image: '/images/garden/zone-woodland.png',
    position: { left: 16, top: 61, width: 34, height: 28 },
  },
  {
    id: 'experiment',
    defaultName: 'Garden 05',
    displayName: 'Garden 05',
    subtitle: '实验区',
    description: '适合安放不确定、快速试验、允许失败和变异的项目。',
    image: '/images/garden/zone-experiment.png',
    position: { left: 53, top: 58, width: 33, height: 29 },
  },
]

const storageKey = 'project-seed-bank:v2'
const legacyStorageKeys = ['project-seed-bank:v3', 'project-seed-bank:v1']

export function loadGardenState(): GardenState {
  const fallback: GardenState = {
    schemaVersion: SCHEMA_VERSION,
    zones: defaultZones,
    projects: createMockProjects().map((p) => ({ ...p, seedOrigin: 'demo' as const, userModified: false })),
    demoDataVersion: DEMO_DATA_VERSION,
  }

  try {
    let raw = localStorage.getItem(storageKey)
    if (!raw) {
      for (const key of legacyStorageKeys) {
        raw = localStorage.getItem(key)
        if (raw) break
      }
    }
    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as Partial<GardenState> & { projects?: unknown[] }
    const shouldRefreshDemoProjects = parsed.demoDataVersion !== DEMO_DATA_VERSION

    let projects = (parsed.projects ?? []).map((project, index) =>
      normalizeProject(project, index),
    )

    // ADR-008: 演示数据保护 — 只更新可证明未修改的预置项目
    if (shouldRefreshDemoProjects) {
      const freshDemos = createMockProjects()
      const kept = projects.filter((p) => {
        // 保留用户创建的项目（非 demo 来源）
        if (p.seedOrigin !== 'demo') return true
        // 保留用户修改过的 demo 项目
        if (p.userModified) return true
        // 保留不在新 demo 列表中的旧 demo（无法判断来源 → 保留策略）
        return false
      })

      // 合并：保留的项目 + 新的 demo 项目
      const keptIds = new Set(kept.map((p) => p.id))
      const newDemos = freshDemos
        .filter((p) => !keptIds.has(p.id))
        .map((p) => ({ ...p, seedOrigin: 'demo' as const, userModified: false }))

      projects = [...kept, ...newDemos]
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      zones: defaultZones.map((zone) => {
        const saved = parsed.zones?.find((item) => item.id === zone.id)
        return { ...zone, ...saved, position: zone.position, image: zone.image }
      }),
      projects,
      demoDataVersion: DEMO_DATA_VERSION,
    }
  } catch {
    return fallback
  }
}

export function saveGardenState(state: GardenState) {
  localStorage.setItem(storageKey, JSON.stringify(state))
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createProjectSeed(input: {
  zoneId: ZoneKey
  title: string
  description: string
  plantCategory: PlantCategory
  status?: ProjectStatus
  plantVariant?: string
  goal?: string
  tags?: string[]
  priority?: Priority
}): ProjectSeed {
  const now = new Date().toISOString()

  return {
    id: createId('seed'),
    zoneId: input.zoneId,
    title: input.title,
    description: input.description,
    goal: input.goal,
    tags: input.tags ?? [],
    priority: input.priority ?? 'none',
    status: input.status ?? 'growing',
    plantCategory: input.plantCategory,
    plantVariant: input.plantVariant ?? getRandomPlantVariant(input.plantCategory),
    position: createPlantPosition(),
    overviewPosition: createOverviewPosition(input.zoneId),
    overviewPositionManual: false,
    createdAt: now,
    updatedAt: now,
    logs: [],
    milestones: [],
    outcomes: [],
    seedOrigin: 'user',
    userModified: true,
  }
}

export function createPlantPosition() {
  return {
    x: Math.round(15 + Math.random() * 70),
    y: Math.round(18 + Math.random() * 64),
  }
}

export function createOverviewPosition(zoneId: ZoneKey) {
  const range = overviewPositionRanges[zoneId]

  return {
    x: Math.round(range.x[0] + Math.random() * (range.x[1] - range.x[0])),
    y: Math.round(range.y[0] + Math.random() * (range.y[1] - range.y[0])),
  }
}

const overviewPositionRanges: Record<ZoneKey, { x: [number, number]; y: [number, number] }> = {
  flower: { x: [18, 42], y: [18, 42] },
  water: { x: [58, 86], y: [16, 42] },
  exhibition: { x: [42, 60], y: [42, 66] },
  woodland: { x: [66, 88], y: [52, 78] },
  experiment: { x: [16, 40], y: [54, 78] },
}

export function createMockProjects(): ProjectSeed[] {
  const samples: Array<{
    title: string
    description: string
    zoneId: ZoneKey
    plantCategory: PlantCategory
    status: ProjectStatus
  }> = [
    {
      title: 'AI 简历助手',
      description: '帮我整理岗位要求、改简历关键词，并记录每次投递反馈。',
      zoneId: 'water',
      plantCategory: 'green',
      status: 'growing',
    },
    {
      title: '作品集改版',
      description: '重新梳理项目叙事、页面结构和视觉风格，做一个更完整的作品集网站。',
      zoneId: 'exhibition',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '面试题复盘库',
      description: '把面试中被问到的问题、回答不足和下次改进整理成可复习卡片。',
      zoneId: 'water',
      plantCategory: 'green',
      status: 'mature',
    },
    {
      title: '英语表达训练',
      description: '围绕工作介绍、项目讲解和面试场景，每周练习一组表达。',
      zoneId: 'flower',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '旅行灵感地图',
      description: '收集想去的城市、展览、建筑和路线，做成一个可以慢慢扩展的地图。',
      zoneId: 'water',
      plantCategory: 'tree',
      status: 'mature',
    },
    {
      title: '周报整理器',
      description: '把一周的任务、会议和进展自动整理成可复制的周报草稿。',
      zoneId: 'experiment',
      plantCategory: 'green',
      status: 'mature',
    },
    {
      title: '知识库清理',
      description: '把散落在文档、截图和收藏里的资料重新分类，做成可检索的知识库。',
      zoneId: 'woodland',
      plantCategory: 'tree',
      status: 'dormant',
    },
    {
      title: '灵感收集盒',
      description: '把突然想到的点子、参考图和一句话灵感先存起来，之后再决定是否推进。',
      zoneId: 'flower',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '读书摘录卡',
      description: '把读书笔记整理成主题卡片，方便之后写文章或做分享。',
      zoneId: 'exhibition',
      plantCategory: 'green',
      status: 'mature',
    },
    {
      title: '播客摘要工具',
      description: '输入播客链接或文字稿，生成重点摘要、金句和可收藏的灵感卡片。',
      zoneId: 'experiment',
      plantCategory: 'green',
      status: 'growing',
    },
    {
      title: '观展记录页',
      description: '记录看过的展览、喜欢的作品和当时的感受，形成个人展览档案。',
      zoneId: 'exhibition',
      plantCategory: 'flower',
      status: 'harvested',
    },
    {
      title: '小红书选题池',
      description: '把想写的内容方向、标题草稿和发布反馈整理成长期选题库。',
      zoneId: 'flower',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '音色配方笔记',
      description: '记录合成器音色、效果链参数和适合使用的音乐场景。',
      zoneId: 'woodland',
      plantCategory: 'tree',
      status: 'mature',
    },
    {
      title: 'Ableton 生成器',
      description: '用自然语言生成鼓组、铺底、琶音和段落结构的编曲草稿。',
      zoneId: 'experiment',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '练琴恢复计划',
      description: '把练习目标拆成小任务，记录每天练了什么和下一次要补哪里。',
      zoneId: 'flower',
      plantCategory: 'green',
      status: 'growing',
    },
    {
      title: '开销观察表',
      description: '把日常消费按类别整理，找出哪些钱花得值得、哪些可以减少。',
      zoneId: 'water',
      plantCategory: 'green',
      status: 'dormant',
    },
    {
      title: '个人主页改版',
      description: '先不做复杂网站，只做一个能清楚介绍自己的单页主页。',
      zoneId: 'exhibition',
      plantCategory: 'flower',
      status: 'mature',
    },
    {
      title: '展览导览 Agent',
      description: '输入展览资料后，生成适合朋友参观的轻量导览路线和讲解文本。',
      zoneId: 'experiment',
      plantCategory: 'tree',
      status: 'growing',
    },
    {
      title: '截图归档器',
      description: '把截图里的文字、来源和主题自动整理，减少资料越存越乱的问题。',
      zoneId: 'woodland',
      plantCategory: 'green',
      status: 'mature',
    },
    {
      title: '习惯可视化',
      description: '把睡眠、阅读、运动或练习记录转成更有美感的长期变化图。',
      zoneId: 'water',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '备餐清单',
      description: '根据一周时间、预算和口味偏好生成简单可执行的备餐计划。',
      zoneId: 'flower',
      plantCategory: 'green',
      status: 'dormant',
    },
    {
      title: '邮件草稿助手',
      description: '把要表达的意思变成更清楚、有边界感、适合发送的邮件草稿。',
      zoneId: 'experiment',
      plantCategory: 'flower',
      status: 'mature',
    },
    {
      title: '复盘模板库',
      description: '为黑客松、作品集和工作项目准备一套可复用的复盘问题模板。',
      zoneId: 'exhibition',
      plantCategory: 'tree',
      status: 'harvested',
    },
    {
      title: '收藏链接站',
      description: '把浏览器收藏、文章链接和工具网址整理成一个可搜索的小站。',
      zoneId: 'woodland',
      plantCategory: 'tree',
      status: 'harvested',
    },
    {
      title: '会议纪要器',
      description: '把会议录音或随手记的要点整理成行动项、负责人和截止时间。',
      zoneId: 'water',
      plantCategory: 'green',
      status: 'mature',
    },
    {
      title: '视觉参考图谱',
      description: '按色彩、构图、字体和氛围整理设计参考，方便做项目时快速调用。',
      zoneId: 'woodland',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '自我介绍卡',
      description: '准备不同场景下的自我介绍版本，比如面试、组队、分享和社交场合。',
      zoneId: 'flower',
      plantCategory: 'flower',
      status: 'mature',
    },
    {
      title: '文件搜索助手',
      description: '尝试做一个能帮我快速找到旧资料、旧图片和旧项目文件的小工具。',
      zoneId: 'experiment',
      plantCategory: 'tree',
      status: 'dormant',
    },
    {
      title: '作品发布计划',
      description: '把一个项目从草稿、截图、文案到发布渠道拆成可执行步骤。',
      zoneId: 'exhibition',
      plantCategory: 'green',
      status: 'mature',
    },
    {
      title: '情绪能量记录',
      description: '用很轻量的方式记录每天状态，观察什么事情会消耗或恢复能量。',
      zoneId: 'water',
      plantCategory: 'flower',
      status: 'growing',
    },
    {
      title: '组件素材库',
      description: '沉淀常用卡片、按钮、弹窗和大屏组件，减少下次重复设计。',
      zoneId: 'woodland',
      plantCategory: 'tree',
      status: 'harvested',
    },
    {
      title: '黑客松提案',
      description: '把几个想法快速写成问题、用户、功能和 demo 路线，筛出最值得做的。',
      zoneId: 'experiment',
      plantCategory: 'flower',
      status: 'growing',
    },
  ]

  return samples.map((sample, index) => {
    const project = createProjectSeed(sample)
    return {
      ...project,
      seedOrigin: 'demo' as const,
      userModified: false,
      logs:
        index % 2 === 0
          ? [
              {
                id: createId('log'),
                text: '建立了第一版方向，先保留一个可继续观察的切入点。',
                createdAt: project.createdAt,
                author: 'user',
              },
            ]
          : [],
      outcomes:
        index % 3 === 0
          ? [
              {
                id: createId('outcome'),
                title: '初始成果占位',
                type: 'text',
                value: '这里会记录未来的外部链接、文字成果、图片链接或文件路径。',
                createdAt: project.createdAt,
              },
            ]
          : [],
    }
  })
}

export function getPlantAssetPath(project: ProjectSeed) {
  if (!project.plantVariant) {
    return undefined
  }

  const plant = plantLibrary.find((item) => item.id === project.plantVariant)
  if (!plant) {
    const fallbackStage = project.status === 'mature' || project.status === 'harvested' ? 'mature' : 'growing'
    return `/images/plants/library/${project.plantVariant}-${fallbackStage}.png`
  }

  const visualStatus = getVisualPlantStatus(project)
  return visualStatus === 'mature' ? plant.mature : plant.growing
}

export function getVisualPlantStatus(project: Pick<ProjectSeed, 'status' | 'previousStatus'>) {
  if (project.status === 'harvested') {
    return 'mature'
  }

  if (project.status === 'dormant') {
    return project.previousStatus === 'mature' || project.previousStatus === 'harvested' ? 'mature' : 'growing'
  }

  return project.status
}

export function getRandomPlantVariant(category: PlantCategory) {
  const categoryMatches = plantLibrary.filter((plant) => plant.category === category)
  const pool = categoryMatches.length ? categoryMatches : plantLibrary
  if (!pool.length) {
    return undefined
  }

  return pool[Math.floor(Math.random() * pool.length)].id
}

export function getZoneCounts(projects: ProjectSeed[], zoneId: ZoneKey) {
  const zoneProjects = projects.filter((project) => project.zoneId === zoneId)
  return {
    total: zoneProjects.length,
    growing: zoneProjects.filter((project) => project.status === 'growing').length,
    mature: zoneProjects.filter((project) => project.status === 'mature').length,
    dormant: zoneProjects.filter((project) => project.status === 'dormant').length,
    harvested: zoneProjects.filter((project) => project.status === 'harvested').length,
  }
}

function normalizeProject(rawProject: unknown, index: number): ProjectSeed {
  const project = rawProject as Partial<ProjectSeed> & {
    name?: string
    links?: Array<{ id?: string; label?: string; url?: string }>
  }
  const now = new Date().toISOString()

  const normalizedLogs: GrowthLog[] =
    project.logs?.map((log) => ({
      ...log,
      author: log.author ?? 'user',
    })) ?? []

  return {
    id: project.id ?? createId('seed'),
    title: project.title ?? project.name ?? 'Untitled seed',
    description: project.description ?? '',
    goal: project.goal,
    tags: project.tags ?? [],
    priority: project.priority ?? 'none',
    zoneId: isZoneKey(project.zoneId) ? project.zoneId : defaultZones[index % defaultZones.length].id,
    status: normalizeStatus(project.status),
    previousStatus: normalizePreviousStatus((project as { previousStatus?: unknown }).previousStatus),
    plantCategory: normalizePlantCategory(project.plantCategory ?? plantCategories[index % plantCategories.length]),
    plantVariant: project.plantVariant ?? getRandomPlantVariant(normalizePlantCategory(project.plantCategory)),
    position: project.position ?? createPlantPosition(),
    overviewPosition: project.overviewPosition ?? createOverviewPosition(isZoneKey(project.zoneId) ? project.zoneId : defaultZones[index % defaultZones.length].id),
    overviewPositionManual: project.overviewPositionManual ?? false,
    logs: normalizedLogs,
    milestones: project.milestones ?? [],
    outcomes:
      project.outcomes ??
      (project.links ?? []).map((link) => ({
        id: link.id ?? createId('outcome'),
        title: link.label ?? 'Outcome',
        type: 'link' as const,
        value: link.url ?? '',
        createdAt: now,
      })),
    aiSummary: project.aiSummary,
    seedOrigin: project.seedOrigin ?? undefined,
    userModified: project.userModified ?? false,
    createdAt: project.createdAt ?? now,
    updatedAt: project.updatedAt ?? now,
  }
}

function isZoneKey(value: unknown): value is ZoneKey {
  return defaultZones.some((zone) => zone.id === value)
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return statusOrder.includes(value as ProjectStatus)
}

export function normalizeStatus(value: unknown): ProjectStatus {
  if (value === 'sprout') {
    return 'growing'
  }

  return isProjectStatus(value) ? value : 'growing'
}

function normalizePreviousStatus(value: unknown): ProjectSeed['previousStatus'] {
  if (value === 'growing' || value === 'mature' || value === 'harvested') {
    return value
  }

  return undefined
}

function isPlantCategory(value: unknown): value is PlantCategory {
  return plantCategories.includes(value as PlantCategory)
}

function normalizePlantCategory(value: unknown): PlantCategory {
  if (value === 'unknown') {
    return 'uncategorized'
  }

  return isPlantCategory(value) ? value : 'uncategorized'
}
