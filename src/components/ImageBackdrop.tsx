import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { publicPath } from '../utils/publicPath'

type ImageBackdropProps = {
  src: string
  className?: string
  children?: ReactNode
}

export function ImageBackdrop({ src, className = '', children }: ImageBackdropProps) {
  const [missing, setMissing] = useState(false)
  const resolvedSrc = publicPath(src)

  useEffect(() => {
    setMissing(false)
  }, [resolvedSrc])

  const style: CSSProperties = missing
    ? {}
    : {
        backgroundImage: `linear-gradient(180deg, rgba(7, 15, 18, 0.18), rgba(7, 15, 18, 0.54)), url("${resolvedSrc}")`,
      }

  return (
    <div className={`image-backdrop ${missing ? 'is-fallback' : ''} ${className}`} style={style}>
      {!missing && <img src={resolvedSrc} alt="" onError={() => setMissing(true)} />}
      {children}
    </div>
  )
}
