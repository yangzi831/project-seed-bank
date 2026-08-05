import type { GardenKeeper } from '../data/keepers'
import { statusMeta } from '../data/garden'
import type { ProjectSeed, Zone } from '../data/garden'
import { LuminousPlantCore } from '../components/LuminousPlantCore'

type IdeaUniverseViewProps = {
  project: ProjectSeed
  zone?: Zone
  keeper: GardenKeeper
  onBackToPlant: () => void
  onBackToGarden: () => void
}

export function IdeaUniverseView({ project, zone, keeper, onBackToPlant, onBackToGarden }: IdeaUniverseViewProps) {
  const journal = project.logs.slice(0, 4)
  const outcomes = project.outcomes.slice(0, 4)
  const keeperName = keeper.name.split(' ')[0]
  const reflection = project.aiSummary?.summary
    ?? `${keeperName}正在观察这颗想法内部的光。它不需要立刻抵达终点，最近留下的每一次变化，都在为这个宇宙增加新的坐标。`

  return (
    <main className="page idea-universe-page">
      <div className="universe-ambient" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <header className="universe-topbar glass-panel">
        <div>
          <p className="eyebrow">Idea Universe · Prototype 01</p>
          <h1>{project.title}</h1>
          <small>进入一颗想法内部，看看它由什么组成。</small>
        </div>
        <div className="universe-topbar-actions">
          <button className="ghost-button" type="button" onClick={onBackToGarden}>返回花园</button>
          <button type="button" onClick={onBackToPlant}>返回 Plant Detail</button>
        </div>
      </header>

      <section className="universe-layout">
        <aside className="universe-specimen glass-panel">
          <div className="universe-specimen-heading">
            <div><p className="eyebrow">Luminous Bloom</p><h2>流光花</h2></div>
            <span className={`status-pill ${statusMeta[project.status].tone}`}>{statusMeta[project.status].label}</span>
          </div>
          <LuminousPlantCore stageLabel={statusMeta[project.status].label} />
          <div className="universe-specimen-copy">
            <p>它把还未命名的光收进枝叶，让一颗想法在自己的时间里缓慢形成。</p>
            <dl>
              <div><dt>Idea</dt><dd>{project.title}</dd></div>
              <div><dt>Garden</dt><dd>{zone?.displayName ?? 'Bloom Garden'}</dd></div>
              <div><dt>Born</dt><dd>{formatUniverseDate(project.createdAt)}</dd></div>
              <div><dt>Signal</dt><dd>{project.logs.length + project.outcomes.length} traces</dd></div>
            </dl>
          </div>
        </aside>

        <section className="universe-content-field" aria-label="Idea universe content">
          <div className="universe-constellation" aria-hidden="true"><span /><span /><span /><span /></div>

          <article className="universe-island universe-story-island glass-panel">
            <div className="universe-island-index">01</div>
            <p className="eyebrow">Idea Story · Core memory</p>
            <h2>这个宇宙从哪里开始</h2>
            <p className="universe-story-text">{project.description || '这颗想法还没有写下完整的故事。此刻的留白，也是它内部空间的一部分。'}</p>
            <div className="universe-tag-row">
              {(project.tags.length ? project.tags : ['仍在探索', zone?.subtitle ?? '未命名区域']).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>

          <article className="universe-island universe-journal-island glass-panel">
            <div className="universe-island-index">02</div>
            <p className="eyebrow">Growth Journal · Orbiting traces</p>
            <h3>成长留下的轨迹</h3>
            <div className="universe-journal-stream">
              {journal.length ? journal.map((log) => (
                <div key={log.id}>
                  <time>{formatUniverseDate(log.createdAt)}</time>
                  <p>{log.text}</p>
                </div>
              )) : (
                <div className="universe-empty-trace"><time>等待第一条信号</time><p>写下一次变化后，它会成为这个宇宙里的第一颗星。</p></div>
              )}
            </div>
          </article>

          <article className="universe-island universe-grown-island glass-panel">
            <div className="universe-island-index">03</div>
            <p className="eyebrow">Things This Idea Has Grown</p>
            <h3>已经形成的内容</h3>
            <div className="universe-grown-grid">
              {outcomes.length ? outcomes.map((outcome) => (
                <div key={outcome.id}><span>{outcome.type}</span><strong>{outcome.title}</strong><small>{formatUniverseDate(outcome.createdAt)}</small></div>
              )) : (
                <div className="universe-grown-placeholder"><span>OPEN SPACE</span><strong>还没有成果记录</strong><small>这个位置会留给未来形成的作品、文字或链接。</small></div>
              )}
            </div>
          </article>

          <article className="universe-island universe-keeper-island glass-panel">
            <div className="universe-island-index">04</div>
            <p className="eyebrow">Keeper Reflection</p>
            <h3>{keeperName}从宇宙边缘发来观察</h3>
            <blockquote>{reflection}</blockquote>
            {project.aiSummary?.nextSteps?.length ? (
              <ul>{project.aiSummary.nextSteps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}</ul>
            ) : <small>下一次成长记录出现后，园丁会继续更新这里的观察。</small>}
          </article>

          <article className="universe-signal-strip glass-panel">
            <span><i /> UNIVERSE ONLINE</span>
            <p>最后一次生长信号：{formatUniverseDate(project.updatedAt)}</p>
            <em>流光花宇宙仅为单株植物原型</em>
          </article>
        </section>
      </section>
    </main>
  )
}

function formatUniverseDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}
