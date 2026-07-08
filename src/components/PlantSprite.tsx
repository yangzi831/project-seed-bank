import { useEffect, useMemo, useState } from 'react'
import { getPlantAssetPath, plantCategoryMeta, statusMeta } from '../data/garden'
import type { ProjectSeed } from '../data/garden'
import { publicPath } from '../utils/publicPath'

type PlantSpriteProps = {
  project: ProjectSeed
  size?: 'small' | 'medium' | 'large'
  interactive?: boolean
  onClick?: (projectId: string) => void
}

export function PlantSprite({ project, size = 'medium', interactive = false, onClick }: PlantSpriteProps) {
  const assetPath = useMemo(() => getPlantAssetPath(project), [project])
  const resolvedAssetPath = assetPath ? publicPath(assetPath) : undefined
  const [assetMissing, setAssetMissing] = useState(false)
  const showAsset = Boolean(assetPath && !assetMissing)

  useEffect(() => {
    setAssetMissing(false)
  }, [assetPath])
  const className = [
    'plant-sprite',
    `plant-${size}`,
    `plant-${project.plantCategory}`,
    `plant-stage-${project.status}`,
    interactive ? 'is-interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {showAsset ? (
        <img src={resolvedAssetPath} alt="" onError={() => setAssetMissing(true)} />
      ) : (
        <span className="particle-plant" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      {(project.status === 'dormant' || project.status === 'harvested') && (
        <span className="plant-badge">{statusMeta[project.status].label}</span>
      )}
      <span className="sr-only">
        {project.title}, {plantCategoryMeta[project.plantCategory].label}, {statusMeta[project.status].label}
      </span>
    </>
  )

  if (interactive) {
    return (
      <button className={className} type="button" onClick={() => onClick?.(project.id)}>
        {content}
      </button>
    )
  }

  return <span className={className}>{content}</span>
}
