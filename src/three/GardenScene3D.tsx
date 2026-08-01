import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { ProjectSeed } from '../data/garden'
import { clamp, eventToNdc, ndcToGroundPoint, percentToWorld, worldToPercent } from './coords'
import { animatePlantNode, createPlantNode, disposePlantNode, rotationSpeedFor } from './PlantParticleSystem'
import type { PlantNode, PlantSize } from './PlantParticleSystem'
import { applySceneFog, createParallaxBackground } from './ParallaxBackground'
import { getDeviceTier, prefersReducedMotion } from './webgl'

export type GardenScenePlant = {
  project: ProjectSeed
  /** 当前应显示的百分比位置（含拖拽 preview）。 */
  position: { x: number; y: number }
  clampX: [number, number]
  clampY: [number, number]
  onPositionChange: (pos: { x: number; y: number }) => void
  onOpen: (projectId: string) => void
}

export type GardenSceneHandle = {
  /** 把 projectId 的 3D 位置投影到容器像素坐标（供 DOM 标签跟随）。 */
  projectToScreen: (projectId: string) => { x: number; y: number; visible: boolean } | null
}

type Props = {
  backgroundSrc: string
  size: { width: number; height: number }
  plants: GardenScenePlant[]
  plantSize: PlantSize
  onReady?: (handle: GardenSceneHandle) => void
}

/**
 * 3D 花园场景。拥有单个 useEffect 完整生命周期（mount/rAF/resize/dispose），
 * 植物集合通过一个 ref 注册表就地增删，避免每次 React 渲染都重建场景。
 */
export function GardenScene3D({ backgroundSrc, size, plants, plantSize, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef(size)
  sizeRef.current = size
  const plantsRef = useRef(plants)
  plantsRef.current = plants
  const plantSizeRef = useRef(plantSize)
  plantSizeRef.current = plantSize
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const registryRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.PerspectiveCamera | null
    nodes: Map<string, PlantNode>
    versions: Map<string, number>
    applyTransforms: boolean
  }>({ scene: null, camera: null, nodes: new Map(), versions: new Map(), applyTransforms: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const registry = registryRef.current
    const tier = getDeviceTier()
    const reduced = prefersReducedMotion()

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'low' ? 1.5 : 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvasEl = canvas // 收窄空值，供闭包内事件处理使用

    const scene = new THREE.Scene()
    registry.scene = scene
    applySceneFog(scene)

    const camera = new THREE.PerspectiveCamera(50, sizeRef.current.width / sizeRef.current.height || 16 / 9, 0.1, 200)
    camera.position.set(0, 0, 40)
    camera.lookAt(0, 0, 0)
    registry.camera = camera

    const background = createParallaxBackground(backgroundSrc)
    scene.add(background.group)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xfff4d6, 0.6)
    dir.position.set(30, 60, 40)
    scene.add(dir)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(sizeRef.current.width, sizeRef.current.height), 0.5, 0.4, 0.78)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // ---- 植物集合同步（就地增删/更新，不重建场景） ----
    let cancelled = false
    const pending = new Set<string>()

    function setNodeTransform(node: PlantNode, pos: { x: number; y: number }) {
      const w = percentToWorld(pos)
      node.root.position.x = w.x
      node.root.position.y = w.y
    }

    async function addNode(plant: GardenScenePlant) {
      const id = plant.project.id
      if (pending.has(id)) return
      pending.add(id)
      const node = await createPlantNode(plant.project, plantSizeRef.current)
      pending.delete(id)
      if (cancelled) {
        disposePlantNode(node)
        return
      }
      // 植物可能在异步加载期间被删除
      const stillWanted = plantsRef.current.some((p) => p.project.id === id)
      if (!stillWanted) {
        disposePlantNode(node)
        return
      }
      setNodeTransform(node, plant.position)
      node.root.scale.setScalar(0.01) // 进入缩放动画起点
      registry.nodes.set(id, node)
      registry.versions.set(id, node.geometryVersion)
      scene.add(node.root)
    }

    function syncPlants() {
      const wanted = new Map(plantsRef.current.map((p) => [p.project.id, p]))

      for (const [id, node] of Array.from(registry.nodes.entries())) {
        if (!wanted.has(id)) {
          node.root.parent?.remove(node.root)
          disposePlantNode(node)
          registry.nodes.delete(id)
          registry.versions.delete(id)
        }
      }

      for (const plant of plantsRef.current) {
        const id = plant.project.id
        const existing = registry.nodes.get(id)
        if (!existing) {
          void addNode(plant)
          continue
        }
        if (existing.status !== plant.project.status) {
          existing.status = plant.project.status
          existing.baseRotationSpeed = rotationSpeedFor(plant.project.status)
          existing.setStage(plant.project)
        }
        if (!dragState || dragState.projectId !== id) {
          setNodeTransform(existing, plant.position)
        }
      }
    }

    // ---- 交互 ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2(0, 0)
    const cameraTarget = new THREE.Vector3(0, 0, 40)
    let dragState: {
      projectId: string
      startX: number
      startY: number
      isDragging: boolean
      pos: { x: number; y: number }
    } | null = null
    let lastDragEnd = 0

    const rectOf = () => canvas.getBoundingClientRect()

    function pickPlant(clientX: number, clientY: number): string | null {
      const ndc = eventToNdc(clientX, clientY, rectOf())
      raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera)
      const proxies: THREE.Object3D[] = []
      for (const node of registry.nodes.values()) proxies.push(node.hitProxy)
      const hits = raycaster.intersectObjects(proxies, false)
      if (!hits.length) return null
      const name = hits[0].object.name
      return name.startsWith('hit:') ? name.slice(4) : null
    }

    function onPointerDown(e: PointerEvent) {
      const id = pickPlant(e.clientX, e.clientY)
      if (!id) return
      const plant = plantsRef.current.find((p) => p.project.id === id)
      if (!plant) return
      e.preventDefault()
      canvasEl.setPointerCapture(e.pointerId)
      dragState = { projectId: id, startX: e.clientX, startY: e.clientY, isDragging: false, pos: { ...plant.position } }
    }

    function onPointerMove(e: PointerEvent) {
      const ndc = eventToNdc(e.clientX, e.clientY, rectOf())
      pointer.set(ndc.x, ndc.y)
      if (!dragState) return
      e.preventDefault()
      const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY)
      if (dist <= 4) return
      const plant = plantsRef.current.find((p) => p.project.id === dragState!.projectId)
      if (!plant) return
      const ground = ndcToGroundPoint(ndc.x, ndc.y, camera, raycaster)
      if (!ground) return
      const percent = worldToPercent(ground)
      dragState.isDragging = true
      dragState.pos = {
        x: Math.round(clamp(percent.x, plant.clampX[0], plant.clampX[1])),
        y: Math.round(clamp(percent.y, plant.clampY[0], plant.clampY[1])),
      }
      const node = registry.nodes.get(dragState.projectId)
      if (node) setNodeTransform(node, dragState.pos)
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragState) return
      e.preventDefault()
      const state = dragState
      dragState = null
      if (canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId)
      const plant = plantsRef.current.find((p) => p.project.id === state.projectId)
      if (!plant) return
      if (state.isDragging) {
        lastDragEnd = Date.now()
        plant.onPositionChange(state.pos)
        return
      }
      if (Date.now() - lastDragEnd > 200) plant.onOpen(plant.project.id)
    }

    function onPointerCancel(e: PointerEvent) {
      dragState = null
      if (canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)

    // ---- 尺寸 ----
    function applySize() {
      const { width, height } = sizeRef.current
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      composer.setSize(width, height)
      bloom.resolution.set(width, height)
    }
    applySize()
    const observer = new ResizeObserver(applySize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)

    // ---- 暴露投影句柄给 DOM 标签层 ----
    onReadyRef.current?.({
      projectToScreen(projectId) {
        const node = registry.nodes.get(projectId)
        if (!node) return null
        const v = new THREE.Vector3()
        node.root.getWorldPosition(v)
        v.project(camera)
        const { width, height } = sizeRef.current
        return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, visible: v.z >= -1 && v.z <= 1 }
      },
    })

    // ---- 主循环 ----
    let rafId = 0
    const timer = new THREE.Timer()
    function animate() {
      rafId = requestAnimationFrame(animate)
      timer.update()
      const delta = timer.getDelta()
      const elapsed = timer.getElapsed()

      syncPlants()

      if (!reduced) {
        cameraTarget.set(pointer.x * 2.4, pointer.y * 1.4, 40)
        camera.position.lerp(cameraTarget, 0.05)
        camera.lookAt(0, 0, 0)
      }

      for (const node of registry.nodes.values()) {
        // 进入缩放补间
        if (node.root.scale.x < 1) {
          const s = Math.min(1, node.root.scale.x + delta * 2)
          node.root.scale.setScalar(s)
        }
        // 版本变化做 POP 反馈
        const lastV = registry.versions.get(node.projectId) ?? 0
        if (node.geometryVersion !== lastV) {
          registry.versions.set(node.projectId, node.geometryVersion)
          node.root.scale.setScalar(1.15)
        }
        animatePlantNode(node, elapsed, delta, reduced)
      }
      composer.render()
    }
    animate()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)

      for (const node of registry.nodes.values()) disposePlantNode(node)
      registry.nodes.clear()
      registry.versions.clear()

      scene.remove(background.group)
      background.dispose()
      registry.scene = null
      registry.camera = null

      composer.dispose()
      renderer.dispose()
      // 注意：不要在这里 forceContextLoss()。
      // StrictMode 双挂载会复用同一个 <canvas>，销毁上下文会导致第二次挂载拿到死上下文 → 黑屏。
    }
  }, [backgroundSrc])

  return (
    <canvas
      ref={canvasRef}
      className="garden-3d-canvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', display: 'block' }}
    />
  )
}
