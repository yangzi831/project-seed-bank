import { Box3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createDigitalGardenerAvatar } from './DigitalGardenerAvatar'

describe('DigitalGardenerAvatar', () => {
  it('builds a volumetric five-sheet-inspired manor gardener with animated named parts', () => {
    const avatar = createDigitalGardenerAvatar('#8ddfb2')
    const names = new Set<string>()
    avatar.group.traverse((object) => names.add(object.name))

    expect(avatar.group.name).toBe('digital-gardener-avatar')
    expect(avatar.group.userData.referenceSheetCount).toBe(5)
    expect(names).toContain('gardener-pear-body')
    expect(names).toContain('gardener-leaf-ear-left')
    expect(names).toContain('gardener-sprout-crown')
    expect(names).toContain('gardener-seed-core')
    expect(names).toContain('gardener-inner-stardust')

    const bounds = new Box3().setFromObject(avatar.group)
    expect(bounds.max.y).toBeGreaterThan(3)
    expect(bounds.max.x - bounds.min.x).toBeGreaterThan(1.5)

    avatar.animate(1.5, 1 / 60, { mode: 'tend', thinking: true, reducedMotion: false })
    expect(avatar.light.intensity).toBeGreaterThan(5)
    expect(avatar.bodyMat.emissiveIntensity).toBeGreaterThan(0.4)
  })
})
