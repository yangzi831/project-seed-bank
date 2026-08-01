import * as THREE from 'three'
import { publicPath } from '../utils/publicPath'
import { HALF_H, HALF_W } from './coords'

/**
 * 视差背景：单张花园 PNG 贴到远平面，随相机移动产生景深。
 * 通过把背景放远（z 负）、植物放近（z≈0），相机 lerp 时背景滑得更多 → 纵深。
 */

export type ParallaxBackground = {
  group: THREE.Group
  mesh: THREE.Mesh
  dispose(): void
}

export function createParallaxBackground(src: string): ParallaxBackground {
  const group = new THREE.Group()
  group.name = 'parallax-background'

  const texture = new THREE.TextureLoader().load(publicPath(src))
  texture.colorSpace = THREE.SRGBColorSpace

  // 背景放远一些，并稍微放大以覆盖视差移动时的边缘。
  const scale = 1.35
  const geometry = new THREE.PlaneGeometry(HALF_W * 2 * scale, HALF_H * 2 * scale)
  const material = new THREE.MeshBasicMaterial({ map: texture, fog: true })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.z = -18
  group.add(mesh)

  return {
    group,
    mesh,
    dispose() {
      geometry.dispose()
      material.map?.dispose()
      material.dispose()
    },
  }
}

/** 场景雾（纵深感），颜色取深夜绿以贴合主题。 */
export function applySceneFog(scene: THREE.Scene) {
  scene.fog = new THREE.Fog(0x0a1a14, 30, 90)
}
