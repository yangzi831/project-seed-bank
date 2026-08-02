import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { Room, WorldIsland } from '../game/world'
import { buildWorldLayout, deriveManorMeta } from '../game/world'
import type { ManorMeta } from '../game/world'
import { getDeviceTier, prefersReducedMotion, shouldForce2D } from './webgl'
import { createRadialTexture, createTextSprite, disposeSceneGraph } from './primitives'
import { publicPath } from '../utils/publicPath'

type Props = {
  rooms: Room[]
  onEnterRoom?: (roomId: string) => void
  onSelectRoom?: (roomId: string | null) => void
  selectedRoomId?: string | null
  onReady?: () => void
}

/**
 * 庄园星图：纯 3D 星系地图。
 * 深空星云背景 + 发光庄园星球（带轨道环/名牌/大气壳） + 星路连线。
 * 点击星球 → 选中（相机飞近 + 底部面板）；点「沿星路拜访」→ onEnterRoom。
 */
export function WorldMapScene({ rooms, onEnterRoom, onSelectRoom, selectedRoomId, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ rooms, selectedRoomId })
  propsRef.current = { rooms, selectedRoomId }
  const callbacksRef = useRef({ onEnterRoom, onSelectRoom, onReady })
  callbacksRef.current = { onEnterRoom, onSelectRoom, onReady }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || shouldForce2D()) return
    const canvasEl = canvas

    const tier = getDeviceTier()
    const reducedMotion = prefersReducedMotion()
    const cancelledLoads = { value: false }
    const ownedTextures = new Set<THREE.Texture>()

    // ---- 渲染器 ----
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'low' ? 1.15 : tier === 'medium' ? 1.55 : 1.85))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    if (tier === 'low') {
      renderer.shadowMap.enabled = false
    }

    // ---- 场景 ----
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x05070d)

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500)
    camera.position.set(0, 90, 110)
    const cameraLook = new THREE.Vector3(0, 0, 0)
    camera.lookAt(cameraLook)

    // ---- 后处理 ----
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), tier === 'low' ? 0.42 : 0.55, 0.5, 0.7)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // ---- 光照 ----
    scene.add(new THREE.AmbientLight(0x1a2a3a, 1.0))
    const sunLight = new THREE.DirectionalLight(0xe8f0ff, 0.8)
    sunLight.position.set(40, 60, 30)
    scene.add(sunLight)

    // ---- 共享纹理 ----
    const softDot = createRadialTexture(['rgba(255,255,255,1)', 'rgba(255,255,255,.5)', 'rgba(255,255,255,0)'], ownedTextures)

    // ---- 星空背景 ----
    const starfield = createStarfield(tier, softDot)
    scene.add(starfield)

    // ---- 星云 ----
    const nebulae = createNebulae(tier, ownedTextures, reducedMotion)
    nebulae.forEach((n) => scene.add(n))

    // ---- 庄园星球注册表 ----
    type PlanetEntry = {
      room: Room
      meta: ManorMeta
      island: WorldIsland
      group: THREE.Group
      atmosphere: THREE.Mesh
      ring: THREE.Mesh
      ringMat: THREE.MeshBasicMaterial
      label: THREE.Sprite
      clueBadge: THREE.Sprite | null
      baseY: number
      phase: number
    }
    const planetRegistry = new Map<string, PlanetEntry>()
    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    function buildPlanet(room: Room, island: WorldIsland): PlanetEntry {
      const meta = deriveManorMeta(room)
      const group = new THREE.Group()
      group.name = `planet:${room.id}`
      const accent = new THREE.Color(room.accent)

      // 星球球体
      const planetGeo = new THREE.SphereGeometry(meta.radius, 48, 36)
      // 先用纯色 fallback，异步加载贴图
      const fallbackColor = room.isOwn ? 0x2e5a4a : new THREE.Color(room.accent).multiplyScalar(0.5).getHex()
      const planetMat = new THREE.MeshStandardMaterial({
        color: fallbackColor,
        roughness: 0.7,
        metalness: 0.1,
        emissive: new THREE.Color(room.accent).multiplyScalar(0.15),
        emissiveIntensity: 0.4,
      })
      const planet = new THREE.Mesh(planetGeo, planetMat)
      planet.castShadow = tier !== 'low'
      planet.receiveShadow = tier !== 'low'
      planet.userData.roomId = room.id
      group.add(planet)

      // 异步加载贴图
      loadPlanetTexture(meta.imagePath, cancelledLoads, ownedTextures).then((tex) => {
        if (tex) {
          planetMat.map = tex
          planetMat.color.set(0xffffff)
          planetMat.needsUpdate = true
        }
      })

      // 大气壳（AdditiveBlending 背面球，稍大）
      const atmoGeo = new THREE.SphereGeometry(meta.radius * 1.12, 36, 24)
      const atmoMat = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
        toneMapped: false,
      })
      const atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
      group.add(atmosphere)

      // 轨道环
      const ringGeo = new THREE.RingGeometry(meta.radius * 1.28, meta.radius * 1.38, 80)
      // 旋转 ring 使其平放（倾斜）
      const ringMat = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: room.isOwn ? 0.55 : 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2.6
      ring.rotation.y = island.angle * 0.3
      group.add(ring)

      // 名牌
      const label = createTextSprite(`${room.isOwn ? '🏠 ' : ''}${room.ownerName}`, ownedTextures, {
        size: room.isOwn ? 2.4 : 2.0,
        color: '#f2f6ff',
        bg: room.isOwn ? 'rgba(40,90,60,0.65)' : 'rgba(30,40,60,0.6)',
      })
      label.position.y = meta.radius + 1.8
      label.name = 'label'
      group.add(label)

      // 新线索金色徽标
      let clueBadge: THREE.Sprite | null = null
      if (meta.hasClue && !room.isOwn) {
        clueBadge = createTextSprite('✦ 线索', ownedTextures, {
          size: 1.2,
          color: '#ffe8a0',
          bg: 'rgba(80,60,20,0.7)',
        })
        clueBadge.position.y = meta.radius + 0.7
        clueBadge.position.x = meta.radius * 0.7
        clueBadge.name = 'clueBadge'
        group.add(clueBadge)
      }

      group.position.set(island.x, 0, island.z)
      group.userData.roomId = room.id
      worldGroup.add(group)

      return {
        room,
        meta,
        island,
        group,
        atmosphere,
        ring,
        ringMat,
        label,
        clueBadge,
        baseY: 0,
        phase: Math.random() * Math.PI * 2,
      }
    }

    function syncPlanets() {
      const rooms = propsRef.current.rooms
      const layout = buildWorldLayout(rooms.map((r) => r.id))
      const wanted = new Map(rooms.map((r, i) => [r.id, { room: r, island: layout[i] }]))

      for (const [id, entry] of planetRegistry) {
        if (!wanted.has(id)) {
          entry.group.parent?.remove(entry.group)
          planetRegistry.delete(id)
        }
      }
      for (const [id, { room, island }] of wanted) {
        if (!planetRegistry.has(id)) {
          planetRegistry.set(id, buildPlanet(room, island))
        }
      }
    }
    syncPlanets()

    // ---- 星路连线 ----
    const starPathsGroup = new THREE.Group()
    scene.add(starPathsGroup)

    function buildStarPaths() {
      // 清除旧连线
      while (starPathsGroup.children.length) {
        const child = starPathsGroup.children[0]
        if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
          child.geometry?.dispose()
          const mat = (child as THREE.Line).material as THREE.Material
          mat?.dispose()
        }
        starPathsGroup.remove(child)
      }

      const ownEntry = Array.from(planetRegistry.values()).find((e) => e.room.isOwn)
      if (!ownEntry) return

      const ownPos = ownEntry.group.position.clone()
      const others = Array.from(planetRegistry.values()).filter((e) => !e.room.isOwn)

      for (const entry of others) {
        const targetPos = entry.group.position.clone()
        const mid = new THREE.Vector3().addVectors(ownPos, targetPos).multiplyScalar(0.5)
        // 弧线向上拱
        const dist = ownPos.distanceTo(targetPos)
        mid.y += dist * 0.15

        const curve = new THREE.QuadraticBezierCurve3(ownPos.clone(), mid, targetPos)
        const points = curve.getPoints(40)
        const geo = new THREE.BufferGeometry().setFromPoints(points)
        const mat = new THREE.LineDashedMaterial({
          color: 0x4a6a8a,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          dashSize: 2.5,
          gapSize: 1.5,
          toneMapped: false,
        })
        const line = new THREE.Line(geo, mat)
        line.computeLineDistances()
        line.name = `path:${entry.room.id}`
        starPathsGroup.add(line)
      }
    }
    buildStarPaths()

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

    function raycastPlanets(): string | null {
      raycaster.setFromCamera(pointer, camera)
      const groups = Array.from(planetRegistry.values(), (e) => e.group)
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
      canvasEl.style.cursor = raycastPlanets() ? 'pointer' : 'default'
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
      const roomId = raycastPlanets()
      if (roomId) {
        const entry = planetRegistry.get(roomId)
        if (entry) {
          flyTarget = { roomId, pos: entry.group.position.clone() }
          callbacksRef.current.onSelectRoom?.(roomId)
        }
      } else {
        // 点击空白 → 取消选中
        flyTarget = null
        callbacksRef.current.onSelectRoom?.(null)
      }
    }

    canvasEl.addEventListener('pointermove', onPointerMove)
    canvasEl.addEventListener('pointerdown', onPointerDown)
    canvasEl.addEventListener('pointerup', onPointerUp)

    // ---- resize ----
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

    // ---- 动画循环 ----
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
        syncPlanets()
        buildStarPaths()
        lastSync = elapsed
      }

      // 更新选中高亮状态
      const selId = propsRef.current.selectedRoomId
      for (const [id, entry] of planetRegistry) {
        const isSelected = selId === id
        // 高亮选中的轨道环
        entry.ringMat.opacity = THREE.MathUtils.lerp(
          entry.ringMat.opacity,
          isSelected ? 0.85 : (entry.room.isOwn ? 0.55 : 0.32),
          delta * 4,
        )
        // 大气壳亮度
        const atmo = entry.atmosphere.material as THREE.MeshBasicMaterial
        atmo.opacity = THREE.MathUtils.lerp(atmo.opacity, isSelected ? 0.4 : 0.22, delta * 4)
        // 高亮连线
        starPathsGroup.children.forEach((child) => {
          if (child.name === `path:${id}`) {
            const mat = (child as THREE.Line).material as THREE.LineDashedMaterial
            mat.opacity = THREE.MathUtils.lerp(mat.opacity, isSelected ? 0.7 : 0.35, delta * 4)
          }
        })
      }

      // 相机：默认高空环绕俯瞰；有 flyTarget 时飞向该星球
      if (flyTarget) {
        desiredCamera.set(flyTarget.pos.x, 18, flyTarget.pos.z + 22)
        desiredLook.copy(flyTarget.pos).add(new THREE.Vector3(0, 2, 0))
      } else {
        const orbit = reducedMotion ? 0 : elapsed * 0.04
        desiredCamera.set(Math.sin(orbit) * 80, 70, Math.cos(orbit) * 80)
        desiredLook.set(0, 0, 0)
        if (!reducedMotion) {
          desiredCamera.x += pointerParallax.x * 5
          desiredCamera.y += pointerParallax.y * 2.5
        }
      }
      const ease = 1 - Math.exp(-delta * 1.4)
      camera.position.lerp(desiredCamera, ease)
      cameraLook.lerp(desiredLook, ease)
      camera.lookAt(cameraLook)

      // 星球轻微浮动 + 轨道环脉动
      for (const entry of planetRegistry.values()) {
        entry.group.position.y = entry.baseY + (reducedMotion ? 0 : Math.sin(elapsed * 0.5 + entry.phase) * 0.3)
        entry.ring.rotation.z += delta * 0.15
        entry.atmosphere.rotation.y += delta * 0.08
        entry.atmosphere.rotation.x += delta * 0.04
      }

      // 星空旋转
      starfield.rotation.y += delta * 0.003
      // 星云漂移
      nebulae.forEach((n) => {
        n.rotation.z += delta * 0.02
        n.position.x += Math.sin(elapsed * 0.1) * delta * 0.3
        n.position.y += Math.cos(elapsed * 0.12) * delta * 0.2
      })

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
      planetRegistry.clear()
      disposeSceneGraph(scene)
      ownedTextures.forEach((t) => t.dispose())
      composer.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="world-map-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
}

// ---- 星空背景 ----
function createStarfield(tier: ReturnType<typeof getDeviceTier>, dotTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group()
  const count = tier === 'low' ? 300 : tier === 'medium' ? 600 : 900

  // 三层：远小星、中星、近大亮星
  const layers: Array<{ count: number; size: number; color: string; radius: number; yOffset: number }> = [
    { count: Math.floor(count * 0.55), size: 0.08, color: '#b0c8e8', radius: 140, yOffset: 0 },
    { count: Math.floor(count * 0.30), size: 0.14, color: '#d0e0f8', radius: 110, yOffset: 10 },
    { count: Math.floor(count * 0.15), size: 0.22, color: '#e8f0ff', radius: 90, yOffset: -5 },
  ]

  for (const layer of layers) {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(layer.count * 3)
    for (let i = 0; i < layer.count; i++) {
      // 球形分布
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = layer.radius * (0.7 + Math.random() * 0.3)
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r + layer.yOffset
      positions[i * 3 + 2] = Math.cos(phi) * r
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(layer.color),
      size: layer.size,
      map: dotTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    })
    group.add(new THREE.Points(geo, mat))
  }
  return group
}

// ---- 星云（程序化 canvas 纹理） ----
function createNebulae(
  tier: ReturnType<typeof getDeviceTier>,
  ownedTextures: Set<THREE.Texture>,
  _reducedMotion: boolean,
): THREE.Sprite[] {
  const count = tier === 'low' ? 2 : 3
  const nebulae: THREE.Sprite[] = []

  for (let i = 0; i < count; i++) {
    const tex = createNebulaTexture(256 + i * 64, ownedTextures)
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color().setHSL(0.55 + i * 0.12, 0.4, 0.3 + i * 0.1),
      transparent: true,
      opacity: 0.18 + i * 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const sprite = new THREE.Sprite(mat)
    const scale = 60 + i * 25
    sprite.scale.set(scale, scale * 0.6, 1)
    // 放在远景不同位置
    sprite.position.set(
      (i - 1) * 35,
      -15 + i * 8,
      -60 - i * 10,
    )
    sprite.rotation.z = i * 0.8
    nebulae.push(sprite)
  }
  return nebulae
}

function createNebulaTexture(size: number, ownedTextures: Set<THREE.Texture>): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // 多层径向渐变叠加
  const centers = [
    { x: 0.35, y: 0.4, r: 0.5, color: 'rgba(80,140,200,0.12)' },
    { x: 0.6, y: 0.55, r: 0.4, color: 'rgba(60,100,160,0.10)' },
    { x: 0.45, y: 0.5, r: 0.35, color: 'rgba(100,160,220,0.08)' },
    { x: 0.3, y: 0.6, r: 0.3, color: 'rgba(40,80,140,0.06)' },
  ]

  for (const c of centers) {
    const grad = ctx.createRadialGradient(c.x * size, c.y * size, 0, c.x * size, c.y * size, c.r * size)
    grad.addColorStop(0, c.color)
    grad.addColorStop(0.5, c.color.replace(/[\d.]+\)$/, '0.04)'))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }

  // 添加一些随机亮点
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 1 + Math.random() * 3
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  ownedTextures.add(texture)
  return texture
}

// ---- 贴图异步加载 ----
async function loadPlanetTexture(
  path: string,
  cancelled: { value: boolean },
  ownedTextures: Set<THREE.Texture>,
): Promise<THREE.Texture | null> {
  try {
    const url = publicPath(path)
    const tex = new THREE.TextureLoader().loadAsync(url)
    const result = await tex
    if (cancelled.value) {
      result.dispose()
      return null
    }
    result.colorSpace = THREE.SRGBColorSpace
    ownedTextures.add(result)
    return result
  } catch {
    return null
  }
}
