import type { DungeonGameState, FateEvent } from '../game/dungeon'
import { DUNGEON_TILE_COUNT } from '../game/dungeon'

type DungeonHUDProps = {
  game: DungeonGameState
  rolling: boolean
  dice: [number, number] | null
  fate: FateEvent | null
  devilEnraged: boolean
  projectCount: number
  onStart: () => void
  onRoll: () => void
  onReset: () => void
}

export function DungeonHUD({ game, rolling, dice, fate, devilEnraged, projectCount, onStart, onRoll, onReset }: DungeonHUDProps) {
  if (!game.started) {
    return (
      <div className="dungeon-start-layer">
        <section className="dungeon-dialog dungeon-start-dialog" aria-labelledby="dungeon-title">
          <p className="dungeon-kicker">THE SEED VAULT · SIX FLOORS BELOW</p>
          <h1 id="dungeon-title">种子地牢</h1>
          <p className="dungeon-subtitle">一场关于火种、命运与逃亡的古墓桌游</p>

          <div className="dungeon-story">
            <p>
              很久以前，守墓人把未完成的愿望封进植物的灵魂。如今，{projectCount} 枚项目火种在六层墓塔中重新发光，而最后一扇门只会为先抵达的人开启。
            </p>
            <p>
              你们身后的黑袍恶魔已经闻到活人的温度。每一次掷骰，石阶都会重排；每一次迟疑，锁链都会更近一寸。
            </p>
          </div>

          <div className="dungeon-rule" />
          <div className="dungeon-rules-grid">
            <article>
              <span>Ⅰ</span>
              <strong>轮流掷骰</strong>
              <p>两名行者依次掷出两枚骨骰，沿 48 块石板向上。</p>
            </article>
            <article>
              <span>Ⅱ</span>
              <strong>接受命运</strong>
              <p>火种、密钥、蛛网与血契会改变你和恶魔的位置。</p>
            </article>
            <article>
              <span>Ⅲ</span>
              <strong>逃出墓门</strong>
              <p>率先穿过第 48 格的绿焰墓门，名字才不会被古墓吞掉。</p>
            </article>
          </div>
          <div className="dungeon-rule" />

          <button className="gold-pill attention" type="button" onClick={onStart}>
            ⚔️ 开始冒险
          </button>
          <small className="dungeon-start-hint">拖动视线观察墓塔 · 点击粒子植物打开项目档案 · 点击楼层进入区域</small>
        </section>
      </div>
    )
  }

  const active = game.players[game.currentPlayer]
  const winner = game.winner ? game.players.find((player) => player.id === game.winner) : undefined

  return (
    <div className="dungeon-hud" aria-live="polite">
      <section className="hud-plaque player-plaque-group" aria-label="冒险者状态">
        {game.players.map((player, index) => (
          <article key={player.id} className={`player-plaque player-${player.id} ${game.currentPlayer === index && !winner ? 'is-active' : ''}`}>
            <span className="player-glow-dot" aria-hidden="true" />
            <div>
              <small>{player.name}</small>
              <strong>{player.epithet}</strong>
            </div>
            <b>{player.escaped ? 'ESCAPED' : `${String(player.position + 1).padStart(2, '0')} / ${DUNGEON_TILE_COUNT}`}</b>
          </article>
        ))}
      </section>

      <section className={`hud-plaque devil-plaque ${devilEnraged ? 'is-enraged' : ''}`}>
        <span>😈</span>
        <div>
          <small>THE WARDEN</small>
          <strong>守墓恶魔 · 第 {game.devilPosition + 1} 格</strong>
        </div>
      </section>

      <section className="dungeon-feed" aria-label="地牢叙事记录">
        <header>
          <span>☾</span>
          <div>
            <small>DUNGEON MASTER</small>
            <strong>墓中回声</strong>
          </div>
        </header>
        <div className="dungeon-feed-list">
          {game.log.slice(0, 6).map((entry) => (
            <article key={entry.id} className={`feed-entry tone-${entry.tone}`}>
              {entry.text}
            </article>
          ))}
        </div>
      </section>

      <section className="turn-console">
        {winner ? (
          <div className="victory-console">
            <small>THE TOMB REMEMBERS</small>
            <strong>🕊️ {winner.epithet} 已逃出生天</strong>
            <button className="gold-pill" type="button" onClick={onReset}>
              再闯一次
            </button>
          </div>
        ) : (
          <>
            <span className={`turn-sigil player-${active.id}`} aria-hidden="true" />
            <div>
              <small>第 {game.turn + 1} 回合</small>
              <strong>{active.epithet}，命运在等你</strong>
            </div>
            <button className={`gold-pill roll-button ${rolling ? 'is-rolling' : 'attention'}`} type="button" onClick={onRoll} disabled={rolling}>
              {rolling ? '骨骰滚动中…' : '🎲 掷出命运'}
            </button>
          </>
        )}
      </section>

      {dice && (
        <div className="dice-overlay" role="dialog" aria-modal="true" aria-label={`骰子总点数 ${dice[0] + dice[1]}`}>
          <section className="dice-dialog dungeon-dialog">
            <p className="dungeon-kicker">THE BONES HAVE SPOKEN</p>
            <div className="dice-pair">
              <Die value={dice[0]} delay={0} />
              <Die value={dice[1]} delay={90} />
            </div>
            <strong className="dice-total">{dice[0] + dice[1]}</strong>
            <small>命运总点数</small>
          </section>
        </div>
      )}

      {fate && (
        <div className={`fate-popup fate-${fate.tone}`} role="status">
          <span>{fate.icon}</span>
          <strong>{fate.title}</strong>
          <p>{fate.copy}</p>
        </div>
      )}
    </div>
  )
}

const pipSlots: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function Die({ value, delay }: { value: number; delay: number }) {
  return (
    <div className="physical-die" style={{ animationDelay: `${delay}ms` }} aria-label={`${value} 点`}>
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index} className={pipSlots[value]?.includes(index) ? 'is-pip' : ''} />
      ))}
    </div>
  )
}
