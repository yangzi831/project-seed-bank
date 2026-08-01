export const DUNGEON_FLOORS = 6
export const TILES_PER_FLOOR = 8
export const DUNGEON_TILE_COUNT = DUNGEON_FLOORS * TILES_PER_FLOOR

export type DungeonPlayerId = 'ember' | 'tide'

export type DungeonPlayer = {
  id: DungeonPlayerId
  name: string
  epithet: string
  color: string
  position: number
  escaped: boolean
  turns: number
}

export type DungeonLogTone = 'neutral' | 'gold' | 'danger' | 'success' | 'ember' | 'tide'

export type DungeonLogEntry = {
  id: string
  text: string
  tone: DungeonLogTone
}

export type FateEvent = {
  icon: string
  title: string
  copy: string
  tone: 'gold' | 'danger' | 'success'
}

export type DungeonGameState = {
  started: boolean
  currentPlayer: 0 | 1
  players: [DungeonPlayer, DungeonPlayer]
  devilPosition: number
  turn: number
  winner?: DungeonPlayerId
  log: DungeonLogEntry[]
}

export type TurnResolution = {
  state: DungeonGameState
  fate?: FateEvent
  danger: boolean
  devilEnraged: boolean
}

const introLog: DungeonLogEntry[] = [
  {
    id: 'intro-3',
    tone: 'danger',
    text: '🔥 地底传来锁链拖过石面的声音。守墓恶魔已经苏醒。',
  },
  {
    id: 'intro-2',
    tone: 'tide',
    text: '🜄 青潮守誓者在第二块石板上点亮冷焰。',
  },
  {
    id: 'intro-1',
    tone: 'ember',
    text: '🜂 余烬行者握紧火种，踏上第一层回廊。',
  },
]

export function createInitialDungeonGame(): DungeonGameState {
  return {
    started: false,
    currentPlayer: 0,
    players: [
      {
        id: 'ember',
        name: '玩家一',
        epithet: '余烬行者',
        color: '#e8a33d',
        position: 1,
        escaped: false,
        turns: 0,
      },
      {
        id: 'tide',
        name: '玩家二',
        epithet: '青潮守誓者',
        color: '#37b8af',
        position: 2,
        escaped: false,
        turns: 0,
      },
    ],
    devilPosition: 0,
    turn: 0,
    log: introLog,
  }
}

export function startDungeonGame(): DungeonGameState {
  const state = createInitialDungeonGame()
  return {
    ...state,
    started: true,
    log: [
      {
        id: createLogId('start'),
        tone: 'gold',
        text: '⚔️ 墓门在身后合拢。掷出命运，赶在恶魔之前抵达第 48 块石板。',
      },
      ...state.log,
    ],
  }
}

export function rollDungeonDice(random: () => number = Math.random): [number, number] {
  return [Math.floor(random() * 6) + 1, Math.floor(random() * 6) + 1]
}

export function resolveDungeonTurn(state: DungeonGameState, dice: [number, number]): TurnResolution {
  if (!state.started || state.winner) {
    return { state, danger: false, devilEnraged: false }
  }

  const total = dice[0] + dice[1]
  const players: [DungeonPlayer, DungeonPlayer] = [{ ...state.players[0] }, { ...state.players[1] }]
  const activeIndex = state.currentPlayer
  const active = players[activeIndex]
  const tone: DungeonLogTone = active.id === 'ember' ? 'ember' : 'tide'
  const nextLog: DungeonLogEntry[] = [
    {
      id: createLogId('roll'),
      tone,
      text: `🎲 ${active.epithet} 掷出 ${dice[0]} 与 ${dice[1]}，沿石阶前进 ${total} 格。`,
    },
    ...state.log,
  ]

  active.turns += 1
  active.position = clampTile(active.position + total)

  let fate: FateEvent | undefined
  let danger = false
  let devilEnraged = false
  let devilPosition = state.devilPosition

  if (active.position >= DUNGEON_TILE_COUNT - 1) {
    active.position = DUNGEON_TILE_COUNT - 1
    active.escaped = true
    fate = {
      icon: '🕊️',
      title: '逃出生天',
      copy: `${active.epithet} 穿过最后一道绿焰墓门。古墓失去了一个名字。`,
      tone: 'success',
    }
    nextLog.unshift({
      id: createLogId('escape'),
      tone: 'success',
      text: `🕊️ ${active.epithet} 抵达第 48 格，成为第一个逃出古墓的人。`,
    })
  } else {
    const fateResult = resolveFate(active.position)
    if (fateResult) {
      fate = fateResult.event
      active.position = clampTile(active.position + fateResult.playerDelta)
      devilPosition = clampTile(devilPosition + fateResult.devilDelta)
      danger = fateResult.danger
      devilEnraged = fateResult.devilDelta > 0
      nextLog.unshift({
        id: createLogId('fate'),
        tone: fateResult.event.tone === 'danger' ? 'danger' : 'gold',
        text: `${fateResult.event.icon} ${fateResult.event.title}：${fateResult.event.copy}`,
      })
    }
  }

  const naturalDevilStep = state.turn % 2 === 1 ? 2 : 1
  devilPosition = clampTile(devilPosition + naturalDevilStep)
  nextLog.unshift({
    id: createLogId('devil'),
    tone: 'danger',
    text: `😈 守墓恶魔踏碎 ${naturalDevilStep} 级石阶，逼近第 ${devilPosition + 1} 格。`,
  })

  if (!active.escaped && devilPosition >= active.position) {
    danger = true
    devilEnraged = true
    active.position = clampTile(Math.max(devilPosition + 2, active.position - 3))
    devilPosition = clampTile(Math.max(0, active.position - 5))
    fate = {
      icon: '💥',
      title: '恶魔扑袭',
      copy: `${active.epithet} 被炽热锁链扫中，跌向前方断裂的石阶。`,
      tone: 'danger',
    }
    nextLog.unshift({
      id: createLogId('caught'),
      tone: 'danger',
      text: `💥 恶魔追上了 ${active.epithet}；锁链将其抛向第 ${active.position + 1} 格。`,
    })
  }

  const winner = active.escaped ? active.id : state.winner
  const otherIndex: 0 | 1 = activeIndex === 0 ? 1 : 0
  const nextPlayer: 0 | 1 = players[otherIndex].escaped ? activeIndex : otherIndex

  return {
    state: {
      ...state,
      players,
      devilPosition,
      currentPlayer: nextPlayer,
      turn: state.turn + 1,
      winner,
      log: nextLog.slice(0, 9),
    },
    fate,
    danger,
    devilEnraged,
  }
}

function resolveFate(position: number): {
  event: FateEvent
  playerDelta: number
  devilDelta: number
  danger: boolean
} | null {
  const tileNumber = position + 1

  if (tileNumber % 13 === 0) {
    return {
      event: {
        icon: '🩸',
        title: '血契石板',
        copy: '刻痕吞下火光，恶魔沿着你的影子跃过两段回廊。',
        tone: 'danger',
      },
      playerDelta: 0,
      devilDelta: 3,
      danger: true,
    }
  }

  if (tileNumber % 11 === 0) {
    return {
      event: {
        icon: '🕸️',
        title: '缚魂蛛网',
        copy: '银灰蛛丝勒紧脚踝，你被拖回两块冰冷石板。',
        tone: 'danger',
      },
      playerDelta: -2,
      devilDelta: 0,
      danger: true,
    }
  }

  if (tileNumber % 7 === 0) {
    return {
      event: {
        icon: '🔥',
        title: '守夜火种',
        copy: '古老铜盏重新燃烧，暖光为你照亮两格捷径。',
        tone: 'gold',
      },
      playerDelta: 2,
      devilDelta: 0,
      danger: false,
    }
  }

  if (tileNumber % 5 === 0) {
    return {
      event: {
        icon: '🗝️',
        title: '墓主密钥',
        copy: '锈蚀齿纹与暗门吻合，你穿过墙后的一格秘道。',
        tone: 'gold',
      },
      playerDelta: 1,
      devilDelta: 0,
      danger: false,
    }
  }

  return null
}

function clampTile(position: number) {
  return Math.min(DUNGEON_TILE_COUNT - 1, Math.max(0, position))
}

let logCounter = 0

function createLogId(prefix: string) {
  logCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${logCounter}`
}
