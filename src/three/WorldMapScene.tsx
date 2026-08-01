import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { Room, WorldIsland } from '../game/world'
import { buildWorldLayout } from '../game/world'
import { getDeviceTier, prefersReducedMotion, shouldForce2D } from './webgl'
import { createFireflies, createPortal, createRadialTexture, createTextSprite, disposeSceneGraph } from './primitives'

type Props = {
  rooms: Room[]
  onEnterRoom?: (roomId: string) => void
  onReady?: () => void
}

/**
 * 世界大地图：每个房间一座浮岛，金角螺旋排布。
 * 点击岛屿/传送门 → onEnterRoom（相机先飞向该岛再切换）。
 */
export function WorldMapScene({ rooms, onEnterRoom, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ rooms })
  propsRef.current = { rooms }
  const callbacksRef = useRef({ onEnterRoom, onReady })
  callbacksRef.current = { onEnterRoom, onReady }

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
    renderer.toneMappingExposure = 1.2

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x070b16)
    scene.fog = new THREE.FogExp2(0x070b16, 0.012)

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400)
    camera.position.set(0, 60, 80)
    const cameraLook = new THREE.Vector3(0, 0, 0)
    camera.lookAt(cameraLook)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), tier === 'low' ? 0.4 : 0.62, 0.5, 0.7)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    scene.add(new THREE.HemisphereLight(0x8fb8e8, 0x0c0a14, 1.2))
    const moon = new THREE.DirectionalLight(0xcfe0ff, 1.0)
    moon.position.set(30, 50, 20)
    scene.add(moon)

    const glowTexture = createRadialTexture(['rgba(255,255,255,.95)', 'rgba(255,255,255,.4)', 'rgba(255,255,255,0)'], ownedTextures)
    const softDot = createRadialTexture(['rgba(255,255,255,1)', 'rgba(255,255,255,.5)', 'rgba(255,255,255,0)'], ownedTextures)

    // 星空背景
    const stars = createFireflies(tier === 'low' ? 200 : 500, softDot, '#cfe0ff')
    stars.scale.setScalar(8)
    stars.position.y = -10
    scene.add(stars)

    // ---- 浮岛注册表 ----
    type IslandEntry = {
      room: Room
      island: WorldIsland
      group: THREE.Group
      portal: ReturnType<typeof createPortal>
      baseY: number
      phase: number
    }
    const islandRegistry = new Map<string, IslandEntry>()
    const world = new THREE.Group()
    scene.add(world)

    function buildIsland(room: Room, island: WorldIsland): IslandEntry {
      const group = new THREE.Group()
      group.name = `island:${room.id}`
      const accent = new THREE.Color(room.accent)

      // 浮岛基座（上宽下窄的圆柱 + 锥底）
      const topMat = new THREE.MeshStandardMaterial({ color: room.isOwn ? 0x2e5a3a : 0x37455a, roughness: 0.9 })
      const top = new THREE.Mesh(new THREE.CylinderGeometry(9, 7.5, 2.4, 24), topMat)
      top.receiveShadow = true
      const base = new THREE.Mesh(new THREE.ConeGeometry(7.5, 6, 24), new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.95 }))
      base.position.y = -4.2
      base.rotation.x = Math.PI
      // 迷你房子/传送门作为标识
      const portal = createPortal(room.accent, glowTexture)
      portal.group.scale.setScalar(0.85)
      portal.group.position.y = 1.2
      // 名牌
      const label = createTextSprite(`${room.isOwn ? '🏠 ' : ''}${room.ownerName}`, ownedTextures, {
        size: 2.0,
        color: '#f2f6ff',
        bg: room.isOwn ? 'rgba(40,90,60,0.65)' : 'rgba(30,40,60,0.6)',
      })
      label.position.y = 5.2
      // 岛上点缀几株发光植物（简化：光点环）
      const ringGeo = new THREE.TorusGeometry(6, 0.12, 8, 40)
      const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2
      ring.position.y = 1.25

      group.add(top, base, portal.group, label, ring)
      group.position.set(island.x, 0, island.z)
      group.userData.roomId = room.id
      world.add(group)
      return { room, island, group, portal, baseY: 0, phase: Math.random() * Math.PI * 2 }
    }

    function syncIslands() {
      const rooms = propsRef.current.rooms
      const layout = buildWorldLayout(rooms.map((r) => r.id))
      const wanted = new Map(rooms.map((r, i) => [r.id, { room: r, island: layout[i] }]))

      for (const [id, entry] of islandRegistry) {
        if (!wanted.has(id)) {
          entry.group.parent?.remove(entry.group)
          islandRegistry.delete(id)
        }
      }
      for (const [id, { room, island }] of wanted) {
        if (!islandRegistry.has(id)) {
          islandRegistry.set(id, buildIsland(room, island))
        }
      }
    }
    syncIslands()

    // ---- 交互 ----
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const pointerParallax = new THREE.Vector2()
    let pointerDown: { x: number; y: number } | null = null
    let lastHover = 0
    let flyTarget: { roomId: string; pos: THREE.Vector3 } | null = null

    function updatePointer(e: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      pointerParallax.set(pointer.x, pointer.y)
    }

    function raycastIslands(): string | null {
      raycaster.setFromCamera(pointer, camera)
      const groups = Array.from(islandRegistry.values(), (e) => e.group)
      const hits = raycaster.intersectObjects(groups, true)
      if (!hits.length) return null
      let obj: THREE.Object3D | null = hits[0].object
      while (obj && !obj.userData.roomId) obj = obj.parent
      return obj?.userData.roomId ?? null
    }

    function onPointerMove(e: PointerEvent) {
      updatePointer(e)
      if (e.timeStamp - lastHover < 70) return
      lastHover = e.timeStamp
      canvasEl.style.cursor = raycastIslands() ? 'pointer' : 'default'
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
      const roomId = raycastIslands()
      if (!roomId) return
      const entry = islandRegistry.get(roomId)
      if (entry) {
        flyTarget = { roomId, pos: entry.group.position.clone() }
        // 飞向该岛后再进入
        window.setTimeout(() => callbacksRef.current.onEnterRoom?.(roomId), 650)
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
    let lastSync = -1

    function animate() {
      rafId = requestAnimationFrame(animate)
      timer.update()
      const delta = Math.min(timer.getDelta(), 0.05)
      const elapsed = timer.getElapsed()

      if (elapsed - lastSync > 0.8) {
        syncIslands()
        lastSync = elapsed
      }

      // 相机：默认高空环绕俯瞰；有 flyTarget 时飞向该岛
      if (flyTarget) {
        desiredCamera.set(flyTarget.pos.x, 14, flyTarget.pos.z + 18)
        desiredLook.copy(flyTarget.pos).add(new THREE.Vector3(0, 2, 0))
      } else {
        const orbit = reducedMotion ? 0 : elapsed * 0.05
        desiredCamera.set(Math.sin(orbit) * 70, 58, Math.cos(orbit) * 70)
        desiredLook.set(0, 0, 0)
        if (!reducedMotion) {
          desiredCamera.x += pointerParallax.x * 4
          desiredCamera.y += pointerParallax.y * 2
        }
      }
      const ease = 1 - Math.exp(-delta * 1.6)
      camera.position.lerp(desiredCamera, ease)
      cameraLook.lerp(desiredLook, ease)
      camera.lookAt(cameraLook)

      // 浮岛轻微浮动 + 传送门脉动
      for (const entry of islandRegistry.values()) {
        entry.group.position.y = entry.baseY + (reducedMotion ? 0 : Math.sin(elapsed * 0.7 + entry.phase) * 0.4)
        entry.portal.ringMat.opacity = 0.55 + Math.sin(elapsed * 2.2 + entry.phase) * 0.18
      }
      stars.rotation.y += delta * 0.004

      composer.render()
    }
    animate()

    return () => {
      cancelledLoads.value = true
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', applySize)
      canvasEl.removeEventListener('pointermove', onPointerMove)
      canvasEl.removeEventListener('pointerdown', onPointerDown)
      canvasEl.removeEventListener('pointerup', onPointerUp)
      delete canvasEl.dataset.sceneReady
      islandRegistry.clear()
      disposeSceneGraph(scene)
      ownedTextures.forEach((t) => t.dispose())
      composer.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="world-map-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
}
