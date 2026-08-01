import * as THREE from 'three'

/**
 * 世界坐标系：以画布中心为原点。
 *  - x ∈ [-HALF_W, +HALF_W]，y ∈ [-HALF_H, +HALF_H]，z=0 为植物/背景平面。
 *  - 百分比坐标 (0–100) 与现有 DOM 布局一致：x% 从左到右，y% 从上到下。
 */
export const HALF_W = 50
export const HALF_H = 28.125 // 16:9

export type Percent = { x: number; y: number }
export type World = { x: number; y: number }

/** percent(0-100) → world（z=0 平面）。y 轴翻转：percent.y 向下，world.y 向上。 */
export function percentToWorld(p: Percent): World {
  return {
    x: (p.x / 100) * (HALF_W * 2) - HALF_W,
    y: HALF_H - (p.y / 100) * (HALF_H * 2),
  }
}

/** world（z=0 平面）→ percent(0-100)。 */
export function worldToPercent(w: World): Percent {
  return {
    x: ((w.x + HALF_W) / (HALF_W * 2)) * 100,
    y: ((HALF_H - w.y) / (HALF_H * 2)) * 100,
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * world → 屏幕像素（相对 stage 容器左上角）。
 * 用于把 DOM 标签/提示对齐到 3D 植物位置。
 */
export function worldToScreen(
  world: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  const v = world.clone().project(camera)
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (-v.y * 0.5 + 0.5) * height,
    visible: v.z >= -1 && v.z <= 1,
  }
}

/** 指针事件 → 画布 NDC（-1..1）。 */
export function eventToNdc(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  }
}

/** 指针射线与 z=0 平面的交点（world 坐标）。 */
export function ndcToGroundPoint(ndcX: number, ndcY: number, camera: THREE.Camera, raycaster: THREE.Raycaster): World | null {
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const hit = new THREE.Vector3()
  const ok = raycaster.ray.intersectPlane(plane, hit)
  if (!ok) return null
  return { x: hit.x, y: hit.y }
}
