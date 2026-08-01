import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { percentToWorld, worldToPercent, worldToScreen, clamp, HALF_W, HALF_H } from './coords'

describe('three/coords', () => {
  it('percentToWorld maps corners to world bounds', () => {
    expect(percentToWorld({ x: 0, y: 0 })).toEqual({ x: -HALF_W, y: HALF_H })
    expect(percentToWorld({ x: 100, y: 100 })).toEqual({ x: HALF_W, y: -HALF_H })
    expect(percentToWorld({ x: 50, y: 50 })).toEqual({ x: 0, y: 0 })
  })

  it('worldToPercent is the inverse of percentToWorld (round-trip)', () => {
    const samples = [
      { x: 6, y: 8 },
      { x: 26, y: 26 },
      { x: 50, y: 50 },
      { x: 94, y: 92 },
      { x: 74, y: 25 },
    ]
    for (const p of samples) {
      const round = worldToPercent(percentToWorld(p))
      expect(round.x).toBeCloseTo(p.x, 6)
      expect(round.y).toBeCloseTo(p.y, 6)
    }
  })

  it('worldToScreen projects origin to container center', () => {
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200)
    camera.position.set(0, 0, 56)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    const width = 1600
    const height = 900
    const s = worldToScreen(new THREE.Vector3(0, 0, 0), camera, width, height)
    expect(s.x).toBeCloseTo(width / 2, 1)
    expect(s.y).toBeCloseTo(height / 2, 1)
    expect(s.visible).toBe(true)
  })

  it('clamp bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(30, 0, 10)).toBe(10)
  })
})
