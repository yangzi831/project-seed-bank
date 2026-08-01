import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { publicPath } from '../utils/publicPath'

type CanvasStageProps = {
  src: string
  className?: string
  children?: ReactNode
}

export const CanvasStage = forwardRef<HTMLDivElement, CanvasStageProps>(function CanvasStage({ src, className = '', children }, ref) {
  const [missing, setMissing] = useState(false)
  const [ratio, setRatio] = useState(16 / 9)
  const [size, setSize] = useState<{ width: number; height: number }>()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const resolvedSrc = publicPath(src)

  useImperativeHandle(ref, () => stageRef.current as HTMLDivElement)

  useEffect(() => {
    setMissing(false)
    setRatio(16 / 9)
  }, [resolvedSrc])

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
            onLoad={(event) => {
              const image = event.currentTarget
              if (image.naturalWidth && image.naturalHeight) {
                setRatio(image.naturalWidth / image.naturalHeight)
              }
            }}
            onError={() => setMissing(true)}
          />
        )}
        <div className="stage-vignette" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
})
