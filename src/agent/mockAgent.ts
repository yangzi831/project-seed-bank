import type { AgentRequest, AgentSeedDraft, AgentSuggestion, GardenKeeperAgent, ProjectAgentContext } from './types'

const scenarioMeta = {
  'seed-discovery': { eyebrow: 'Seed Discovery', title: '让这颗种子有一个可以开始的形状' },
  'growth-companion': { eyebrow: 'Growth Companion', title: '读一读最近的生长轨迹' },
  'harvest-assistant': { eyebrow: 'Creation Companion', title: '整理这颗想法已经形成的内容' },
} as const

export const mockGardenKeeperAgent: GardenKeeperAgent = {
  async request(request) {
    await new Promise((resolve) => window.setTimeout(resolve, 520))

    return {
      requestId: createMockId('request'),
      suggestion: buildMockSuggestion(request),
      source: 'mock',
    }
  },
}

function buildMockSuggestion(request: AgentRequest): AgentSuggestion {
  const { context, scenario, message } = request
  const meta = scenarioMeta[scenario]
  if (context.kind === 'garden' && scenario === 'growth-companion') {
    const growing = context.projects.filter((project) => project.status === 'growing').length
    const dormant = context.projects.filter((project) => project.status === 'dormant').length
    return suggestion(
      meta,
      scenario,
      [`花园中共有 ${context.projects.length} 颗想法。`, `${growing} 颗正在生长，${dormant} 颗正在休眠。`],
      gardenObservation(context.projects.length, growing, dormant),
      undefined,
    )
  }
  const project = getProjectContext(context, message)
  const latestLog = project.logs[0]?.text
  const createdDate = new Date(project.createdAt).toLocaleDateString('zh-CN')
  const updatedDate = new Date(project.updatedAt).toLocaleDateString('zh-CN')
  const userSignal = message.trim() ? `你特别提到“${shorten(message, 34)}”，可以把它作为这次整理的中心。` : ''

  if (scenario === 'seed-discovery') {
    return suggestion(meta, scenario, [
      `先把目标收窄为：用一次小实验验证「${project.title}」最重要的价值。`,
      `第一步只关注一个可以感受到的变化；目前已有 ${project.outcomes.length} 条成果记录，可以从最轻量的形式开始。`,
      '给这颗种子设一个观察信号：当它出现时，你希望自己或别人感受到什么变化？',
    ], `${project.title} 是一颗从“${shorten(project.description || '还没有写下故事', 58)}”出发的想法。${userSignal}`, undefined, createMockSeedDraft(project, message))
  }

  if (scenario === 'growth-companion') {
    return suggestion(meta, scenario, [
      latestLog ? `最近的生长信号是：“${shorten(latestLog, 64)}”` : '目前还没有成长记录，先写下最近发生的一个微小变化。',
      `这颗想法现在处于「${statusLabel(project.status)}」，已有 ${project.logs.length} 条成长记录和 ${project.outcomes.length} 项成果记录。`,
      '下一步建议：选择一个 30 分钟内可以开始的生长行动，并在行动后记录“发生了什么”和“学到了什么”。',
    ], `从现有记录看，这颗想法仍在形成自己的节奏。档案最近更新于 ${updatedDate}。${userSignal}`, undefined)
  }

  const portfolioDraft = `《${project.title}》始于 ${createdDate}，关注${project.description ? `“${project.description}”` : '一个仍在生长的个人命题'}。在持续记录与探索中，我让零散想法逐渐形成可见表达，并记录下 ${project.outcomes.length} 项已经形成的内容。`

  return suggestion(meta, scenario, [
    '介绍结构可以依次讲：为什么开始、如何探索、产生了什么、接下来会怎样。',
    `从 ${project.logs.length} 条成长记录中挑选一个转折点，让故事呈现真实变化。`,
    project.outcomes.length ? `选择最能代表这颗想法的 1 项作品或内容作为表达入口。` : '先补充一项成果记录，再把它整理成作品表达。',
  ], `我先根据当前档案整理了一版温和、简洁的作品集描述。${userSignal}`, portfolioDraft)
}

function gardenObservation(total: number, growing: number, dormant: number) {
  if (!total) return '土壤已经准备好了。第一颗种子不必完整，只需要有一个你愿意继续靠近的问题。'
  if (dormant > growing) return '最近花园更安静了一些。休眠不是停滞，也许可以挑一株仍让你在意的植物，写下一句近况。'
  if (growing >= Math.max(3, total / 2)) return '许多植物正在同时生长。与其为每一株浇水，不如为今天最有生命力的一株留出一小段专注时间。'
  return '花园正在形成自己的节奏。有些植物向外伸展，有些在地下积蓄；最近的记录会告诉你该靠近哪一株。'
}

function suggestion(
  meta: { eyebrow: string; title: string },
  scenario: AgentRequest['scenario'],
  points: string[],
  summary: string,
  draft: string | undefined,
  seedDraft?: AgentSeedDraft,
): AgentSuggestion {
  return {
    id: createMockId('suggestion'),
    scenario,
    eyebrow: meta.eyebrow,
    title: meta.title,
    summary,
    points,
    draft,
    seedDraft,
    createdAt: new Date().toISOString(),
  }
}

function statusLabel(status: ProjectAgentContext['status']) {
  return { growing: '成长中', mature: '形成中', dormant: '休眠中', harvested: '已形成' }[status]
}

function getProjectContext(context: AgentRequest['context'], message: string): ProjectAgentContext {
  if (context.kind === 'project') return context

  const now = new Date().toISOString()
  return {
    kind: 'project',
    projectId: 'new-seed',
    title: shorten(message.trim() || '新的想法', 15),
    description: message.trim(),
    status: 'growing',
    logs: [],
    outcomes: [],
    createdAt: now,
    updatedAt: now,
  }
}

function createMockSeedDraft(project: ProjectAgentContext, message: string): AgentSeedDraft {
  return {
    title: shorten(project.title || message || '新的想法', 15),
    description: project.description || message,
    zoneId: 'experiment',
    plantCategory: 'uncategorized',
    goal: `验证「${shorten(project.title, 24)}」是否值得继续生长`,
    tags: ['待探索'],
    firstMilestone: '做一次最小可见实验',
  }
}

function shorten(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}…` : value
}

function createMockId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
