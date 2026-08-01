import type { GardenKeeperPersonality } from '../agent/personalities'
import { publicPath } from '../utils/publicPath'

type KeeperAvatarProps = {
  personality: GardenKeeperPersonality
  size?: 'small' | 'medium' | 'large' | 'presence'
  active?: boolean
}

export function KeeperAvatar({ personality, size = 'medium', active = false }: KeeperAvatarProps) {
  return (
    <span className={`keeper-avatar-asset avatar-${personality.style} size-${size}${active ? ' is-active' : ''}`} aria-hidden="true">
      <img className="keeper-avatar-idle" src={publicPath(personality.avatar.idle)} alt="" draggable={false} />
      <img className="keeper-avatar-active" src={publicPath(personality.avatar.active)} alt="" draggable={false} />
    </span>
  )
}
