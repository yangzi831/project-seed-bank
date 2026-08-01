import { useState } from 'react'
import { PlantPicker } from '../components/PlantPicker'
import { PlantSprite } from '../components/PlantSprite'
import { plantCategoryMeta, statusMeta, statusOrder } from '../data/garden'
import type { OutcomeType, PlantCategory, ProjectSeed, Zone } from '../data/garden'
import { plantLibrary } from '../data/plantLibrary'
import { publicPath } from '../utils/publicPath'

type DetailTab = 'overview' | 'logs' | 'outcomes' | 'settings' | 'gardener'

type ProjectDetailViewProps = {
  project: ProjectSeed
  zone?: Zone
  onBack: () => void
  onUpdateProject: (projectId: string, patch: Partial<ProjectSeed>) => void
  onAddLog: (projectId: string, text: string) => void
  onAddOutcome: (projectId: string, title: string, type: OutcomeType, value: string) => void
  onAdvance: (project: ProjectSeed) => void
  onDeleteProject: (projectId: string) => void
  onAskGardener?: (projectId: string) => void
}

export function ProjectDetailView({
  project,
  zone,
  onBack,
  onUpdateProject,
  onAddLog,
  onAddOutcome,
  onAdvance,
  onDeleteProject,
  onAskGardener,
}: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false)
  const [isPlantChooserOpen, setIsPlantChooserOpen] = useState(false)
  const [plantCategory, setPlantCategory] = useState<PlantCategory | 'all'>(project.plantCategory)
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(project.plantVariant)
  const plant = plantLibrary.find((item) => item.id === project.plantVariant)

  return (
    <div className="modal-scrim project-detail-scrim" role="presentation" onMouseDown={onBack}>
      <main className="project-dossier glass-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="dossier-header">
          <div>
            <p className="eyebrow">SOUL RELIC DOSSIER / {zone?.displayName ?? 'Unknown chamber'}</p>
            <h2>火种命运档案</h2>
          </div>
          <button className="dossier-close" type="button" onClick={onBack} aria-label="Close project detail">
            合上石板
          </button>
        </header>

        <section className="detail-hero">
          <PlantSprite project={project} size="large" />
          <div>
            <input
              className="title-input"
              value={project.title}
              onChange={(event) => onUpdateProject(project.id, { title: event.target.value })}
              aria-label="Project title"
            />
            <textarea
              value={project.description}
              onChange={(event) => onUpdateProject(project.id, { description: event.target.value })}
              aria-label="Project description"
            />
            <div className="detail-meta">
              <span className={`status-pill ${statusMeta[project.status].tone}`}>{statusMeta[project.status].label}</span>
              <span>{plantCategoryMeta[project.plantCategory].label}</span>
              <span>{project.plantVariant ?? '粒子占位'}</span>
              <span>{zone?.displayName}</span>
            </div>
          </div>
        </section>

        <section className="dossier-actions">
          <button type="button" onClick={() => {
            setActiveTab('logs')
            setIsLogOpen(true)
          }}>
            刻下进展
          </button>
          <button type="button" onClick={() => onAdvance(project)}>
            推进命运
          </button>
          <button type="button" onClick={() => {
            setActiveTab('settings')
            setIsPlantChooserOpen(true)
            setPlantCategory(project.plantCategory)
            setSelectedVariant(project.plantVariant)
          }}>
            更换灵植
          </button>
          {project.status === 'dormant' ? (
            <button type="button" onClick={() => onUpdateProject(project.id, { status: project.previousStatus ?? 'growing', previousStatus: undefined })}>
              解除封印
            </button>
          ) : (
            <button type="button" onClick={() => onUpdateProject(project.id, { status: 'dormant', previousStatus: getRestorableStatus(project.status) })}>
              进入沉眠
            </button>
          )}
          <button type="button" onClick={() => onUpdateProject(project.id, { status: 'harvested' })}>
            逃出循环
          </button>
          <button type="button" onClick={() => {
            setActiveTab('outcomes')
            setIsOutcomeOpen(true)
          }}>
            供奉成果
          </button>
        </section>

        <nav className="dossier-tabs" aria-label="Project dossier sections">
          <button className={activeTab === 'overview' ? 'active' : ''} type="button" onClick={() => setActiveTab('overview')}>
            铭文
          </button>
          <button className={activeTab === 'logs' ? 'active' : ''} type="button" onClick={() => setActiveTab('logs')}>
            墓中记忆 · {project.logs.length}
          </button>
          <button className={activeTab === 'outcomes' ? 'active' : ''} type="button" onClick={() => setActiveTab('outcomes')}>
            贡品 · {project.outcomes.length}
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} type="button" onClick={() => setActiveTab('settings')}>
            封印
          </button>
          <button className={activeTab === 'gardener' ? 'active' : ''} type="button" onClick={() => setActiveTab('gardener')}>
            先知
          </button>
        </nav>

        <section className="dossier-tab-panel">
          {activeTab === 'overview' && (
            <div className="dossier-grid compact-dossier-grid">
              <div className="glass-panel">
                  <p className="eyebrow">CURRENT FATE</p>
                <select value={project.status} onChange={(event) => onUpdateProject(project.id, { status: event.target.value as ProjectSeed['status'] })}>
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {statusMeta[status].label}
                    </option>
                  ))}
                </select>
                <p className="plant-variant-note">{project.plantVariant ?? '未分配真实植物，使用粒子占位'}</p>
              </div>
              <div className="glass-panel">
                  <p className="eyebrow">LATEST MEMORY</p>
                  <p>{project.logs[0]?.text ?? '石板上还没有留下记忆。'}</p>
              </div>
              <div className="glass-panel">
                  <p className="eyebrow">LATEST OFFERING</p>
                  <p>{project.outcomes[0]?.title ?? '祭台上还没有贡品。'}</p>
              </div>
              {plant && (
                <div className="glass-panel plant-detail-compare">
                  <p className="eyebrow">RELIC FORMS</p>
                  <div>
                    <figure>
                      <img src={publicPath(plant.mature)} alt={`${plant.chineseName} mature`} draggable={false} />
                      <figcaption>灵植长成</figcaption>
                    </figure>
                    <figure>
                      <img src={publicPath(plant.growing)} alt={`${plant.chineseName} growing`} draggable={false} />
                      <figcaption>火种初醒</figcaption>
                    </figure>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="dossier-scroll-section">
              {isLogOpen && (
                <form
                  className="dossier-inline-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = event.currentTarget
                    onAddLog(project.id, new FormData(form).get('log')?.toString() ?? '')
                    form.reset()
                    setIsLogOpen(false)
                  }}
                >
                  <textarea name="log" placeholder="在石板上刻下一段新的记忆" autoFocus />
                  <button type="submit">刻入石板</button>
                </form>
              )}
              <div className="timeline">
                {project.logs.length ? (
                  project.logs.map((log) => (
                    <article key={log.id}>
                      <time>{new Date(log.createdAt).toLocaleString()}</time>
                      <p>{log.text}</p>
                    </article>
                  ))
                ) : (
                  <p>石板上还没有留下记忆。</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'outcomes' && (
            <div className="dossier-scroll-section">
              {isOutcomeOpen && (
                <form
                  className="dossier-inline-form outcome-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = event.currentTarget
                    const data = new FormData(form)
                    onAddOutcome(
                      project.id,
                      data.get('title')?.toString() ?? '',
                      (data.get('type')?.toString() ?? 'link') as OutcomeType,
                      data.get('value')?.toString() ?? '',
                    )
                    form.reset()
                    setIsOutcomeOpen(false)
                  }}
                >
                  <input name="title" placeholder="成果标题" autoFocus />
                  <select name="type" defaultValue="link">
                    <option value="link">外部链接</option>
                    <option value="text">文字成果</option>
                    <option value="image">图片链接</option>
                    <option value="file">文件名/路径占位</option>
                  </select>
                  <input name="value" placeholder="链接、文字、图片 URL 或文件路径" />
                  <button type="submit">放上祭台</button>
                </form>
              )}
              <div className="outcome-list">
                {project.outcomes.length ? (
                  project.outcomes.map((outcome) => (
                    <article key={outcome.id}>
                      <strong>{outcome.title}</strong>
                      <small>
                        {outcome.type} / {new Date(outcome.createdAt).toLocaleString()}
                      </small>
                      {outcome.type === 'link' || outcome.type === 'image' ? (
                        <a href={outcome.value} target="_blank" rel="noreferrer">
                          {outcome.value}
                        </a>
                      ) : (
                        <p>{outcome.value}</p>
                      )}
                    </article>
                  ))
                ) : (
                  <p>祭台上还没有贡品。</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="dossier-scroll-section">
              <div className="glass-panel settings-panel">
                <p className="eyebrow">RELIC SEALS</p>
                <button type="button" onClick={() => {
                  setIsPlantChooserOpen((value) => !value)
                  setPlantCategory(project.plantCategory)
                  setSelectedVariant(project.plantVariant)
                }}>
                  更换灵植
                </button>
                {isPlantChooserOpen && (
                  <div className="plant-change-panel">
                    <PlantPicker
                      category={plantCategory}
                      selectedVariant={selectedVariant}
                      onCategoryChange={(category) => setPlantCategory(category)}
                      onSelectVariant={setSelectedVariant}
                    />
                    <div className="action-row">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedVariant) return
                          const nextPlant = plantLibrary.find((item) => item.id === selectedVariant)
                          onUpdateProject(project.id, {
                            plantVariant: selectedVariant,
                            plantCategory: nextPlant?.category ?? (plantCategory === 'all' ? project.plantCategory : plantCategory),
                          })
                          setIsPlantChooserOpen(false)
                        }}
                      >
                        确认换形
                      </button>
                      <button type="button" className="ghost-button" onClick={() => setIsPlantChooserOpen(false)}>
                        取消
                      </button>
                    </div>
                  </div>
                )}
                <p>熄灭火种会一并抹去命运、记忆、贡品与墓塔坐标。</p>
                <button className="danger-button" type="button" onClick={() => onDeleteProject(project.id)}>
                  永久熄灭
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gardener' && (
            <div className="dossier-scroll-section">
              <div className="glass-panel gardener-panel">
                <p className="eyebrow">THE ORACLE BELOW</p>
                <h3>墓中先知</h3>
                {project.aiSummary ? (
                  <div className="gardener-insight">
                    <p>{project.aiSummary.summary}</p>
                    {project.aiSummary.obstacles.length > 0 && (
                      <>
                        <p className="eyebrow">发现的阻碍</p>
                        <ul>
                          {project.aiSummary.obstacles.map((obstacle, index) => (
                            <li key={index}>{obstacle}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {project.aiSummary.nextSteps.length > 0 && (
                      <>
                        <p className="eyebrow">下一步建议</p>
                        <ul>
                          {project.aiSummary.nextSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : (
                  <p>先知还没有读过这枚火种的记忆。</p>
                )}
                {onAskGardener && (
                  <button type="button" onClick={() => onAskGardener(project.id)}>
                    请先知解读
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function getRestorableStatus(status: ProjectSeed['status']): ProjectSeed['previousStatus'] {
  return status === 'dormant' ? 'growing' : status
}
