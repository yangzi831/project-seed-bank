import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { publicPath } from '../utils/publicPath'
import { shouldForce2D } from '../three/webgl'
import { GardenScene3D } from '../three/GardenScene3D'
import type { GardenSceneHandle, GardenScenePlant } from '../three/GardenScene3D'
import type { PlantSize } from '../three/PlantParticleSystem'

type CanvasStageProps = {
  src: string
  className?: string
  children?: ReactNode
  /** 开启 3D 渲染（WebGL 不可用或 ?force2d 时自动回退 2D）。 */
  enable3D?: boolean
  /** 3D 模式下的植物集合。 */
  plants3d?: GardenScenePlant[]
  /** 3D 植物尺寸档位。 */
  plantSize?: PlantSize
  /** 3D 场景就绪回调（投影句柄，供 DOM 标签跟随）。 */
  onSceneReady?: (handle: GardenSceneHandle) => void
}

export const CanvasStage = forwardRef<HTMLDivElement, CanvasStageProps>(function CanvasStage(
  { src, className = '', children, enable3D = false, plants3d, plantSize = 'medium', onSceneReady },
  ref,
) {
  const [missing, setMissing] = useState(false)
  const [ratio, setRatio] = useState(16 / 9)
  const [size, setSize] = useState<{ width: number; height: number }>()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const resolvedSrc = publicPath(src)
  const [use3D, setUse3D] = useState<boolean>(() => enable3D && !shouldForce2D())

  useImperativeHandle(ref, () => stageRef.current as HTMLDivElement)

  useEffect(() => {
    setMissing(false)
    setRatio(16 / 9)
  }, [resolvedSrc])

  useEffect(() => {
    setUse3D(enable3D && !shouldForce2D())
  }, [enable3D])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const currentShell = shell

    function updateSize() {
      const rect = currentShell.getBoundingClientRect()
      if (!rect.width) return
      const availableHeight = rect.height || rect.width / ratio
      const width = Math.min(rect.width, availableHeight * ratio)
      const height = width / ratio
      setSize({ width, height })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(currentShell)
    window.addEventListener('resize', updateSize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [ratio])

  const style =
    {
      aspectRatio: `${ratio}`,
      width: size ? `${size.width}px` : '100%',
      height: size ? `${size.height}px` : undefined,
    } as CSSProperties

  return (
    <div ref={shellRef} className="canvas-stage-shell">
      <div ref={stageRef} className={`canvas-image-stage ${missing ? 'is-fallback' : ''} ${className}`} style={style}>
        {!missing && (
          <img
            className="canvas-stage-image"
            src={resolvedSrc}
            alt=""
            draggable={false}
            style={use3D ? { visibility: 'hidden' } : undefined}
            onLoad={(event) => {
              const image = event.currentTarget
              if (image.naturalWidth && image.naturalHeight) {
                setRatio(image.naturalWidth / image.naturalHeight)
              }
            }}
            onError={() => setMissing(true)}
          />
        )}
        {use3D && size && plants3d ? (
          <GardenScene3D backgroundSrc={src} size={size} plants={plants3d} plantSize={plantSize} onReady={onSceneReady} />
        ) : null}
        <div className="stage-vignette" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
})
