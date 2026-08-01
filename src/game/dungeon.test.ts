import { describe, expect, it } from 'vitest'
import { DUNGEON_TILE_COUNT, createInitialDungeonGame, resolveDungeonTurn, rollDungeonDice, startDungeonGame } from './dungeon'

describe('dungeon game', () => {
  it('starts with two distinct players and an awakened devil', () => {
    const game = startDungeonGame()
    expect(game.started).toBe(true)
    expect(game.players.map((player) => player.id)).toEqual(['ember', 'tide'])
    expect(game.devilPosition).toBe(0)
  })

  it('rolls deterministic physical dice with an injected random source', () => {
    const values = [0, 0.999]
    let index = 0
    expect(rollDungeonDice(() => values[index++])).toEqual([1, 6])
  })

  it('advances the current player and alternates turns', () => {
    const game = startDungeonGame()
    const result = resolveDungeonTurn(game, [1, 1])
    expect(result.state.players[0].position).toBeGreaterThan(game.players[0].position)
    expect(result.state.currentPlayer).toBe(1)
    expect(result.state.turn).toBe(1)
  })

  it('marks a player escaped at the final stone', () => {
    const game = createInitialDungeonGame()
    game.started = true
    game.players[0].position = DUNGEON_TILE_COUNT - 3
    const result = resolveDungeonTurn(game, [6, 6])
    expect(result.state.players[0].position).toBe(DUNGEON_TILE_COUNT - 1)
    expect(result.state.players[0].escaped).toBe(true)
    expect(result.state.winner).toBe('ember')
    expect(result.fate?.tone).toBe('success')
  })
})
