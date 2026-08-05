import { statusMeta } from '../data/garden'
import type { AgentContext } from './types'

export function buildAgentContextText(context: AgentContext) {
  if (context.kind === 'garden') {
    const projects = context.projects.map((project) => `- ${project.title} / ${statusMeta[project.status].label} / ${project.zoneId}`).join('\n')
    return [
      `当前园丁：${context.keeper.name}`,
      `园丁人格：${context.keeper.personality}`,
      `园丁描述：${context.keeper.description}`,
      `园丁语气：${context.keeper.tone}`,
      `园丁擅长：${context.keeper.recommendedUse}`,
      `当前花园：${context.currentGarden.name}`,
      context.currentGarden.description ? `花园描述：${context.currentGarden.description}` : '',
      context.currentProject ? `当前关注想法：\n${buildProjectContextText(context.currentProject)}` : '当前关注想法：暂无指定想法',
      `当前花园想法：\n${projects || '- 暂无想法'}`,
    ].filter(Boolean).join('\n')
  }

  return buildProjectContextText(context)
}

function buildProjectContextText(context: Exclude<AgentContext, { kind: 'garden' }>) {
  const logs = context.logs.slice(0, 20).map((log) => `- ${log.text}`).join('\n')
  const outcomes = context.outcomes.slice(0, 10).map((outcome) => `- ${outcome.title}: ${outcome.value}`).join('\n')
  return [
    `想法名称：${context.title}`,
    `想法故事：${context.description}`,
    `生长阶段：${statusMeta[context.status].label}`,
    `创建时间：${context.createdAt}`,
    `更新时间：${context.updatedAt}`,
    `成长记录：\n${logs || '- 暂无'}`,
    `成果记录：\n${outcomes || '- 暂无'}`,
  ].join('\n')
}
