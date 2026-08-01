import { describe, expect, it } from 'vitest'
import { DUNGEON_FLOORS, DUNGEON_TILE_COUNT, TILES_PER_FLOOR } from '../game/dungeon'
import { buildDungeonPath } from './DungeonBoardScene'

describe('DungeonBoardScene path', () => {
  it('builds 48 numbered stones across six ascending floors', () => {
    const path = buildDungeonPath()
    expect(path).toHaveLength(DUNGEON_TILE_COUNT)
    expect(new Set(path.map((tile) => tile.floor)).size).toBe(DUNGEON_FLOORS)
    expect(path.filter((tile) => tile.floor === 5)).toHaveLength(TILES_PER_FLOOR)
    expect(path[path.length - 1].position.y).toBeGreaterThan(path[0].position.y)
  })

  it('keeps every tile index unique and floor-local slots ordered', () => {
    const path = buildDungeonPath()
    expect(path.map((tile) => tile.index)).toEqual(Array.from({ length: DUNGEON_TILE_COUNT }, (_, index) => index))
    expect(path.slice(8, 16).map((tile) => tile.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})
