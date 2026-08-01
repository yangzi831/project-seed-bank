import { useEffect, useState } from 'react'
import { keeperVisualStyle } from '../data/keepers'
import type { GardenKeeper } from '../data/keepers'
import { publicPath } from '../utils/publicPath'

type KeeperAvatarProps = { keeper: GardenKeeper; size?: 'small' | 'medium' | 'large' | 'presence' | 'selection' | 'companion' | 'chat'; active?: boolean }

export function KeeperAvatar({ keeper, size = 'medium', active = false }: KeeperAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const avatarSrc = publicPath(keeper.avatar)

  useEffect(() => {
    setImageFailed(false)
  }, [keeper.avatar])

  return (
    <span className={`keeper-avatar-asset avatar-${keeperVisualStyle(keeper)} size-${size}${active ? ' is-active' : ''}`} aria-hidden="true">
      {!imageFailed && (
        <img
          src={avatarSrc}
          alt=""
          draggable={false}
          onError={(event) => {
            console.error('[Garden Keeper] avatar failed to load', {
              keeperId: keeper.id,
              configuredSrc: keeper.avatar,
              resolvedSrc: event.currentTarget.currentSrc || avatarSrc,
            })
            setImageFailed(true)
          }}
        />
      )}
      {imageFailed && <span className="keeper-avatar-placeholder">{keeper.name.slice(0, 1)}</span>}
    </span>
  )
}
