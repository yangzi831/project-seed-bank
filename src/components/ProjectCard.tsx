import { PlantSprite } from './PlantSprite'
import { plantCategoryMeta, statusMeta, statusOrder } from '../data/garden'
import type { ProjectSeed } from '../data/garden'

type ProjectCardProps = {
  project: ProjectSeed
  compact?: boolean
  board?: boolean
  zoneName?: string
  onOpen?: (projectId: string) => void
  onDelete?: (projectId: string) => void
  onStatusChange?: (projectId: string, status: ProjectSeed['status']) => void
  onAddLog?: (projectId: string, text: string) => void
}

export function ProjectCard({ project, compact = false, board = false, zoneName, onOpen, onDelete, onStatusChange, onAddLog }: ProjectCardProps) {
  return (
    <article className={`seed-card ${compact ? 'compact' : ''} ${board ? 'board-card' : ''} ${compact && onOpen ? 'is-clickable' : ''}`} onClick={compact ? () => onOpen?.(project.id) : undefined}>
      <div className="seed-card-media">
        <PlantSprite project={project} size={compact ? 'small' : 'medium'} />
        {compact && (
          <div className="card-mini-actions">
            {onDelete && (
              <button
                type="button"
                className="ghost-button small card-open-action danger-card-action"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(project.id)
                }}
              >
                删除
              </button>
            )}
          </div>
        )}
      </div>
      <div className="seed-card-main">
        <div className="seed-card-header">
          <button
            type="button"
            className="text-link"
            onClick={(event) => {
              event.stopPropagation()
              onOpen?.(project.id)
            }}
          >
            {project.title}
          </button>
          <span className={`status-pill ${statusMeta[project.status].tone}`}>{statusMeta[project.status].label}</span>
        </div>
        <p>{project.description || '一颗还没写下说明的项目种子。'}</p>
        <div className="seed-meta-row">
          {zoneName && <span>{zoneName}</span>}
          <span>{plantCategoryMeta[project.plantCategory].label}</span>
          <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
        {!compact && (
          <>
            <select value={project.status} onChange={(event) => onStatusChange?.(project.id, event.target.value as ProjectSeed['status'])}>
              {statusOrder.map((status) => (
                <option key={status} value={status}>
                  {statusMeta[status].label}
                </option>
              ))}
            </select>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault()
                const form = event.currentTarget
                const input = new FormData(form).get('log')?.toString() ?? ''
                onAddLog?.(project.id, input)
                form.reset()
              }}
            >
              <input name="log" placeholder="添加一条生长日志" />
              <button type="submit">记录</button>
            </form>
          </>
        )}
      </div>
    </article>
  )
}
