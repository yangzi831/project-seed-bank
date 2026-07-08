import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { PlantSprite } from './PlantSprite'
import type { ProjectSeed } from '../data/garden'

type PlantPosition = {
  x: number
  y: number
}

type DraggablePlantProps = {
  project: ProjectSeed
  mode: 'overview' | 'zone'
  position: PlantPosition
  boundsRef: RefObject<HTMLElement | null>
  onPositionChange: (position: PlantPosition) => void
  onOpen: (projectId: string) => void
  size?: 'small' | 'medium' | 'large'
  label?: string
  meta?: string
  detailRows?: string[]
  onDelete?: (projectId: string) => void
  showLabelMode?: 'hover' | 'always' | 'none'
  clampX?: [number, number]
  clampY?: [number, number]
}

export function DraggablePlant({
  project,
  mode,
  position,
  boundsRef,
  onPositionChange,
  onOpen,
  size = 'medium',
  label = project.title,
  meta,
  detailRows = [],
  onDelete,
  showLabelMode = 'hover',
  clampX = [2, 98],
  clampY = [2, 98],
}: DraggablePlantProps) {
  const [preview, setPreview] = useState<PlantPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; isDragging: boolean; x: number; y: number } | null>(null)
  const lastDragEndRef = useRef(0)

  const activePosition = preview ?? position

  function getPosition(clientX: number, clientY: number) {
    const bounds = boundsRef.current
    if (!bounds) return position

    const rect = bounds.getBoundingClientRect()
    const x = clamp(((clientX - rect.left) / rect.width) * 100, clampX[0], clampX[1])
    const y = clamp(((clientY - rect.top) / rect.height) * 100, clampY[0], clampY[1])
    return { x: Math.round(x), y: Math.round(y) }
  }

  return (
    <div
      className={[
        'draggable-plant',
        `draggable-plant-${mode}`,
        isDragging ? 'is-dragging' : '',
        showLabelMode === 'always' ? 'show-label' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ left: `${activePosition.x}%`, top: `${activePosition.y}%` }}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        dragRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          isDragging: false,
          x: position.x,
          y: position.y,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag) return

        event.preventDefault()
        event.stopPropagation()
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
        if (distance <= 4) return

        const nextPosition = getPosition(event.clientX, event.clientY)
        drag.isDragging = true
        drag.x = nextPosition.x
        drag.y = nextPosition.y
        setIsDragging(true)
        setPreview(nextPosition)
      }}
      onPointerUp={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const drag = dragRef.current
        dragRef.current = null
        setIsDragging(false)
        setPreview(null)

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }

        if (drag?.isDragging) {
          lastDragEndRef.current = Date.now()
          onPositionChange({ x: drag.x, y: drag.y })
          return
        }

        if (Date.now() - lastDragEndRef.current > 200) {
          onOpen(project.id)
        }
      }}
      onPointerCancel={(event) => {
        dragRef.current = null
        setIsDragging(false)
        setPreview(null)
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      }}
    >
      <PlantSprite project={project} size={size} />
      {showLabelMode !== 'none' && (
        <span className="plant-map-label">
          <strong>{label}</strong>
          {meta && <small>{meta}</small>}
          <span className="plant-map-details">
            {detailRows.map((row) => (
              <small key={row}>{row}</small>
            ))}
            <span className="plant-map-actions">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen(project.id)
                }}
              >
                查看
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="danger-text-button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(project.id)
                  }}
                >
                  删除
                </button>
              )}
            </span>
          </span>
        </span>
      )}
    </div>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
