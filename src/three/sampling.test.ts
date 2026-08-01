import { describe, it, expect } from 'vitest'
import { buildCloud, downsample, ellipsoidShellZ, hash01 } from './sampling'

describe('three/sampling', () => {
  it('hash01 is deterministic and within [0,1)', () => {
    for (const n of [0, 1, 2, 7, 42, 1234]) {
      const v = hash01(n)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(hash01(n)).toBe(v)
    }
  })

  it('ellipsoidShellZ is deepest at center and zero at edge', () => {
    const maxDepth = 4
    expect(ellipsoidShellZ(0, 0, maxDepth)).toBeCloseTo(maxDepth, 6)
    expect(ellipsoidShellZ(1, 0, maxDepth)).toBe(0)
    expect(ellipsoidShellZ(0, -1, maxDepth)).toBe(0)
    const mid = ellipsoidShellZ(0.5, 0, maxDepth)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(maxDepth)
  })

  it('downsample caps to budget and is deterministic', () => {
    const items = Array.from({ length: 100 }, (_, i) => i)
    const a = downsample(items, 30)
    const b = downsample(items, 30)
    expect(a.length).toBe(30)
    expect(a).toEqual(b)
    expect(downsample(items, 200).length).toBe(100)
  })

  it('buildCloud produces world-space points with depth and color', () => {
    // 一个 3x3 亮块，中心最亮。
    const pixels: Array<{ nx: number; ny: number; r: number; g: number; b: number }> = []
    for (let iy = -1; iy <= 1; iy++) {
      for (let ix = -1; ix <= 1; ix++) {
        pixels.push({ nx: ix, ny: iy, r: 200, g: 120, b: 60 })
      }
    }
    const opts = { budget: 100, halfWidth: 5, halfHeight: 6, maxDepth: 4 }
    const cloud = buildCloud(pixels, opts)
    expect(cloud.count).toBe(9)
    expect(cloud.positions.length).toBe(27)
    expect(cloud.colors.length).toBe(27)

    // 中心点（nx=0,ny=0）应位于 world 原点附近，且 z 最深。
    const centerIndex = pixels.findIndex((p) => p.nx === 0 && p.ny === 0)
    const cx = cloud.positions[centerIndex * 3]
    const cy = cloud.positions[centerIndex * 3 + 1]
    const cz = cloud.positions[centerIndex * 3 + 2]
    expect(cx).toBeCloseTo(0, 6)
    expect(cy).toBeCloseTo(0, 6)
    expect(cz).toBeGreaterThan(3) // 接近 maxDepth

    // 颜色写入 0..1 浮点。
    expect(cloud.colors[centerIndex * 3]).toBeCloseTo(200 / 255, 6)
  })
})
