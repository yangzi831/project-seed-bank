import type { GardenState, ProjectSeed } from '../../data/garden'
import { statusMeta } from '../../data/garden'

export function buildProjectContext(project: ProjectSeed): string {
  const lines: string[] = []

  lines.push(`项目标题：${project.title}`)
  lines.push(`项目状态：${statusMeta[project.status].label}`)
  if (project.goal) lines.push(`项目目标：${project.goal}`)
  if (project.description) lines.push(`项目描述：${project.description}`)
  if (project.tags.length > 0) lines.push(`标签：${project.tags.join('、')}`)

  if (project.milestones.length > 0) {
    lines.push('里程碑：')
    project.milestones.forEach((m) => {
      lines.push(`- [${m.completed ? 'x' : ' '}] ${m.text}`)
    })
  }

  if (project.logs.length > 0) {
    const recentLogs = project.logs.slice(0, 20)
    lines.push('最近成长日志：')
    recentLogs.forEach((log) => {
      lines.push(`- ${log.text}`)
    })
  }

  if (project.outcomes.length > 0) {
    lines.push('已记录成果：')
    project.outcomes.slice(0, 10).forEach((outcome) => {
      lines.push(`- ${outcome.title}: ${outcome.value}`)
    })
  }

  return lines.join('\n')
}

export function buildGardenContext(state: GardenState): string {
  const lines: string[] = []

  lines.push(`花园中共有 ${state.projects.length} 个项目。`)

  state.zones.forEach((zone) => {
    const zoneProjects = state.projects.filter((p) => p.zoneId === zone.id)
    if (zoneProjects.length > 0) {
      lines.push(`\n区域「${zone.displayName}」：${zone.description}`)
      lines.push(`当前项目：${zoneProjects.map((p) => p.title).join('、')}`)
    }
  })

  return lines.join('\n')
}

export function estimateTokens(text: string): number {
  const chineseCount = (text.match(/[一-龥]/g) ?? []).length
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(chineseCount * 0.5 + wordCount)
}
