import { useEffect, useRef } from 'react'
import { statusMeta } from '../data/garden'
import type { ProjectSeed } from '../data/garden'
import type { GardenSceneHandle } from './GardenScene3D'

type LabelSpec = {
  id: string
  title: string
  badge?: string
}

type Props = {
  handle: GardenSceneHandle | null
  projects: ProjectSeed[]
  /** 垂直像素偏移（标签显示在植物下方）。 */
  offsetY?: number
  showBadge?: boolean
}

/**
 * 3D 植物标签层：DOM 覆盖，每帧用 projectToScreen 投影把标签对齐到植物。
 * 标签本身 pointer-events:none，不拦截画布交互。
 */
export function Garden3DLabels({ handle, projects, offsetY = 40, showBadge = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef(handle)
  handleRef.current = handle
  const projectsRef = useRef(projects)
  projectsRef.current = projects

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const containerEl = container // 收窄空值
    let raf = 0
    function tick() {
      raf = requestAnimationFrame(tick)
      const h = handleRef.current
      if (!h) return
      const nodes = containerEl.children
      for (let i = 0; i < projectsRef.current.length; i++) {
        const el = nodes[i] as HTMLElement | undefined
        if (!el) continue
        const p = projectsRef.current[i]
        const s = h.projectToScreen(p.id)
        if (!s || !s.visible) {
          el.style.opacity = '0'
          continue
        }
        el.style.opacity = '1'
        el.style.transform = `translate(-50%, 0) translate(${s.x}px, ${s.y + offsetY}px)`
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [offsetY])

  const labels: LabelSpec[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    badge: showBadge ? statusMeta[p.status].label : undefined,
  }))

  return (
    <div className="garden-3d-labels" aria-hidden="true" ref={containerRef}>
      {labels.map((l) => (
        <div key={l.id} className="garden-3d-label">
          <span className="garden-3d-label-title">{l.title}</span>
          {l.badge ? <span className="garden-3d-label-badge">{l.badge}</span> : null}
        </div>
      ))}
    </div>
  )
}
