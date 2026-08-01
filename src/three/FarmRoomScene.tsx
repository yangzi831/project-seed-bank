import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { ProjectSeed } from '../data/garden'
import type { FarmPlot, FarmState } from '../game/farm'
import { assignProjectsToPlots, createFarmState, plotNeedsCare, plotStageFor, tickFarm } from '../game/farm'
import type { AgentActionOutput } from '../services/ai/types'
import { createAgentBrain } from '../game/agentBrain'
import type { AgentBrain } from '../game/agentBrain'
import { animatePlantNode, createPlantNode, disposePlantNode } from './PlantParticleSystem'
import type { PlantNode, PlantSize } from './PlantParticleSystem'
import { getDeviceTier, prefersReducedMotion, shouldForce2D } from './webgl'
import { createDigitalGardenerAvatar } from './DigitalGardenerAvatar'
import { createFireflies, createHouse, createPortal, createRadialTexture, createTextSprite, disposeSceneGraph } from './primitives'

export type FarmRoomMode = 'overview' | 'house' | 'portal'

type Props = {
  ownerName: string
  accent: string
  projects: ProjectSeed[]
  isOwn: boolean
  onProjectOpen?: (projectId: string) => void
  onExitToWorld?: () => void
  onReady?: () => void
  /** Agent 决策回调（HUD 显示 bark / 状态）。 */
  onAgentAction?: (action: AgentActionOutput) => void
}

const PLOT_GAP = 4.6
const COLS = 4
const ROWS = 3

/** 地块网格世界坐标（以农场中心为原点）。 */
function plotWorldPosition(plot: FarmPlot): THREE.Vector3 {
  const x = (plot.col - (COLS - 1) / 2) * PLOT_GAP
  const z = (plot.row - (ROWS - 1) / 2) * PLOT_GAP
  return new THREE.Vector3(x, 0, z)
}

function sizeForStage(stage: ReturnType<typeof plotStageFor>): PlantSize {
  switch (stage) {
    case 'mature':
    case 'harvested':
      return 'small'
    case 'growing':
      return 'small'
    default:
      return 'small'
  }
}

/**
 * 农场房间场景：地基 + 地块网格 + 作物粒子 + 小房子 + Agent 角色 + 出口传送门。
 * 单 useEffect 完整生命周期；Agent 由 agentBrain 限频驱动。
 */
export function FarmRoomScene({ ownerName, accent, projects, isOwn, onProjectOpen, onExitToWorld, onReady, onAgentAction }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ projects, isOwn })
  propsRef.current = { projects, isOwn }
  const callbacksRef = useRef({ onProjectOpen, onExitToWorld, onReady, onAgentAction })
  callbacksRef.current = { onProjectOpen, onExitToWorld, onReady, onAgentAction }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || shouldForce2D()) return
    const canvasEl = canvas

    const tier = getDeviceTier()
    const reducedMotion = prefersReducedMotion()
    const cancelledLoads = { value: false }
    const ownedTextures = new Set<THREE.Texture>()

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'low' ? 1.15 : tier === 'medium' ? 1.55 : 1.85))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = tier !== 'low'
    renderer.shadowMap.type = THREE.PCFShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a140d)
    scene.fog = new THREE.FogExp2(0x0a140d, 0.018)

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200)
    camera.position.set(20, 18, 26)
    const cameraLook = new THREE.Vector3(0, 1, 0)
    camera.lookAt(cameraLook)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), tier === 'low' ? 0.3 : 0.45, 0.45, 0.8)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // ---- 灯光 ----
    scene.add(new THREE.HemisphereLight(0xaedfb2, 0x1a120a, 1.35))
    const sun = new THREE.DirectionalLight(0xfff0c8, 1.9)
    sun.position.set(24, 34, 18)
    sun.castShadow = tier !== 'low'
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -30
    sun.shadow.camera.right = 30
    sun.shadow.camera.top = 30
    sun.shadow.camera.bottom = -30
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x86b8e0, 0.5)
    rim.position.set(-20, 16, -18)
    scene.add(rim)

    const glowTexture = createRadialTexture(['rgba(255,255,255,.95)', 'rgba(255,255,255,.4)', 'rgba(255,255,255,0)'], ownedTextures)
    const softDot = createRadialTexture(['rgba(255,255,255,1)', 'rgba(255,255,255,.5)', 'rgba(255,255,255,0)'], ownedTextures)

    // ---- 地面 ----
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x24402a, roughness: 0.95, metalness: 0.02 })
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(26, 28, 2, 48), groundMat)
    ground.position.y = -1
    ground.receiveShadow = true
    scene.add(ground)

    // ---- 地块 + 作物注册表 ----
    // 农场只展示前 N 个项目（按地块数与设备档），避免 30+ 株挤成一团。
    const maxCrops = tier === 'low' ? 6 : tier === 'medium' ? 9 : 12
    const farmProjects = propsRef.current.projects.slice(0, maxCrops)
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 })
    const soilDryMat = new THREE.MeshStandardMaterial({ color: 0x6b5a42, roughness: 0.98 })
    const plotMeshes = new Map<string, THREE.Mesh>()
    const cropRegistry = new Map<string, { node: PlantNode; stage: string }>()
    const pendingCrops = new Set<string>()

    const world = new THREE.Group()
    scene.add(world)

    // ---- 房子 + Agent + 传送门 ----
    const house = createHouse(accent, glowTexture)
    house.group.position.set(0, 0, -(ROWS * PLOT_GAP) / 2 - 5)
    world.add(house.group)

    const agent = createDigitalGardenerAvatar(accent, glowTexture)
    agent.group.position.set(3.5, 0, -(ROWS * PLOT_GAP) / 2 - 2.8)
    agent.group.scale.setScalar(1.08)
    world.add(agent.group)

    const portal = createPortal(accent, glowTexture)
    portal.group.position.set(0, 0, (ROWS * PLOT_GAP) / 2 + 5)
    portal.group.rotation.y = Math.PI
    world.add(portal.group)

    const nameSprite = createTextSprite(`${ownerName} 的农场`, ownedTextures, { size: 2.4, color: '#eaf4e6', bg: 'rgba(20,33,26,0.6)' })
    nameSprite.position.set(0, 6.4, -(ROWS * PLOT_GAP) / 2 - 5)
    world.add(nameSprite)

    const fireflies = createFireflies(tier === 'low' ? 40 : 90, softDot, accent)
    scene.add(fireflies)

    // ---- Agent 大脑与状态 ----
    const brain: AgentBrain = createAgentBrain({ forceLocal: shouldForce2D() || tier === 'low' })
    let farmState: FarmState = assignProjectsToPlots(createFarmState('me'), farmProjects)
    let agentMode: 'idle' | 'walk' | 'tend' | 'speak' = 'idle'
    let agentTarget = new THREE.Vector3().copy(agent.group.position)
    let agentDialogue = ''
    let lastDecisionAt = 0
    const recentEvents: string[] = []

    async function requestDecision(elapsed: number) {
      const decision = await brain.decide({
        ownerName,
        plots: farmState.plots,
        projects: propsRef.current.projects,
        recentEvents,
        idleSeconds: elapsed - lastDecisionAt,
      })
      if (!decision || cancelledLoads.value) return
      lastDecisionAt = elapsed
      applyAgentDecision(decision)
      callbacksRef.current.onAgentAction?.(decision)
    }

    function applyAgentDecision(d: AgentActionOutput) {
      agentDialogue = d.dialogue ?? ''
      switch (d.action) {
        case 'tendCrop': {
          const plot = farmState.plots.find((p) => p.id === d.targetId)
          if (plot) {
            agentTarget.copy(plotWorldPosition(plot)).add(new THREE.Vector3(1.4, 0, 1.4))
            agentMode = 'tend'
          }
          break
        }
        case 'moveToProject': {
          const plot = farmState.plots.find((p) => p.projectId === d.targetId)
          if (plot) {
            agentTarget.copy(plotWorldPosition(plot)).add(new THREE.Vector3(-1.4, 0, 1.4))
            agentMode = 'walk'
          }
          break
        }
        case 'goToPortal': {
          agentTarget.set(0, 0, (ROWS * PLOT_GAP) / 2 + 3)
          agentMode = 'walk'
          break
        }
        case 'walk': {
          const angle = Math.random() * Math.PI * 2
          const r = 4 + Math.random() * 8
          agentTarget.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
          agentMode = 'walk'
          break
        }
        case 'speak':
        case 'gesture':
          agentMode = 'speak'
          break
        default:
          agentMode = 'idle'
      }
    }

    async function addCrop(project: ProjectSeed, plot: FarmPlot) {
      if (pendingCrops.has(project.id) || cropRegistry.has(project.id)) return
      pendingCrops.add(project.id)
      const stage = plotStageFor(project)
      const node = await createPlantNode(project, sizeForStage(stage))
      pendingCrops.delete(project.id)
      if (cancelledLoads.value) {
        disposePlantNode(node)
        return
      }
      const stillWanted = propsRef.current.projects.some((p) => p.id === project.id)
      if (!stillWanted) {
        disposePlantNode(node)
        return
      }
      node.root.position.copy(plotWorldPosition(plot)).add(new THREE.Vector3(0, 0.7, 0))
      node.root.scale.setScalar(0.55) // 农场作物比墓塔 relic 小一圈，适配地块
      cropRegistry.set(project.id, { node, stage })
      world.add(node.root)
    }

    function syncFarm() {
      const current = propsRef.current.projects.slice(0, maxCrops)
      farmState = assignProjectsToPlots(tickFarm(farmState).state, current)

      // 建/更新地块 mesh
      for (const plot of farmState.plots) {
        let mesh = plotMeshes.get(plot.id)
        if (!mesh) {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(PLOT_GAP * 0.82, 0.5, PLOT_GAP * 0.82), plot.projectId ? soilMat : soilDryMat)
          mesh.position.copy(plotWorldPosition(plot))
          mesh.position.y = 0.25
          mesh.receiveShadow = true
          mesh.userData.plotId = plot.id
          plotMeshes.set(plot.id, mesh)
          world.add(mesh)
        }
        mesh.material = plot.projectId ? (plotNeedsCare(plot) ? soilDryMat : soilMat) : soilDryMat
      }

      // 移除已删作物的粒子
      const wanted = new Map(farmState.plots.filter((p) => p.projectId).map((p) => [p.projectId as string, p]))
      for (const [pid, entry] of cropRegistry) {
        if (!wanted.has(pid)) {
          entry.node.root.parent?.remove(entry.node.root)
          disposePlantNode(entry.node)
          cropRegistry.delete(pid)
        }
      }
      // 新增/更新作物
      for (const [pid, plot] of wanted) {
        const project = propsRef.current.projects.find((p) => p.id === pid)
        if (!project) continue
        const existing = cropRegistry.get(pid)
        if (!existing) {
          void addCrop(project, plot)
          continue
        }
        const stage = plotStageFor(project)
        if (existing.stage !== stage) {
          existing.stage = stage
          existing.node.status = project.status
          existing.node.setStage(project)
        }
      }
    }

    // ---- 交互 ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const pointerParallax = new THREE.Vector2()
    let pointerDown: { x: number; y: number } | null = null
    let lastHover = 0
    let mode: FarmRoomMode = 'overview'

    function updatePointer(e: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      pointerParallax.set(pointer.x, pointer.y)
    }

    function raycastInteractive() {
      raycaster.setFromCamera(pointer, camera)
      const crops = Array.from(cropRegistry.values(), (c) => c.node.hitProxy)
      const cropHits = raycaster.intersectObjects(crops, false)
      if (cropHits.length) {
        const name = cropHits[0].object.name
        return { kind: 'project' as const, id: name.startsWith('hit:') ? name.slice(4) : '' }
      }
      if (raycaster.intersectObject(house.group, true).length) return { kind: 'house' as const }
      if (raycaster.intersectObject(portal.group, true).length) return { kind: 'portal' as const }
      if (raycaster.intersectObject(agent.group, true).length) return { kind: 'agent' as const }
      const plotArr = Array.from(plotMeshes.values())
      const plotHits = raycaster.intersectObjects(plotArr, false)
      if (plotHits.length) return { kind: 'plot' as const, id: String(plotHits[0].object.userData.plotId ?? '') }
      return null
    }

    function onPointerMove(e: PointerEvent) {
      updatePointer(e)
      if (e.timeStamp - lastHover < 70) return
      lastHover = e.timeStamp
      canvasEl.style.cursor = raycastInteractive() ? 'pointer' : 'default'
    }
    function onPointerDown(e: PointerEvent) {
      updatePointer(e)
      pointerDown = { x: e.clientX, y: e.clientY }
    }
    function onPointerUp(e: PointerEvent) {
      updatePointer(e)
      if (!pointerDown || Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 5) {
        pointerDown = null
        return
      }
      pointerDown = null
      const hit = raycastInteractive()
      if (!hit) return
      if (hit.kind === 'project' && hit.id) callbacksRef.current.onProjectOpen?.(hit.id)
      else if (hit.kind === 'house') mode = mode === 'house' ? 'overview' : 'house'
      else if (hit.kind === 'portal') {
        mode = 'portal'
        window.setTimeout(() => callbacksRef.current.onExitToWorld?.(), 450)
      } else if (hit.kind === 'agent') {
        recentEvents.push('用户戳了戳 Agent')
        agentDialogue = agentDialogue || '你好呀，要我帮忙照看植物吗？'
        void requestDecision(timer.getElapsed())
      }
    }

    canvasEl.addEventListener('pointermove', onPointerMove)
    canvasEl.addEventListener('pointerdown', onPointerDown)
    canvasEl.addEventListener('pointerup', onPointerUp)

    function applySize() {
      const rect = canvasEl.getBoundingClientRect()
      const w = Math.max(1, rect.width || window.innerWidth)
      const h = Math.max(1, rect.height || window.innerHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      composer.setSize(w, h)
      bloom.resolution.set(w, h)
    }
    applySize()
    const resizeObserver = new ResizeObserver(applySize)
    resizeObserver.observe(canvasEl)
    window.addEventListener('resize', applySize)

    callbacksRef.current.onReady?.()
    canvasEl.dataset.sceneReady = 'true'

    const timer = new THREE.Timer()
    const desiredCamera = new THREE.Vector3()
    const desiredLook = new THREE.Vector3()
    let rafId = 0
    let lastFarmSync = -1
    let lastDecisionTry = 0

    function animate() {
      rafId = requestAnimationFrame(animate)
      timer.update()
      const delta = Math.min(timer.getDelta(), 0.05)
      const elapsed = timer.getElapsed()

      if (elapsed - lastFarmSync > 0.5) {
        syncFarm()
        lastFarmSync = elapsed
      }
      // Agent 决策节流
      if (elapsed - lastDecisionTry > 6) {
        lastDecisionTry = elapsed
        void requestDecision(elapsed)
      }

      // 相机模式
      if (mode === 'house') {
        desiredCamera.set(house.group.position.x, 6.5, house.group.position.z + 11)
        desiredLook.copy(house.group.position).add(new THREE.Vector3(0, 1.8, 0))
      } else if (mode === 'portal') {
        desiredCamera.set(portal.group.position.x, 4.5, portal.group.position.z + 8)
        desiredLook.copy(portal.group.position).add(new THREE.Vector3(0, 1.5, 0))
      } else {
        desiredCamera.set(20, 18, 26)
        desiredLook.set(0, 1, 0)
      }
      if (!reducedMotion) {
        desiredCamera.x += pointerParallax.x * 1.6
        desiredCamera.y += pointerParallax.y * 0.9
        desiredLook.x += pointerParallax.x * 0.5
      }
      const ease = 1 - Math.exp(-delta * 2.2)
      camera.position.lerp(desiredCamera, ease)
      cameraLook.lerp(desiredLook, ease)
      camera.lookAt(cameraLook)

      // Agent 移动与动画
      agent.group.position.lerp(agentTarget, 1 - Math.exp(-delta * 1.6))
      if (!reducedMotion) {
        agent.group.position.y = Math.abs(Math.sin(elapsed * 4)) * (agentMode === 'walk' || agentMode === 'tend' ? 0.12 : 0.03)
        agent.group.rotation.y = Math.atan2(camera.position.x - agent.group.position.x, camera.position.z - agent.group.position.z)
      }
      agent.animate(elapsed, delta, { mode: agentMode, thinking: brain.isThinking(), reducedMotion })

      // 传送门脉动
      portal.ringMat.opacity = 0.6 + Math.sin(elapsed * 2.4) * 0.16
      portal.coreMat.opacity = 0.24 + Math.sin(elapsed * 1.8) * 0.08
      fireflies.rotation.y += delta * 0.02

      for (const entry of cropRegistry.values()) animatePlantNode(entry.node, elapsed, delta, reducedMotion)

      composer.render()
    }
    animate()

    return () => {
      cancelledLoads.value = true
      brain.cancel()
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', applySize)
      canvasEl.removeEventListener('pointermove', onPointerMove)
      canvasEl.removeEventListener('pointerdown', onPointerDown)
      canvasEl.removeEventListener('pointerup', onPointerUp)
      delete canvasEl.dataset.sceneReady

      for (const entry of cropRegistry.values()) {
        entry.node.root.parent?.remove(entry.node.root)
        disposePlantNode(entry.node)
      }
      cropRegistry.clear()
      disposeSceneGraph(scene)
      ownedTextures.forEach((t) => t.dispose())
      composer.dispose()
      renderer.dispose()
    }
  }, [ownerName, accent])

  return <canvas ref={canvasRef} className="farm-room-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
}
