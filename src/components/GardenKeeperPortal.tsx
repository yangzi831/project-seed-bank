import type { AgentScenario } from '../agent/types'
import { keeperVisualStyle } from '../data/keepers'
import type { GardenKeeper } from '../data/keepers'
import { KeeperAvatar } from './KeeperAvatar'
import { statusMeta } from '../data/garden'
import type { ProjectSeed } from '../data/garden'

type GardenKeeperPortalProps = {
  projects: ProjectSeed[]
  keeper: GardenKeeper
  onChangeKeeper: () => void
  onOpenProject: (projectId: string) => void
  onStartFlow: (projectId: string, scenario: AgentScenario) => void
  onClose: () => void
}

export function GardenKeeperPortal({
  projects,
  keeper,
  onChangeKeeper,
  onOpenProject,
  onStartFlow,
  onClose,
}: GardenKeeperPortalProps) {
  const growing = projects.filter((project) => project.status === 'growing').length
  const dormant = projects.filter((project) => project.status === 'dormant').length
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
  const focusProject = recentProjects[0]
  const actions = recommendedActions(projects, growing, dormant)

  return (
    <div className="modal-scrim keeper-overview-scrim" role="presentation" onMouseDown={onClose}>
      <section className={`glass-panel keeper-cottage keeper-${keeperVisualStyle(keeper)}`} role="dialog" aria-modal="true" aria-labelledby="keeper-overview-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="keeper-cottage-header">
          <KeeperAvatar keeper={keeper} size="chat" active />
          <div>
            <p className="eyebrow">Garden Keeper Cottage</p>
            <h2 id="keeper-overview-title">{keeper.name}的小屋</h2>
            <p>{keeper.description}</p>
          </div>
          <button className="dossier-close" type="button" onClick={onClose}>Close</button>
        </header>

        <div className="keeper-cottage-grid">
          <section className="keeper-room keeper-today-room">
            <p className="eyebrow">今日观察</p>
            <h3>{todayTitle(keeper)}</h3>
            <p>{todayObservation(keeper, projects.length, growing, dormant)}</p>
            <div className="keeper-garden-signal">
              <span><strong>{projects.length}</strong><small>花园植物</small></span>
              <span><strong>{growing}</strong><small>正在生长</small></span>
              <span><strong>{dormant}</strong><small>休眠中</small></span>
            </div>
          </section>

          <section className="keeper-room keeper-action-room">
            <p className="eyebrow">推荐行动</p>
            <h3>今天只照料一小步</h3>
            <ul>{actions.map((action) => <li key={action}>{action}</li>)}</ul>
          </section>

          <section className="keeper-room keeper-focus-room">
            <div className="keeper-project-heading">
              <div><p className="eyebrow">最近关注的想法</p><h3>小屋窗边的植物</h3></div>
              <small>按最近更新时间排列</small>
            </div>
            <div className="keeper-project-signals">
              {recentProjects.length ? recentProjects.map((project) => (
                <button key={project.id} type="button" onClick={() => { onClose(); onOpenProject(project.id) }}>
                  <span className={`keeper-project-dot ${statusMeta[project.status].tone}`} aria-hidden="true" />
                  <span><strong>{project.title}</strong><small>{project.logs[0]?.text ?? project.description ?? '等待第一条生长记录。'}</small></span>
                  <em>{statusMeta[project.status].label} →</em>
                </button>
              )) : <p className="empty-panel">花园还是空的。种下第一颗种子后，园丁会开始观察。</p>}
            </div>
          </section>

          <section className="keeper-room keeper-conversation-room">
            <div>
              <p className="eyebrow">主动开始对话</p>
              <h3>{focusProject ? `带「${focusProject.title}」来坐一会儿` : '带一颗种子来坐一会儿'}</h3>
              <p>不是闲聊。选择一种照料方式，让园丁陪你看清这株植物此刻需要什么。</p>
            </div>
            <div className="keeper-flow-entrances" aria-label="Available Garden Keeper scenes">
              {flowEntrances.map((flow) => (
                <button key={flow.id} type="button" disabled={!focusProject} onClick={() => focusProject && onStartFlow(focusProject.id, flow.id)}>
                  <strong>{flow.name}</strong><small>{flow.description}</small><em>进入 →</em>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="keeper-cottage-change">
          <div><small>想换一个陪伴你的园丁？</small><p>每个阶段需要的陪伴可能不同，你的选择随时可以改变。</p></div>
          <button type="button" className="ghost-button" onClick={onChangeKeeper}>选择新的园丁</button>
        </footer>
      </section>
    </div>
  )
}

const flowEntrances: Array<{ id: AgentScenario; name: string; description: string }> = [
  { id: 'seed-discovery', name: 'Seed Discovery', description: '帮助发现和整理新的想法' },
  { id: 'growth-companion', name: 'Growth Companion', description: '陪伴想法成长，观察植物的生长阶段' },
  { id: 'harvest-assistant', name: 'Creation Companion', description: '陪想法逐渐形成清晰的作品表达' },
]

function todayTitle(keeper: GardenKeeper) {
  return keeperVisualStyle(keeper) === 'warm-healing' ? '花园不需要同时开花' : '今日信号正在重新排列'
}

function todayObservation(keeper: GardenKeeper, total: number, growing: number, dormant: number) {
  if (!total) return keeperVisualStyle(keeper) === 'warm-healing' ? '土壤已经准备好了。第一颗种子只需要一个愿意靠近的问题。' : '花园当前是一片开放空间。第一个坐标将定义它最初的引力。'
  if (keeperVisualStyle(keeper) === 'abstract-future') return `检测到 ${growing} 个生长信号与 ${dormant} 个静默信号。今天可以选择一个微小变量，让花园产生新的方向。`
  if (dormant > growing) return '花园最近安静了一些。休眠不是停滞，也许有一株植物只是在等待一句近况。'
  return '有些植物向外伸展，有些在地下积蓄。今天不用照料全部，只需要回应最有生命力的一株。'
}

function recommendedActions(projects: ProjectSeed[], growing: number, dormant: number) {
  const actions = ['为最近生长的想法写下一句成长记录']
  if (growing > 3) actions.push('从正在生长的想法中，只选择一株作为今日重点')
  if (dormant) actions.push('看看一株休眠植物，确认它需要继续安静还是重新唤醒')
  if (!projects.some((project) => project.outcomes.length)) actions.push('为一颗成熟的想法补充第一项作品表达')
  return actions.slice(0, 3)
}
