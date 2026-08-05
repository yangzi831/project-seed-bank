import { useEffect, useMemo, useState } from 'react'
import { statusMeta } from '../data/garden'
import type { ProjectSeed } from '../data/garden'
import { getProfileByHandle } from '../services/supabase/profiles'
import type { PublicProfile } from '../services/supabase/profiles'
import { getGardenByUserId } from '../services/supabase/gardens'
import type { PublicGarden } from '../services/supabase/gardens'
import { addComment, deleteComment, getGardenComments, getProjectComments, markCommentsRead } from '../services/supabase/comments'
import type { Comment } from '../services/supabase/comments'
import { PlantSprite } from '../components/PlantSprite'

const GUEST_WORDS = ['青梧', '山茶', '芦苇', '白鹭', '萤火', '松果', '云杉', '夜莺', '橡果', '海盐', '苔藓', '雾灯', '舟楫', '晨露', '风信子']

function guestName(myProfile: PublicProfile | null): string {
  if (myProfile?.nickname) return myProfile.nickname
  if (myProfile?.handle) return `@${myProfile.handle}`
  return `游客·${GUEST_WORDS[Math.floor(Math.random() * GUEST_WORDS.length)]}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
}

type GardenProfileViewProps = {
  handle: string
  currentUserId: string | null
  myProfile: PublicProfile | null
  onBack: () => void
}

export function GardenProfileView({ handle, currentUserId, myProfile, onBack }: GardenProfileViewProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [garden, setGarden] = useState<PublicGarden | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>('loading')
  const [comments, setComments] = useState<Comment[]>([])
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [projectComments, setProjectComments] = useState<Comment[]>([])
  const [projectDraft, setProjectDraft] = useState('')
  const [projectSubmitting, setProjectSubmitting] = useState(false)

  // 游客署名在挂载时生成一次，避免每次渲染随机换名
  const [myGuestName] = useState(() => guestName(myProfile))

  const isOwn = Boolean(currentUserId && profile && profile.user_id === currentUserId)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setProfile(null)
    setGarden(null)
    setComments([])
    setExpandedId(null)
    setError(null)

    async function load() {
      try {
        const p = await getProfileByHandle(handle)
        if (cancelled) return
        if (!p) {
          setStatus('not-found')
          return
        }
        setProfile(p)
        const [g, cs] = await Promise.all([getGardenByUserId(p.user_id), getGardenComments(p.user_id)])
        if (cancelled) return
        setGarden(g)
        setComments(cs)
        setStatus('ready')
        if (currentUserId && p.user_id === currentUserId) {
          void markCommentsRead(currentUserId)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败')
          setStatus('ready')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [handle, currentUserId])

  async function openProject(project: ProjectSeed) {
    if (expandedId === project.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(project.id)
    setProjectComments([])
    setProjectDraft('')
    if (!profile) return
    try {
      const cs = await getProjectComments(profile.user_id, project.id)
      setProjectComments(cs)
    } catch {
      setProjectComments([])
    }
  }

  async function submitGardenComment(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !draft.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const comment = await addComment({
        gardenUserId: profile.user_id,
        authorUserId: currentUserId ?? undefined,
        authorName: myGuestName,
        text: draft.trim(),
      })
      if (comment) setComments((cs) => [comment, ...cs])
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function removeComment(commentId: string, projectId: string | null) {
    try {
      await deleteComment(commentId)
      if (projectId) {
        setProjectComments((cs) => cs.filter((c) => c.id !== commentId))
      } else {
        setComments((cs) => cs.filter((c) => c.id !== commentId))
      }
    } catch {
      // 删除失败静默（RLS 拒绝时按钮本来就不应出现）
    }
  }

  function canDelete(comment: Comment): boolean {
    return isOwn || (Boolean(currentUserId) && comment.author_user_id === currentUserId)
  }

  async function submitProjectComment(e: React.FormEvent, projectId: string) {
    e.preventDefault()
    if (!profile || !projectDraft.trim() || projectSubmitting) return
    setProjectSubmitting(true)
    try {
      const comment = await addComment({
        gardenUserId: profile.user_id,
        projectId,
        authorUserId: currentUserId ?? undefined,
        authorName: myGuestName,
        text: projectDraft.trim(),
      })
      if (comment) setProjectComments((cs) => [comment, ...cs])
      setProjectDraft('')
    } catch {
      // 项目留言失败静默（访客簿可用）
    } finally {
      setProjectSubmitting(false)
    }
  }

  const zones = useMemo(() => garden?.public_snapshot.zones ?? [], [garden])
  const projects = useMemo(() => garden?.public_snapshot.projects ?? [], [garden])

  if (status === 'loading') {
    return (
      <div className="page">
        <div className="glass-panel profile-panel">
          <p className="profile-hint">正在走进花园…</p>
        </div>
      </div>
    )
  }

  if (status === 'not-found' || !profile) {
    return (
      <div className="page">
        <div className="glass-panel profile-panel">
          <h2 className="profile-title">这个花园不存在</h2>
          <p className="profile-hint">没有找到用户 <code>@{handle}</code>。也许地址拼写有误，或者对方还没有认领用户名。</p>
          <div className="dossier-actions">
            <button className="primary-glass-button" type="button" onClick={onBack}>
              回到自己的花园
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="glass-panel profile-panel">
        <header className="profile-header">
          <div>
            <h2 className="profile-title">{profile.nickname ?? profile.handle}</h2>
            <p className="profile-handle">@{profile.handle}</p>
          </div>
          <div className="profile-meta">
            {isOwn && <span className="profile-own-badge">这是你的花园</span>}
            <span>{projects.length} 棵植物</span>
            {garden && <span>最近更新 {formatTime(garden.updated_at)}</span>}
          </div>
        </header>

        {garden && zones.length > 0 && (
          <div className="profile-zones">
            {zones.map((zone) => {
              const zoneProjects = projects.filter((p) => p.zoneId === zone.id)
              if (zoneProjects.length === 0) return null
              return (
                <section key={zone.id} className="profile-zone">
                  <h3 className="profile-zone-title">
                    {zone.displayName}
                    <span className="profile-zone-subtitle">{zone.subtitle}</span>
                  </h3>
                  <ul className="profile-project-list">
                    {zoneProjects.map((project) => (
                      <li key={project.id}>
                        <button
                          className={`profile-project ${expandedId === project.id ? 'expanded' : ''}`}
                          type="button"
                          onClick={() => openProject(project)}
                        >
                          <PlantSprite project={project} size="small" />
                          <span className="profile-project-body">
                            <span className="profile-project-title">
                              {project.title}
                              <span className={`status-chip status-${project.status}`}>{statusMeta[project.status].label}</span>
                            </span>
                            <span className="profile-project-desc">{project.description}</span>
                          </span>
                        </button>
                        {expandedId === project.id && (
                          <div className="profile-project-expanded">
                            <div className="profile-project-detail">
                              {project.goal && <p><strong>生长方向：</strong>{project.goal}</p>}
                              {project.tags.length > 0 && (
                                <p><strong>标签：</strong>{project.tags.join('、')}</p>
                              )}
                              {project.milestones.length > 0 && (
                                <ul className="profile-milestones">
                                  {project.milestones.map((m) => (
                                    <li key={m.id} className={m.completed ? 'done' : ''}>{m.completed ? '✓' : '○'} {m.text}</li>
                                  ))}
                                </ul>
                              )}
                              {project.logs.length > 0 && (
                                <div className="profile-logs">
                                  <strong>成长记录</strong>
                                  <ul>
                                    {project.logs.slice(0, 10).map((log) => (
                                      <li key={log.id}>{log.text}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {project.outcomes.length > 0 && (
                                <div className="profile-outcomes">
                                  <strong>成果记录</strong>
                                  <ul>
                                    {project.outcomes.map((o) => (
                                      <li key={o.id}>{o.title}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            <div className="guestbook">
                              <h4>留言 {projectComments.length > 0 && `(${projectComments.length})`}</h4>
                              <ul className="comment-list">
                                {projectComments.map((c) => (
                                  <li key={c.id} className="comment-item">
                                    <span className="comment-author">{c.author_name}</span>
                                    <span className="comment-text">{c.text}</span>
                                    <span className="comment-time">{formatTime(c.created_at)}</span>
                                    {canDelete(c) && (
                                      <button
                                        className="comment-delete"
                                        type="button"
                                        title="删除留言"
                                        onClick={() => removeComment(c.id, project.id)}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </li>
                                ))}
                                {projectComments.length === 0 && <li className="comment-empty">还没有留言</li>}
                              </ul>
                              <form className="comment-form" onSubmit={(e) => submitProjectComment(e, project.id)}>
                                <input
                                  type="text"
                                  value={projectDraft}
                                  onChange={(e) => setProjectDraft(e.target.value)}
                                  placeholder="给这棵植物留句话…"
                                />
                                <button className="ghost-button" type="submit" disabled={projectSubmitting || !projectDraft.trim()}>
                                  留言
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}

        {(!garden || zones.length === 0) && (
          <p className="profile-hint">这座花园还没有种下想法。{isOwn ? '种下第一颗想法后，它会在这里继续生长。' : '晚点再来看看吧。'}</p>
        )}

        <section className="guestbook">
          <h3>访客簿</h3>
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className="comment-item">
                <span className="comment-author">{c.author_name}</span>
                <span className="comment-text">{c.text}</span>
                <span className="comment-time">{formatTime(c.created_at)}</span>
                {canDelete(c) && (
                  <button
                    className="comment-delete"
                    type="button"
                    title="删除留言"
                    onClick={() => removeComment(c.id, null)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {comments.length === 0 && <li className="comment-empty">还没有人留过言</li>}
          </ul>
          <form className="comment-form" onSubmit={submitGardenComment}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`以「${myGuestName}」的身份留言…`}
            />
            <button className="ghost-button" type="submit" disabled={submitting || !draft.trim()}>
              留言
            </button>
          </form>
          {error && <p className="claim-error">{error}</p>}
        </section>

        <div className="dossier-actions">
          <button className="primary-glass-button" type="button" onClick={onBack}>
            返回我的花园
          </button>
        </div>
      </div>
    </div>
  )
}
