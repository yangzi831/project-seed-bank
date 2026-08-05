import { useState } from 'react'
import type { AgentScenario } from '../agent/types'
import { AgentPanel } from '../components/AgentPanel'
import { PlantPicker } from '../components/PlantPicker'
import { PlantSprite } from '../components/PlantSprite'
import { plantCategoryMeta, statusMeta, statusOrder } from '../data/garden'
import type { OutcomeType, PlantCategory, ProjectSeed, Zone } from '../data/garden'
import { plantLibrary } from '../data/plantLibrary'
import { publicPath } from '../utils/publicPath'

type DetailTab = 'overview' | 'keeper' | 'gardener' | 'logs' | 'outcomes' | 'settings'

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
  onOpenUniverse?: (projectId: string) => void
  initialTab?: 'overview' | 'keeper'
  initialAgentScenario?: AgentScenario
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
  onOpenUniverse,
  initialTab = 'overview',
  initialAgentScenario = 'growth-companion',
}: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab)
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
            <p className="eyebrow">{zone?.displayName ?? 'Unknown garden'} / Idea Garden</p>
            <h2>Plant Detail</h2>
            <p className="dossier-subtitle">这是一颗正在成长的想法。</p>
          </div>
          <button className="dossier-close" type="button" onClick={onBack} aria-label="Close idea detail">
            Close
          </button>
        </header>

        <section className="detail-hero">
          <PlantSprite project={project} size="large" />
          <div>
            <input
              className="title-input"
              value={project.title}
              onChange={(event) => onUpdateProject(project.id, { title: event.target.value })}
              aria-label="Idea title"
            />
            <label className="idea-story-field">
              <span className="eyebrow">Idea Story</span>
              <textarea
                value={project.description}
                onChange={(event) => onUpdateProject(project.id, { description: event.target.value })}
                aria-label="Idea story"
                placeholder="写下这颗想法从哪里来，以及它正在寻找什么。"
              />
            </label>
            <div className="detail-meta">
              <span className={`status-pill ${statusMeta[project.status].tone}`}>{statusMeta[project.status].label}</span>
              <span>{plantCategoryMeta[project.plantCategory].label}</span>
              <span>{project.plantVariant ?? '粒子占位'}</span>
              <span>{zone?.displayName}</span>
            </div>
          </div>
        </section>

        <section className="dossier-actions">
          <button className="keeper-entry-button" type="button" onClick={() => setActiveTab('keeper')}>
            ✦ AI Garden Keeper
          </button>
          {project.plantVariant === 'plant-01' && onOpenUniverse && (
            <button className="universe-entry-button" type="button" onClick={() => onOpenUniverse(project.id)}>
              <span>进入植物宇宙</span><small>Enter Idea Universe</small>
            </button>
          )}
          <button type="button" onClick={() => {
            setActiveTab('logs')
            setIsLogOpen(true)
          }}>
            写成长记录
          </button>
          <button type="button" onClick={() => onAdvance(project)}>
            进入下一生长阶段
          </button>
          <button type="button" onClick={() => {
            setActiveTab('settings')
            setIsPlantChooserOpen(true)
            setPlantCategory(project.plantCategory)
            setSelectedVariant(project.plantVariant)
          }}>
            更换植物
          </button>
          {project.status === 'dormant' ? (
            <button type="button" onClick={() => onUpdateProject(project.id, { status: project.previousStatus ?? 'growing', previousStatus: undefined })}>
              唤醒
            </button>
          ) : (
            <button type="button" onClick={() => onUpdateProject(project.id, { status: 'dormant', previousStatus: getRestorableStatus(project.status) })}>
              让它休眠
            </button>
          )}
          <button type="button" onClick={() => onUpdateProject(project.id, { status: 'harvested' })}>
            标记为已形成
          </button>
          <button type="button" onClick={() => {
            setActiveTab('outcomes')
            setIsOutcomeOpen(true)
          }}>
            记录成果
          </button>
        </section>

        <nav className="dossier-tabs" aria-label="Plant detail sections">
          <button className={activeTab === 'overview' ? 'active' : ''} type="button" onClick={() => setActiveTab('overview')}>
            概览
          </button>
          <button className={activeTab === 'keeper' ? 'active keeper-tab' : 'keeper-tab'} type="button" onClick={() => setActiveTab('keeper')}>
            ✦ 守护者
          </button>
          <button className={activeTab === 'gardener' ? 'active' : ''} type="button" onClick={() => setActiveTab('gardener')}>
            园丁
          </button>
          <button className={activeTab === 'logs' ? 'active' : ''} type="button" onClick={() => setActiveTab('logs')}>
            Growth Journal · {project.logs.length}
          </button>
          <button className={activeTab === 'outcomes' ? 'active' : ''} type="button" onClick={() => setActiveTab('outcomes')}>
            Things This Idea Has Grown · {project.outcomes.length}
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} type="button" onClick={() => setActiveTab('settings')}>
            设置
          </button>
        </nav>

        <section className="dossier-tab-panel">
          {activeTab === 'keeper' && <AgentPanel key={`${project.id}:${initialAgentScenario}`} project={project} initialScenario={initialAgentScenario} />}
          {activeTab === 'overview' && (
            <div className="dossier-grid compact-dossier-grid">
              <div className="glass-panel">
                <p className="eyebrow">Growth Stage</p>
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
                <p className="eyebrow">Growth Journal</p>
                <p>{project.logs[0]?.text ?? '还没有成长记录。'}</p>
              </div>
              <div className="glass-panel">
                <p className="eyebrow">Things This Idea Has Grown</p>
                <p>{project.outcomes[0]?.title ?? '还没有成果记录。'}</p>
              </div>
              {plant && (
                <div className="glass-panel plant-detail-compare">
                  <p className="eyebrow">Living Forms</p>
                  <div>
                    <figure>
                      <img src={publicPath(plant.mature)} alt={`${plant.chineseName} mature`} draggable={false} />
                      <figcaption>形成中</figcaption>
                    </figure>
                    <figure>
                      <img src={publicPath(plant.growing)} alt={`${plant.chineseName} growing`} draggable={false} />
                      <figcaption>成长中</figcaption>
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
                  <textarea name="log" placeholder="写下一条新的生长记录" autoFocus />
                  <button type="submit">保存成长记录</button>
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
                  <p>还没有成长记录。</p>
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
                  <input name="title" placeholder="成果记录标题" autoFocus />
                  <select name="type" defaultValue="link">
                    <option value="link">外部链接</option>
                    <option value="text">文字作品</option>
                    <option value="image">图片链接</option>
                    <option value="file">文件名/路径占位</option>
                  </select>
                  <input name="value" placeholder="链接、文字、图片 URL 或文件路径" />
                  <button type="submit">保存成果记录</button>
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
                  <p>还没有成果记录。</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="dossier-scroll-section">
              <div className="glass-panel settings-panel">
                <p className="eyebrow">Plant settings</p>
                <button type="button" onClick={() => {
                  setIsPlantChooserOpen((value) => !value)
                  setPlantCategory(project.plantCategory)
                  setSelectedVariant(project.plantVariant)
                }}>
                  更换植物
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
                        确认替换
                      </button>
                      <button type="button" className="ghost-button" onClick={() => setIsPlantChooserOpen(false)}>
                        取消
                      </button>
                    </div>
                  </div>
                )}
                <p>删除这颗想法会同时移除生长阶段、成长记录、成果记录和画布坐标。</p>
                <button className="danger-button" type="button" onClick={() => onDeleteProject(project.id)}>
                  删除这颗想法
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gardener' && (
            <div className="dossier-scroll-section">
              <div className="glass-panel gardener-panel">
                <p className="eyebrow">Digital gardener</p>
                <h3>园丁建议</h3>
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
                  <p>还没有生成过园丁建议。</p>
                )}
                {onAskGardener && (
                  <button type="button" onClick={() => onAskGardener(project.id)}>
                    请园丁整理
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
