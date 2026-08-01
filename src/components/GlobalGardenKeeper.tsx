import { useState } from 'react'
import type { GardenAgentContext } from '../agent/types'
import type { GardenKeeper } from '../data/keepers'
import { GardenKeeperChatPanel, keeperChineseName } from './GardenKeeperChatPanel'
import { KeeperAvatar } from './KeeperAvatar'

type GlobalGardenKeeperProps = {
  keeper: GardenKeeper
  context: GardenAgentContext
  onChangeKeeper: () => void
  onOpenCottage: () => void
}

export function GlobalGardenKeeper({ keeper, context, onChangeKeeper, onOpenCottage }: GlobalGardenKeeperProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <>
      {!isChatOpen && (
        <aside className="global-garden-keeper" aria-label={`Garden Keeper ${keeper.name}`}>
          <button className="global-keeper-character-button" type="button" onClick={() => setIsChatOpen(true)} aria-label={`和 ${keeper.name} 聊聊`}>
            <span className="global-keeper-glow" aria-hidden="true" />
            <span className="global-keeper-particles" aria-hidden="true"><i /><i /><i /><i /></span>
            <KeeperAvatar keeper={keeper} size="companion" />
          </button>
          <div className="global-keeper-bubble">
            <p className="eyebrow">Garden Keeper</p>
            <strong>{keeper.name}</strong>
            <span>你好，我是{keeperChineseName(keeper)}。{keeper.recommendedUse}的事，可以交给我陪你一起看。</span>
            <button type="button" onClick={() => setIsChatOpen(true)}>和我聊聊</button>
          </div>
        </aside>
      )}

      {isChatOpen && (
        <GardenKeeperChatPanel
          keeper={keeper}
          context={context}
          onChangeKeeper={() => {
            setIsChatOpen(false)
            onChangeKeeper()
          }}
          onOpenCottage={() => {
            setIsChatOpen(false)
            onOpenCottage()
          }}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  )
}
