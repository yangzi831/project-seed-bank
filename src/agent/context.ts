import type { GardenState, ProjectSeed } from '../data/garden'
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

export function createGardenAgentContext(state: Pick<GardenState, 'projects'>): GardenAgentContext {
  return {
    kind: 'garden',
    projects: state.projects.slice(0, 12).map(({ title, status, zoneId }) => ({ title, status, zoneId })),
  }
}
