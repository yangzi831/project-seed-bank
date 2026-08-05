import type { GardenState, ProjectSeed } from '../data/garden'
import type { Zone } from '../data/garden'
import type { GardenKeeper } from '../data/keepers'
import type { GardenAgentContext, ProjectAgentContext } from './types'

export function createAgentContext(project: ProjectSeed): ProjectAgentContext {
  return {
    kind: 'project',
    projectId: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    logs: project.logs.map(({ text, createdAt }) => ({ text, createdAt })),
    outcomes: project.outcomes,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

export function createGardenAgentContext(
  state: Pick<GardenState, 'projects'>,
  options?: { keeper?: GardenKeeper; project?: ProjectSeed; zone?: Zone },
): GardenAgentContext {
  const keeper = options?.keeper
  return {
    kind: 'garden',
    projects: state.projects.slice(0, 12).map(({ title, status, zoneId }) => ({ title, status, zoneId })),
    currentProject: options?.project ? createAgentContext(options.project) : undefined,
    currentGarden: options?.zone
      ? { id: options.zone.id, name: options.zone.displayName, description: options.zone.description }
      : { name: 'Bloom', description: '一个让想法生长的 AI 花园。' },
    keeper: keeper
      ? {
          id: keeper.id,
          name: keeper.name,
          personality: keeper.personality,
          description: keeper.description,
          tone: keeper.tone,
          recommendedUse: keeper.recommendedUse,
        }
      : {
          id: 'garden-keeper',
          name: 'Garden Keeper',
          personality: '收藏陪伴型',
          description: '陪伴想法在数字花园中持续生长。',
          tone: '温和、克制。',
          recommendedUse: '照料当前花园',
        },
  }
}
