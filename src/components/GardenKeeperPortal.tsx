import { gardenKeeperPersonalities } from '../agent/personalities'
import type { GardenKeeperPersonality } from '../agent/personalities'
import { KeeperAvatar } from './KeeperAvatar'
import { statusMeta } from '../data/garden'
import type { ProjectSeed } from '../data/garden'

type GardenKeeperPortalProps = {
  projects: ProjectSeed[]
  personality: GardenKeeperPersonality
  onPersonalityChange: (personality: GardenKeeperPersonality) => void
  onOpenProject: (projectId: string) => void
  onStartConversation: (projectId: string) => void
  onClose: () => void
}

export function GardenKeeperPortal({
  projects,
  personality,
  onPersonalityChange,
  onOpenProject,
  onStartConversation,
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
      <section className={`glass-panel keeper-cottage keeper-${personality.style}`} role="dialog" aria-modal="true" aria-labelledby="keeper-overview-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="keeper-cottage-header">
          <KeeperAvatar personality={personality} size="large" active />
          <div>
            <p className="eyebrow">Garden Keeper Cottage</p>
            <h2 id="keeper-overview-title">{personality.name}的小屋</h2>
            <p>{personality.description}</p>
          </div>
          <button className="dossier-close" type="button" onClick={onClose}>Close</button>
        </header>

        <div className="keeper-personality-switcher" aria-label="选择 Garden Keeper">
          {gardenKeeperPersonalities.map((option) => (
            <button
              key={option.id}
              className={personality.id === option.id ? 'active' : ''}
              type="button"
              onClick={() => onPersonalityChange(option)}
            >
              <KeeperAvatar personality={option} size="small" active={personality.id === option.id} />
              <span><strong>{option.name}</strong><small>{styleLabel(option.style)}</small></span>
            </button>
          ))}
          <p><span>说话方式</span>{personality.tone}</p>
        </div>

        <div className="keeper-cottage-grid">
          <section className="keeper-room keeper-today-room">
            <p className="eyebrow">今日观察</p>
            <h3>{todayTitle(personality)}</h3>
            <p>{todayObservation(personality, projects.length, growing, dormant)}</p>
            <div className="keeper-garden-signal">
              <span><strong>{projects.length}</strong><small>花园植物</small></span>
              <span><strong>{growing}</strong><small>正在生长</small></span>
              <span><strong>{dormant}</strong><small>安静休眠</small></span>
            </div>
          </section>

          <section className="keeper-room keeper-action-room">
            <p className="eyebrow">推荐行动</p>
            <h3>今天只照料一小步</h3>
            <ul>{actions.map((action) => <li key={action}>{action}</li>)}</ul>
          </section>

          <section className="keeper-room keeper-focus-room">
            <div className="keeper-project-heading">
              <div><p className="eyebrow">最近关注项目</p><h3>小屋窗边的植物</h3></div>
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
            <div className="keeper-scenario-signs" aria-label="Available Garden Keeper scenes">
              <span>Seed Discovery</span><span>Growth Companion</span><span>Harvest Assistant</span>
            </div>
            <button type="button" disabled={!focusProject} onClick={() => focusProject && onStartConversation(focusProject.id)}>
              进入项目，与{personality.name}一起观察 →
            </button>
          </section>
        </div>
      </section>
    </div>
  )
}

function styleLabel(style: GardenKeeperPersonality['style']) {
  return style === 'warm-healing' ? '温暖治愈型' : '抽象未来型'
}

function todayTitle(personality: GardenKeeperPersonality) {
  return personality.style === 'warm-healing' ? '花园不需要同时开花' : '今日信号正在重新排列'
}

function todayObservation(personality: GardenKeeperPersonality, total: number, growing: number, dormant: number) {
  if (!total) return personality.style === 'warm-healing' ? '土壤已经准备好了。第一颗种子只需要一个愿意靠近的问题。' : '花园当前是一片开放空间。第一个坐标将定义它最初的引力。'
  if (personality.style === 'abstract-future') return `检测到 ${growing} 个生长信号与 ${dormant} 个静默信号。今天可以选择一个微小变量，让花园产生新的方向。`
  if (dormant > growing) return '花园最近安静了一些。休眠不是停滞，也许有一株植物只是在等待一句近况。'
  return '有些植物向外伸展，有些在地下积蓄。今天不用照料全部，只需要回应最有生命力的一株。'
}

function recommendedActions(projects: ProjectSeed[], growing: number, dormant: number) {
  const actions = ['为最近更新的项目写下一句生长记录']
  if (growing > 3) actions.push('从正在生长的项目中，只选择一个作为今日重点')
  if (dormant) actions.push('看看一株休眠植物，确认它需要继续安静还是重新唤醒')
  if (!projects.some((project) => project.outcomes.length)) actions.push('为一个成熟项目补充第一项可见成果')
  return actions.slice(0, 3)
}
