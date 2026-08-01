import * as THREE from 'three'
import { getPlantAssetPath, getVisualPlantStatus } from '../data/garden'
import type { ProjectSeed } from '../data/garden'
import { publicPath } from '../utils/publicPath'
import { pointBudget } from './webgl'
import { samplePlantImage } from './sampling'
import type { SampledCloud } from './sampling'

/**
 * 植物粒子系统：把每株植物渲染成一个可旋转的 3D 点云。
 * - 同 variant+stage 共享 BufferGeometry（采样结果缓存）
 * - 点材质使用软圆点贴图 + vertexColors + alphaTest（避免 transparent 排序问题）
 * - 单株动画在统一 rAF 中按 delta time 驱动
 */

export type PlantSize = 'relic' | 'small' | 'medium' | 'large'

/** 点云半尺寸（world 单位），与 DOM 中的 small/medium/large 观感对齐。 */
const SIZE_MAP: Record<PlantSize, { halfWidth: number; halfHeight: number; maxDepth: number; pointSize: number }> = {
  relic: { halfWidth: 0.82, halfHeight: 1.12, maxDepth: 0.68, pointSize: 0.105 },
  small: { halfWidth: 4.2, halfHeight: 5.0, maxDepth: 2.8, pointSize: 0.45 },
  medium: { halfWidth: 6.5, halfHeight: 7.8, maxDepth: 4.2, pointSize: 0.52 },
  large: { halfWidth: 11.0, halfHeight: 13.0, maxDepth: 7.0, pointSize: 0.62 },
}

export type PlantNode = {
  projectId: string
  root: THREE.Group
  points: THREE.Points
  hitProxy: THREE.Mesh
  status: ProjectSeed['status']
  baseRotationSpeed: number
  phase: number
  /** 几何替换次数，用于 POP 反馈检测。 */
  geometryVersion: number
  setStage(project: ProjectSeed): void
}

const cloudCache = new Map<string, Promise<SampledCloud>>()

// 模块级共享点贴图：不随单个场景 dispose。
// StrictMode 双挂载会 dispose 第一个渲染器；若贴图被销毁而缓存的材质仍引用它，重挂载后会渲染空白。
let sharedSpriteTexture: THREE.Texture | null = null

function cacheKey(project: ProjectSeed) {
  const stage = getVisualPlantStatus(project)
  return `${project.plantVariant ?? 'unknown'}:${stage}`
}

function getSpriteTexture(): THREE.Texture {
  if (sharedSpriteTexture) return sharedSpriteTexture
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.85)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  sharedSpriteTexture = texture
  return texture
}

async function loadCloud(project: ProjectSeed, size: PlantSize): Promise<SampledCloud> {
  const key = `${cacheKey(project)}:${size}`
  if (!cloudCache.has(key)) {
    const assetPath = getPlantAssetPath(project)
    if (!assetPath) {
      cloudCache.set(key, Promise.resolve({ positions: new Float32Array(0), colors: new Float32Array(0), count: 0 }))
    } else {
      const dims = SIZE_MAP[size]
      cloudCache.set(
        key,
        samplePlantImage(publicPath(assetPath), {
          budget: pointBudget(),
          halfWidth: dims.halfWidth,
          halfHeight: dims.halfHeight,
          maxDepth: dims.maxDepth,
        }).catch(() => ({ positions: new Float32Array(0), colors: new Float32Array(0), count: 0 })),
      )
    }
  }
  return cloudCache.get(key)!
}

function createMaterial(size: PlantSize): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    size: SIZE_MAP[size].pointSize,
    sizeAttenuation: true,
    map: getSpriteTexture(),
    vertexColors: true,
    transparent: true,
    alphaTest: 0.42,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
}

export async function createPlantNode(project: ProjectSeed, size: PlantSize): Promise<PlantNode> {
  const dims = SIZE_MAP[size]
  const root = new THREE.Group()
  root.name = `plant:${project.id}`

  const geometry = new THREE.BufferGeometry()
  const material = createMaterial(size)
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  root.add(points)

  // 命中代理：不可见球体，比粒子射线可靠。
  const hitProxy = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(dims.halfWidth, dims.halfHeight) * 1.1, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  hitProxy.name = `hit:${project.id}`
  root.add(hitProxy)

  const node: PlantNode = {
    projectId: project.id,
    root,
    points,
    hitProxy,
    status: project.status,
    baseRotationSpeed: rotationSpeedFor(project.status),
    phase: Math.random() * Math.PI * 2,
    geometryVersion: 0,
    setStage() {
      /* replaced below */
    },
  }

  let currentProject = project

  const applyCloud = async () => {
    const cloud = await loadCloud(currentProject, size)
    const nextGeometry = new THREE.BufferGeometry()
    nextGeometry.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3))
    nextGeometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3))
    nextGeometry.computeBoundingSphere()
    points.geometry.dispose()
    points.geometry = nextGeometry
    node.geometryVersion += 1
  }

  node.setStage = (nextProject) => {
    currentProject = nextProject
    void applyCloud()
  }
  await applyCloud()
  return node
}

function rotationSpeedFor(status: ProjectSeed['status']): number {
  switch (status) {
    case 'growing':
      return 0.35
    case 'mature':
      return 0.55
    case 'dormant':
      return 0.12
    case 'harvested':
      return 0.2
    default:
      return 0.3
  }
}

export { rotationSpeedFor }

/** 每帧驱动：旋转 + 轻微呼吸。reducedMotion 时仅保留极慢漂移。 */
export function animatePlantNode(node: PlantNode, elapsed: number, delta: number, reducedMotion: boolean) {
  const speed = reducedMotion ? node.baseRotationSpeed * 0.08 : node.baseRotationSpeed
  node.points.rotation.y += speed * delta
  if (!reducedMotion) {
    const breathe = 1 + Math.sin(elapsed * 1.2 + node.phase) * 0.03
    node.points.scale.setScalar(breathe)
  }
}

/** 释放单株植物独占资源（共享贴图与跨实例缓存不释放）。 */
export function disposePlantNode(node: PlantNode) {
  node.points.geometry.dispose()
  const mat = node.points.material
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
  else mat.dispose()
  node.hitProxy.geometry.dispose()
  const hm = node.hitProxy.material
  if (Array.isArray(hm)) hm.forEach((m) => m.dispose())
  else hm.dispose()
}
