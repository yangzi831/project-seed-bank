import { useState } from 'react'
import { keepers } from '../data/keepers'
import type { GardenKeeper } from '../data/keepers'
import { KeeperAvatar } from './KeeperAvatar'

type KeeperSelectionProps = {
  onConfirm: (keeper: GardenKeeper) => void
  onCancel?: () => void
  initialKeeperId?: string
}

export function KeeperSelection({ onConfirm, onCancel, initialKeeperId }: KeeperSelectionProps) {
  const [selectedId, setSelectedId] = useState(() => keepers.some((keeper) => keeper.id === initialKeeperId) ? initialKeeperId! : keepers[0].id)
  const selected = keepers.find((keeper) => keeper.id === selectedId) ?? keepers[0]

  return (
    <section className="keeper-selection" aria-labelledby="keeper-selection-title">
      <div className="keeper-selection-copy">
        {onCancel && <button className="keeper-selection-close" type="button" onClick={onCancel}>暂不更换</button>}
        <p className="eyebrow">CHOOSE YOUR GARDEN KEEPER</p>
        <h1 id="keeper-selection-title">谁会陪你让想法生长？</h1>
        <p>每位园丁看待成长的方式不同。选择一位与你此刻的节奏最接近的伙伴。</p>
      </div>
      <div className="keeper-selection-grid">
        {keepers.map((keeper) => (
          <button key={keeper.id} className={selectedId === keeper.id ? 'selected' : ''} type="button" onClick={() => setSelectedId(keeper.id)}>
            <KeeperAvatar keeper={keeper} size="selection" active={selectedId === keeper.id} />
            <span><strong>{keeper.name}</strong><small>{keeperPersonalityLabel[keeper.id] ?? keeper.personality}</small></span>
            <p className="keeper-companion-copy">“{companionCopy[keeper.id]}”</p>
          </button>
        ))}
      </div>
      <div className="keeper-selection-confirm glass-panel">
        <div><small>你的选择</small><strong>{selected.name}</strong><p>{companionCopy[selected.id]}</p></div>
        <button type="button" onClick={() => onConfirm(selected)}>和{selected.name}进入花园 →</button>
      </div>
    </section>
  )
}

const companionCopy: Record<string, string> = {
  mosslight: '陪你照顾那些正在生长的想法',
  ripple: '陪你整理散落的灵感，让它们找到联系',
  rainelle: '陪你发现想法背后的轨迹',
  coralia: '陪你尝试一条意外的新路径',
  cloudia: '陪你保存还未成熟的想法',
  ember: '帮你重新点燃停滞的创意',
}

const keeperPersonalityLabel: Record<string, string> = {
  mosslight: '陪伴成长型',
  ripple: '灵感连接型',
  rainelle: '观察洞察型',
}
