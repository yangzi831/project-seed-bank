import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import type { ProjectSeed, ZoneKey } from '../data/garden'
import { DUNGEON_FLOORS, DUNGEON_TILE_COUNT, TILES_PER_FLOOR } from '../game/dungeon'
import type { DungeonPlayer } from '../game/dungeon'
import { publicPath } from '../utils/publicPath'
import { animatePlantNode, createPlantNode, disposePlantNode } from './PlantParticleSystem'
import type { PlantNode } from './PlantParticleSystem'
import { getDeviceTier, prefersReducedMotion, shouldForce2D } from './webgl'

export type DungeonSceneMode = 'overview' | 'board' | 'archive' | 'floor'

type DungeonBoardSceneProps = {
  mode: DungeonSceneMode
  activeFloor?: number
  projects: ProjectSeed[]
  players: [DungeonPlayer, DungeonPlayer]
  devilPosition: number
  devilEnraged: boolean
  started: boolean
  onProjectOpen?: (projectId: string) => void
  onFloorSelect?: (floor: number) => void
  onReady?: () => void
}

export type DungeonTile = {
  index: number
  floor: number
  slot: number
  position: THREE.Vector3
  rotationY: number
}

const zoneFloor: Record<ZoneKey, number> = {
  flower: 0,
  water: 1,
  exhibition: 2,
  woodland: 3,
  experiment: 4,
}

const floorNames = ['灰烬门厅', '溺影回廊', '献祭展室', '枯王林墓', '炼金禁层', '黎明墓门']

export function buildDungeonPath(): DungeonTile[] {
  const tiles: DungeonTile[] = []
  for (let floor = 0; floor < DUNGEON_FLOORS; floor += 1) {
    const radius = 15 - floor * 1.32
    const floorOffset = floor * 0.54
    for (let slot = 0; slot < TILES_PER_FLOOR; slot += 1) {
      const index = floor * TILES_PER_FLOOR + slot
      const angle = floorOffset + (slot / TILES_PER_FLOOR) * Math.PI * 2
      const rise = floor * 2.58 + slot * 0.12
      tiles.push({
        index,
        floor,
        slot,
        position: new THREE.Vector3(Math.cos(angle) * radius, rise, Math.sin(angle) * radius),
        rotationY: -angle + Math.PI / 2,
      })
    }
  }
  return tiles
}

export function DungeonBoardScene({
  mode,
  activeFloor,
  projects,
  players,
  devilPosition,
  devilEnraged,
  started,
  onProjectOpen,
  onFloorSelect,
  onReady,
}: DungeonBoardSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ mode, activeFloor, projects, players, devilPosition, devilEnraged, started })
  propsRef.current = { mode, activeFloor, projects, players, devilPosition, devilEnraged, started }
  const callbacksRef = useRef({ onProjectOpen, onFloorSelect, onReady })
  callbacksRef.current = { onProjectOpen, onFloorSelect, onReady }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || shouldForce2D()) return
    const canvasEl = canvas

    const tier = getDeviceTier()
    const reducedMotion = prefersReducedMotion()
    const path = buildDungeonPath()
    const cancelledLoads = { value: false }
    const ownedTextures = new Set<THREE.Texture>()

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: tier !== 'low',
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'low' ? 1.15 : tier === 'medium' ? 1.55 : 1.85))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.28
    renderer.shadowMap.enabled = tier !== 'low'
    renderer.shadowMap.type = THREE.PCFShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0908)
    scene.fog = new THREE.FogExp2(0x0b0908, 0.016)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160)
    camera.position.set(25, 23, 30)
    const cameraLook = new THREE.Vector3(0, 5, 0)
    camera.lookAt(cameraLook)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), tier === 'low' ? 0.42 : 0.68, 0.52, 0.7)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    const fallbackRock = createProceduralPbrTextures('rock', ownedTextures)
    const fallbackWood = createProceduralPbrTextures('wood', ownedTextures)
    const fallbackMetal = createProceduralPbrTextures('metal', ownedTextures)

    const rockMaterials = Array.from({ length: DUNGEON_FLOORS }, (_, floor) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.09, 0.18, 0.29 + floor * 0.012),
        map: fallbackRock.map,
        normalMap: fallbackRock.normalMap,
        roughnessMap: fallbackRock.roughnessMap,
        normalScale: new THREE.Vector2(0.72, 0.72),
        roughness: 0.96,
        metalness: 0.02,
        emissive: 0x2b1608,
        emissiveIntensity: 0.26,
      }),
    )
    const rockMaterial = rockMaterials[0]
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x654326,
      map: fallbackWood.map,
      normalMap: fallbackWood.normalMap,
      roughnessMap: fallbackWood.roughnessMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.88,
      metalness: 0.02,
    })
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a642f,
      map: fallbackMetal.map,
      normalMap: fallbackMetal.normalMap,
      roughnessMap: fallbackMetal.roughnessMap,
      metalnessMap: fallbackMetal.metalnessMap,
      normalScale: new THREE.Vector2(0.52, 0.52),
      roughness: 0.62,
      metalness: 0.82,
    })

    const loader = new THREE.TextureLoader()
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    loadTextureSet({
      loader,
      cancelledLoads,
      ownedTextures,
      maxAnisotropy,
      repeat: [3, 3],
      color: '/textures/dungeon/rock035/Rock035_1K-JPG_Color.jpg',
      normal: '/textures/dungeon/rock035/Rock035_1K-JPG_NormalGL.jpg',
      roughness: '/textures/dungeon/rock035/Rock035_1K-JPG_Roughness.jpg',
      onColor: (texture) => rockMaterials.forEach((material) => updateMaterialTexture(material, 'map', texture)),
      onNormal: (texture) => rockMaterials.forEach((material) => updateMaterialTexture(material, 'normalMap', texture)),
      onRoughness: (texture) => rockMaterials.forEach((material) => updateMaterialTexture(material, 'roughnessMap', texture)),
    })
    loadTextureSet({
      loader,
      cancelledLoads,
      ownedTextures,
      maxAnisotropy,
      repeat: [2.5, 2.5],
      color: '/textures/dungeon/wood026/Wood026_1K-JPG_Color.jpg',
      normal: '/textures/dungeon/wood026/Wood026_1K-JPG_NormalGL.jpg',
      roughness: '/textures/dungeon/wood026/Wood026_1K-JPG_Roughness.jpg',
      onColor: (texture) => updateMaterialTexture(woodMaterial, 'map', texture),
      onNormal: (texture) => updateMaterialTexture(woodMaterial, 'normalMap', texture),
      onRoughness: (texture) => updateMaterialTexture(woodMaterial, 'roughnessMap', texture),
    })
    loadTextureSet({
      loader,
      cancelledLoads,
      ownedTextures,
      maxAnisotropy,
      repeat: [2, 2],
      color: '/textures/dungeon/metal032/Metal032_1K-JPG_Color.jpg',
      normal: '/textures/dungeon/metal032/Metal032_1K-JPG_NormalGL.jpg',
      roughness: '/textures/dungeon/metal032/Metal032_1K-JPG_Roughness.jpg',
      metalness: '/textures/dungeon/metal032/Metal032_1K-JPG_Metalness.jpg',
      onColor: (texture) => updateMaterialTexture(metalMaterial, 'map', texture),
      onNormal: (texture) => updateMaterialTexture(metalMaterial, 'normalMap', texture),
      onRoughness: (texture) => updateMaterialTexture(metalMaterial, 'roughnessMap', texture),
      onMetalness: (texture) => updateMaterialTexture(metalMaterial, 'metalnessMap', texture),
    })

    const world = new THREE.Group()
    world.name = 'six-floor-dungeon-board'
    scene.add(world)

    const table = new THREE.Mesh(new THREE.CylinderGeometry(23.5, 24.5, 1.25, 64), woodMaterial)
    table.position.y = -1.55
    table.castShadow = true
    table.receiveShadow = true
    world.add(table)

    const tableBand = new THREE.Mesh(new THREE.TorusGeometry(23.6, 0.42, 10, 96), metalMaterial)
    tableBand.rotation.x = Math.PI / 2
    tableBand.position.y = -0.98
    tableBand.castShadow = true
    world.add(tableBand)

    for (let floor = 0; floor < DUNGEON_FLOORS; floor += 1) {
      const floorTiles = path.filter((tile) => tile.floor === floor)
      const radius = Math.hypot(floorTiles[0].position.x, floorTiles[0].position.z)
      const platform = new THREE.Mesh(new THREE.RingGeometry(radius - 2.15, radius + 2.15, 72), rockMaterials[floor])
      platform.rotation.x = -Math.PI / 2
      platform.position.y = floor * 2.58 - 0.42
      platform.receiveShadow = true
      world.add(platform)

      const innerBand = new THREE.Mesh(new THREE.TorusGeometry(radius - 2.06, 0.22, 8, 72), metalMaterial)
      innerBand.rotation.x = Math.PI / 2
      innerBand.position.y = platform.position.y + 0.08
      world.add(innerBand)

      const plaque = createTextSprite(`第 ${floor + 1} 层 · ${floorNames[floor]}`, '#ffd98c', ownedTextures, 520, 88)
      const plaqueTile = floorTiles[6]
      plaque.position.copy(plaqueTile.position).add(new THREE.Vector3(0, 2.25, 0))
      plaque.scale.set(5.6, 0.95, 1)
      world.add(plaque)
    }

    const tileGeometry = new THREE.BoxGeometry(3.1, 0.62, 2.12, 2, 1, 2)
    const tileMeshes: THREE.Mesh[] = []
    path.forEach((tile) => {
      const mesh = new THREE.Mesh(tileGeometry, rockMaterials[tile.floor])
      mesh.position.copy(tile.position)
      mesh.rotation.set((seededNoise(tile.index + 13) - 0.5) * 0.045, tile.rotationY, (seededNoise(tile.index + 71) - 0.5) * 0.05)
      mesh.castShadow = tier !== 'low'
      mesh.receiveShadow = true
      mesh.userData.tileIndex = tile.index
      mesh.userData.floor = tile.floor
      tileMeshes.push(mesh)
      world.add(mesh)

      const number = createTextSprite(String(tile.index + 1).padStart(2, '0'), tile.index === DUNGEON_TILE_COUNT - 1 ? '#9fe79f' : '#ffd98c', ownedTextures, 180, 128)
      number.position.copy(tile.position).add(new THREE.Vector3(0, 0.78, 0))
      number.scale.set(1.35, 0.84, 1)
      number.userData.tileIndex = tile.index
      number.userData.floor = tile.floor
      world.add(number)
    })

    for (let index = 0; index < path.length - 1; index += 1) {
      const start = path[index].position.clone()
      const end = path[index + 1].position.clone()
      const bridge = createBridge(start, end, index % 8 === 7 ? metalMaterial : woodMaterial)
      bridge.castShadow = tier !== 'low'
      bridge.receiveShadow = true
      world.add(bridge)
    }

    const torchFlameTexture = createRadialTexture(['rgba(255,248,190,1)', 'rgba(255,110,20,.95)', 'rgba(120,10,0,0)'], ownedTextures)
    const torches: Array<{ group: THREE.Group; flame: THREE.Sprite; light: THREE.PointLight; phase: number }> = []
    for (let floor = 0; floor < DUNGEON_FLOORS; floor += 1) {
      if (tier === 'low' && floor % 2 === 1) continue
      const tile = path[floor * TILES_PER_FLOOR + 3]
      const torch = createTorch(torchFlameTexture, metalMaterial)
      torch.group.position.copy(tile.position).add(new THREE.Vector3(0, 1.15, 0))
      torch.group.position.multiplyScalar(1.045)
      torch.group.position.y = tile.position.y + 1.15
      world.add(torch.group)
      torches.push(torch)
    }

    const pillarGeometry = new THREE.CylinderGeometry(0.65, 0.92, 7.4, 8, 3)
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2 + 0.2
      const pillar = new THREE.Mesh(pillarGeometry, rockMaterial)
      pillar.position.set(Math.cos(angle) * 20.5, 2.35 - (index % 4 === 0 ? 1.4 : 0), Math.sin(angle) * 20.5)
      pillar.rotation.y = -angle + 0.2
      pillar.rotation.z = (seededNoise(index + 40) - 0.5) * 0.08
      pillar.scale.y = index % 4 === 0 ? 0.62 : 1
      pillar.castShadow = tier !== 'low'
      pillar.receiveShadow = true
      world.add(pillar)
    }

    const ambient = new THREE.HemisphereLight(0x617996, 0x241006, 2.05)
    scene.add(ambient)
    const moon = new THREE.DirectionalLight(0x91abc2, 3.4)
    moon.position.set(-18, 30, -12)
    moon.castShadow = tier !== 'low'
    moon.shadow.mapSize.set(tier === 'high' ? 1536 : 1024, tier === 'high' ? 1536 : 1024)
    moon.shadow.camera.left = -28
    moon.shadow.camera.right = 28
    moon.shadow.camera.top = 28
    moon.shadow.camera.bottom = -28
    moon.shadow.camera.near = 1
    moon.shadow.camera.far = 80
    moon.shadow.bias = -0.0002
    moon.shadow.normalBias = 0.04
    scene.add(moon)
    const warmKey = new THREE.SpotLight(0xffbf68, 54, 90, Math.PI / 3.8, 0.72, 1.75)
    warmKey.position.set(12, 28, 18)
    warmKey.target.position.set(0, 4, 0)
    scene.add(warmKey, warmKey.target)
    const towerRim = new THREE.DirectionalLight(0x6e91b5, 2.15)
    towerRim.position.set(-24, 17, 16)
    towerRim.target.position.set(0, 7, 0)
    scene.add(towerRim, towerRim.target)
    const emberFill = new THREE.PointLight(0xd66b2a, tier === 'low' ? 5 : 9, 46, 1.7)
    emberFill.position.set(3, 7, -4)
    scene.add(emberFill)

    const particleTexture = createRadialTexture(['rgba(255,255,255,1)', 'rgba(255,110,35,.82)', 'rgba(70,0,0,0)'], ownedTextures)
    const devil = createDevil(particleTexture)
    world.add(devil.group)
    const playerTokens = [createPlayerToken(players[0], metalMaterial), createPlayerToken(players[1], metalMaterial)] as const
    world.add(playerTokens[0].group, playerTokens[1].group)

    const portal = createEscapePortal(metalMaterial, ownedTextures)
    const finalTile = path[path.length - 1]
    portal.group.position.copy(finalTile.position).add(new THREE.Vector3(0, 2.4, 0))
    portal.group.rotation.y = finalTile.rotationY + Math.PI / 2
    world.add(portal.group)

    const dust = createDust(tier === 'low' ? 180 : tier === 'medium' ? 320 : 480, particleTexture)
    scene.add(dust)

    const relicRegistry = new Map<string, { node: PlantNode; status: ProjectSeed['status']; tileIndex: number }>()
    const pendingRelics = new Set<string>()

    async function addRelic(project: ProjectSeed, tileIndex: number) {
      if (pendingRelics.has(project.id) || relicRegistry.has(project.id)) return
      pendingRelics.add(project.id)
      const node = await createPlantNode(project, 'relic')
      pendingRelics.delete(project.id)
      if (cancelledLoads.value) {
        disposePlantNode(node)
        return
      }
      const wanted = selectRelicProjects(propsRef.current.projects, tier, propsRef.current.mode, propsRef.current.activeFloor)
      if (!wanted.some((item) => item.project.id === project.id)) {
        disposePlantNode(node)
        return
      }
      placeRelic(node, path[tileIndex], project.id)
      relicRegistry.set(project.id, { node, status: project.status, tileIndex })
      world.add(node.root)
    }

    function syncRelics() {
      const wanted = selectRelicProjects(propsRef.current.projects, tier, propsRef.current.mode, propsRef.current.activeFloor)
      const wantedMap = new Map(wanted.map((item) => [item.project.id, item]))

      for (const [id, entry] of relicRegistry) {
        if (!wantedMap.has(id)) {
          entry.node.root.parent?.remove(entry.node.root)
          disposePlantNode(entry.node)
          relicRegistry.delete(id)
        }
      }

      for (const item of wanted) {
        const existing = relicRegistry.get(item.project.id)
        if (!existing) {
          void addRelic(item.project, item.tileIndex)
          continue
        }
        if (existing.status !== item.project.status) {
          existing.status = item.project.status
          existing.node.status = item.project.status
          existing.node.setStage(item.project)
        }
        if (existing.tileIndex !== item.tileIndex) {
          existing.tileIndex = item.tileIndex
          placeRelic(existing.node, path[item.tileIndex], item.project.id)
        }
      }
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const pointerParallax = new THREE.Vector2()
    let pointerDown: { x: number; y: number } | null = null
    let lastHoverCheck = 0

    function updatePointer(event: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      pointerParallax.set(pointer.x, pointer.y)
    }

    function raycastInteractive() {
      raycaster.setFromCamera(pointer, camera)
      const proxies = Array.from(relicRegistry.values(), (entry) => entry.node.hitProxy)
      const relicHits = raycaster.intersectObjects(proxies, false)
      if (relicHits.length) {
        const name = relicHits[0].object.name
        return { kind: 'project' as const, id: name.startsWith('hit:') ? name.slice(4) : '' }
      }
      const tileHits = raycaster.intersectObjects(tileMeshes, false)
      if (tileHits.length) {
        return { kind: 'floor' as const, floor: Number(tileHits[0].object.userData.floor ?? 0) }
      }
      return null
    }

    function onPointerMove(event: PointerEvent) {
      updatePointer(event)
      if (event.timeStamp - lastHoverCheck < 70) return
      lastHoverCheck = event.timeStamp
      canvasEl.style.cursor = raycastInteractive() ? 'pointer' : 'default'
    }

    function onPointerDown(event: PointerEvent) {
      updatePointer(event)
      pointerDown = { x: event.clientX, y: event.clientY }
    }

    function onPointerUp(event: PointerEvent) {
      updatePointer(event)
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) {
        pointerDown = null
        return
      }
      pointerDown = null
      const hit = raycastInteractive()
      if (hit?.kind === 'project' && hit.id) callbacksRef.current.onProjectOpen?.(hit.id)
      if (hit?.kind === 'floor') callbacksRef.current.onFloorSelect?.(hit.floor)
    }

    canvasEl.addEventListener('pointermove', onPointerMove)
    canvasEl.addEventListener('pointerdown', onPointerDown)
    canvasEl.addEventListener('pointerup', onPointerUp)

    function applySize() {
      const rect = canvasEl.getBoundingClientRect()
      const width = Math.max(1, rect.width || window.innerWidth)
      const height = Math.max(1, rect.height || window.innerHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      composer.setSize(width, height)
      bloom.resolution.set(width, height)
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
    const devilTarget = new THREE.Vector3()
    const playerTarget = new THREE.Vector3()
    let rafId = 0
    let lastRelicSync = -1

    function animate() {
      rafId = requestAnimationFrame(animate)
      timer.update()
      const delta = Math.min(timer.getDelta(), 0.05)
      const elapsed = timer.getElapsed()
      const current = propsRef.current

      if (elapsed - lastRelicSync > 0.32) {
        syncRelics()
        lastRelicSync = elapsed
      }

      resolveCamera(current.mode, current.activeFloor, path, desiredCamera, desiredLook)
      if (!reducedMotion) {
        desiredCamera.x += pointerParallax.x * 1.45
        desiredCamera.y += pointerParallax.y * 0.68
        desiredLook.x += pointerParallax.x * 0.42
        desiredLook.y += pointerParallax.y * 0.24
      }
      const cameraEase = 1 - Math.exp(-delta * 2.35)
      camera.position.lerp(desiredCamera, cameraEase)
      cameraLook.lerp(desiredLook, cameraEase)
      camera.lookAt(cameraLook)

      rockMaterials.forEach((material, floor) => {
        const focused = current.mode !== 'floor' || current.activeFloor === undefined || current.activeFloor === floor
        material.emissive.setHex(focused ? 0x3d220c : 0x1b0d05)
        material.emissiveIntensity = focused ? 0.38 : 0.14
      })

      torches.forEach((torch) => {
        const flicker = reducedMotion ? 1 : 0.86 + Math.sin(elapsed * 9.2 + torch.phase) * 0.12 + Math.sin(elapsed * 17 + torch.phase) * 0.04
        torch.flame.scale.set(0.75 * flicker, 1.25 * flicker, 1)
        torch.light.intensity = 20 * flicker
      })

      const devilTile = path[Math.max(0, Math.min(path.length - 1, current.devilPosition))]
      devilTarget.copy(devilTile.position).add(new THREE.Vector3(0, 2.18, 0))
      devil.group.position.lerp(devilTarget, 1 - Math.exp(-delta * 3.3))
      devil.group.position.y += reducedMotion ? 0 : Math.sin(elapsed * 1.9) * 0.008
      devil.group.lookAt(camera.position.x, devil.group.position.y + 1.4, camera.position.z)
      devil.embers.rotation.y += delta * (current.devilEnraged ? 1.7 : 0.48)
      devil.embers.position.y = Math.sin(elapsed * 1.8) * 0.16
      devil.light.intensity = 9 * (current.devilEnraged ? 1.55 + Math.sin(elapsed * 9) * 0.24 : 1)
      devil.robeMaterial.emissiveIntensity = current.devilEnraged ? 1.2 + Math.sin(elapsed * 6) * 0.22 : 0.42
      devil.group.scale.setScalar(current.started ? 1 : 0.88)

      current.players.forEach((player, index) => {
        const token = playerTokens[index]
        const tile = path[Math.max(0, Math.min(path.length - 1, player.position))]
        playerTarget.copy(tile.position)
        const side = index === 0 ? -0.48 : 0.48
        playerTarget.x += Math.cos(tile.rotationY) * side
        playerTarget.z -= Math.sin(tile.rotationY) * side
        playerTarget.y += 1.08
        token.group.position.lerp(playerTarget, 1 - Math.exp(-delta * 4.6))
        token.group.rotation.y += reducedMotion ? delta * 0.08 : delta * 0.45
        token.ringMaterial.opacity = player.escaped ? 1 : 0.72 + Math.sin(elapsed * 3.2 + index) * 0.18
        token.light.intensity = player.escaped ? 5 : 2.6
      })

      portal.ringMaterial.opacity = 0.62 + Math.sin(elapsed * 2.6) * 0.16
      portal.coreMaterial.opacity = 0.2 + Math.sin(elapsed * 1.8) * 0.08
      portal.group.scale.setScalar(1 + Math.sin(elapsed * 1.25) * 0.025)
      dust.rotation.y += delta * 0.008
      dust.position.y = Math.sin(elapsed * 0.12) * 0.24

      for (const entry of relicRegistry.values()) animatePlantNode(entry.node, elapsed, delta, reducedMotion)

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

      for (const entry of relicRegistry.values()) {
        entry.node.root.parent?.remove(entry.node.root)
        disposePlantNode(entry.node)
      }
      relicRegistry.clear()
      disposeSceneGraph(scene)
      ownedTextures.forEach((texture) => texture.dispose())
      composer.dispose()
      renderer.dispose()
    }
  }, [])

  if (shouldForce2D()) {
    return <div className="dungeon-canvas-fallback" aria-hidden="true" />
  }

  return <canvas ref={canvasRef} className="dungeon-board-canvas" aria-label="六层古墓逃生 3D 棋盘" />
}

function selectRelicProjects(projects: ProjectSeed[], tier: ReturnType<typeof getDeviceTier>, mode: DungeonSceneMode, activeFloor?: number) {
  const limit = tier === 'low' ? 5 : tier === 'medium' ? 8 : 11
  const sorted = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  const filtered = mode === 'floor' && activeFloor !== undefined && activeFloor < 5 ? sorted.filter((project) => zoneFloor[project.zoneId] === activeFloor) : sorted
  const perFloorCount = new Map<number, number>()
  const selected: Array<{ project: ProjectSeed; tileIndex: number }> = []

  for (const project of filtered) {
    if (selected.length >= limit) break
    const floor = mode === 'floor' && activeFloor !== undefined ? activeFloor : zoneFloor[project.zoneId]
    const slot = (perFloorCount.get(floor) ?? 0) % TILES_PER_FLOOR
    perFloorCount.set(floor, slot + 1)
    selected.push({ project, tileIndex: Math.min(DUNGEON_TILE_COUNT - 1, floor * TILES_PER_FLOOR + slot) })
  }
  return selected
}

function placeRelic(node: PlantNode, tile: DungeonTile, projectId: string) {
  node.root.position.copy(tile.position).add(new THREE.Vector3(0, 1.72, 0))
  node.root.rotation.y = tile.rotationY
  node.root.name = `relic:${projectId}`
  node.root.scale.setScalar(0.92)
}

function resolveCamera(mode: DungeonSceneMode, activeFloor: number | undefined, path: DungeonTile[], position: THREE.Vector3, look: THREE.Vector3) {
  if (mode === 'board') {
    position.set(0, 34, 22)
    look.set(0, 5.3, 0)
    return
  }
  if (mode === 'archive') {
    position.set(-29, 17, 12)
    look.set(0, 5.5, 0)
    return
  }
  if (mode === 'floor' && activeFloor !== undefined) {
    const floor = Math.max(0, Math.min(DUNGEON_FLOORS - 1, activeFloor))
    const focus = path[floor * TILES_PER_FLOOR + 3].position
    position.set(focus.x + 11, focus.y + 9.5, focus.z + 15)
    look.copy(focus).add(new THREE.Vector3(0, 1.2, 0))
    return
  }
  position.set(25, 23, 30)
  look.set(0, 5, 0)
}

function createBridge(start: THREE.Vector3, end: THREE.Vector3, material: THREE.Material) {
  const direction = end.clone().sub(start)
  const length = direction.length()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, Math.max(0.4, length - 2.2)), material)
  mesh.position.copy(start).lerp(end, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize())
  return mesh
}

function createTorch(texture: THREE.Texture, metalMaterial: THREE.Material) {
  const group = new THREE.Group()
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.35, 8), metalMaterial)
  bracket.position.y = 0.2
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.28, 12), metalMaterial)
  bowl.position.y = 0.88
  const flameMaterial = new THREE.SpriteMaterial({ map: texture, color: 0xffa43b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  const flame = new THREE.Sprite(flameMaterial)
  flame.position.y = 1.55
  flame.scale.set(0.75, 1.25, 1)
  const light = new THREE.PointLight(0xff9a3c, 20, 18, 1.75)
  light.position.y = 1.32
  group.add(bracket, bowl, flame, light)
  return { group, flame, light, phase: Math.random() * Math.PI * 2 }
}

function createDevil(particleTexture: THREE.Texture) {
  const group = new THREE.Group()
  group.name = 'the-hooded-devil'
  const robeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c0505,
    roughness: 0.92,
    metalness: 0.04,
    emissive: 0x4b0502,
    emissiveIntensity: 0.42,
  })
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x020101 })
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff3311, toneMapped: false })
  const robe = new THREE.Mesh(new THREE.ConeGeometry(1.42, 3.65, 28, 2), robeMaterial)
  robe.position.y = 0.2
  robe.castShadow = true
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1.08, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.82), robeMaterial)
  hood.position.y = 1.78
  hood.scale.z = 0.92
  hood.castShadow = true
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 14), voidMaterial)
  face.position.set(0, 1.72, 0.58)
  face.scale.set(0.82, 0.92, 0.46)
  const eyeGeometry = new THREE.SphereGeometry(0.09, 12, 8)
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.25, 1.87, 0.91)
  const rightEye = leftEye.clone()
  rightEye.position.x = 0.25
  const light = new THREE.PointLight(0xff2208, 9, 18, 2)
  light.position.set(0, -0.55, 0.15)

  const emberGeometry = new THREE.BufferGeometry()
  const emberCount = 150
  const positions = new Float32Array(emberCount * 3)
  for (let index = 0; index < emberCount; index += 1) {
    const radius = 0.8 + Math.random() * 2.4
    const angle = Math.random() * Math.PI * 2
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = -1.1 + Math.random() * 4.7
    positions[index * 3 + 2] = Math.sin(angle) * radius
  }
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const emberMaterial = new THREE.PointsMaterial({
    color: 0xff3b16,
    size: 0.24,
    map: particleTexture,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const embers = new THREE.Points(emberGeometry, emberMaterial)
  group.add(robe, hood, face, leftEye, rightEye, light, embers)
  return { group, light, embers, robeMaterial }
}

function createPlayerToken(player: DungeonPlayer, metalMaterial: THREE.MeshStandardMaterial) {
  const group = new THREE.Group()
  group.name = `player-token:${player.id}`
  const color = new THREE.Color(player.color)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.56, emissive: color, emissiveIntensity: 0.18 })
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.28, 24), metalMaterial)
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.43, 1.2, 18), bodyMaterial)
  body.position.y = 0.72
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), bodyMaterial)
  head.position.y = 1.48
  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 8, 36), ringMaterial)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.08
  const light = new THREE.PointLight(color, 2.6, 5, 2)
  light.position.y = 0.58
  group.add(base, body, head, ring, light)
  return { group, ringMaterial, light }
}

function createEscapePortal(metalMaterial: THREE.Material, ownedTextures: Set<THREE.Texture>) {
  const group = new THREE.Group()
  const pillarGeometry = new THREE.BoxGeometry(0.48, 4.4, 0.58)
  const left = new THREE.Mesh(pillarGeometry, metalMaterial)
  left.position.x = -1.55
  const right = left.clone()
  right.position.x = 1.55
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.52, 0.66), metalMaterial)
  lintel.position.y = 2.18
  const glowTexture = createRadialTexture(['rgba(190,255,190,.95)', 'rgba(60,180,80,.42)', 'rgba(0,20,0,0)'], ownedTextures)
  const coreMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0x7ec87e, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })
  const core = new THREE.Sprite(coreMaterial)
  core.scale.set(3.15, 4.2, 1)
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x7ec87e, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.075, 10, 48, Math.PI), ringMaterial)
  ring.rotation.z = Math.PI
  ring.position.y = 1.45
  group.add(core, left, right, lintel, ring)
  return { group, ringMaterial, coreMaterial }
}

function createDust(count: number, texture: THREE.Texture) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const radius = 8 + Math.random() * 34
    const angle = Math.random() * Math.PI * 2
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = -1 + Math.random() * 25
    positions[index * 3 + 2] = Math.sin(angle) * radius
    const warm = Math.random() > 0.74
    colors[index * 3] = warm ? 1 : 0.38
    colors[index * 3 + 1] = warm ? 0.58 : 0.45
    colors[index * 3 + 2] = warm ? 0.22 : 0.54
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.12,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  return new THREE.Points(geometry, material)
}

function createTextSprite(text: string, color: string, ownedTextures: Set<THREE.Texture>, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, width, height)
  context.shadowColor = 'rgba(255,180,60,.7)'
  context.shadowBlur = 18
  context.fillStyle = color
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `900 ${Math.floor(height * 0.55)}px Cinzel, "Noto Serif SC", serif`
  context.fillText(text, width / 2, height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  ownedTextures.add(texture)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
  return new THREE.Sprite(material)
}

function createRadialTexture(stops: string[], ownedTextures: Set<THREE.Texture>) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48)
  stops.forEach((color, index) => gradient.addColorStop(index / (stops.length - 1), color))
  context.fillStyle = gradient
  context.fillRect(0, 0, 96, 96)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  ownedTextures.add(texture)
  return texture
}

function createProceduralPbrTextures(kind: 'rock' | 'wood' | 'metal', ownedTextures: Set<THREE.Texture>) {
  const palettes = {
    rock: ['#211a14', '#4b4032', '#0d0b09'],
    wood: ['#2d180d', '#684326', '#120906'],
    metal: ['#3f2e1c', '#8b6a38', '#17100a'],
  } as const
  const [base, fleck, shadow] = palettes[kind]
  const size = 192
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  context.fillStyle = base
  context.fillRect(0, 0, size, size)
  for (let index = 0; index < 2400; index += 1) {
    const alpha = 0.04 + seededNoise(index + kind.length * 100) * 0.17
    context.fillStyle = `${index % 3 === 0 ? shadow : fleck}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, '0')}`
    const x = seededNoise(index * 3 + 4) * size
    const y = seededNoise(index * 7 + 8) * size
    const streak = kind === 'wood' ? 5 + seededNoise(index + 9) * 18 : 1 + seededNoise(index + 9) * 3
    context.fillRect(x, y, streak, kind === 'wood' ? 1 : streak)
  }
  if (kind === 'rock') {
    context.strokeStyle = 'rgba(5,3,2,.48)'
    context.lineWidth = 2
    for (let crack = 0; crack < 12; crack += 1) {
      context.beginPath()
      context.moveTo(seededNoise(crack + 90) * size, seededNoise(crack + 120) * size)
      context.lineTo(seededNoise(crack + 180) * size, seededNoise(crack + 230) * size)
      context.lineTo(seededNoise(crack + 280) * size, seededNoise(crack + 330) * size)
      context.stroke()
    }
  }
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace

  const normalData = new Uint8Array([128, 128, 255, 255])
  const normalMap = new THREE.DataTexture(normalData, 1, 1, THREE.RGBAFormat)
  normalMap.needsUpdate = true

  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = size
  roughCanvas.height = size
  const roughContext = roughCanvas.getContext('2d')!
  const image = roughContext.createImageData(size, size)
  for (let index = 0; index < size * size; index += 1) {
    const value = Math.floor((kind === 'metal' ? 120 : 205) + seededNoise(index + 700) * (kind === 'metal' ? 90 : 45))
    image.data[index * 4] = value
    image.data[index * 4 + 1] = value
    image.data[index * 4 + 2] = value
    image.data[index * 4 + 3] = 255
  }
  roughContext.putImageData(image, 0, 0)
  const roughnessMap = new THREE.CanvasTexture(roughCanvas)

  const metalnessValue = kind === 'metal' ? 255 : 0
  const metalnessData = new Uint8Array([metalnessValue, metalnessValue, metalnessValue, 255])
  const metalnessMap = new THREE.DataTexture(metalnessData, 1, 1, THREE.RGBAFormat)
  metalnessMap.needsUpdate = true

  for (const texture of [map, normalMap, roughnessMap, metalnessMap]) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(kind === 'rock' ? 3 : 2, kind === 'rock' ? 3 : 2)
    ownedTextures.add(texture)
  }
  return { map, normalMap, roughnessMap, metalnessMap }
}

type TextureSetOptions = {
  loader: THREE.TextureLoader
  cancelledLoads: { value: boolean }
  ownedTextures: Set<THREE.Texture>
  maxAnisotropy: number
  repeat: [number, number]
  color: string
  normal: string
  roughness: string
  metalness?: string
  onColor: (texture: THREE.Texture) => void
  onNormal: (texture: THREE.Texture) => void
  onRoughness: (texture: THREE.Texture) => void
  onMetalness?: (texture: THREE.Texture) => void
}

function loadTextureSet(options: TextureSetOptions) {
  loadManagedTexture(options.color, true, options, options.onColor)
  loadManagedTexture(options.normal, false, options, options.onNormal)
  loadManagedTexture(options.roughness, false, options, options.onRoughness)
  if (options.metalness && options.onMetalness) loadManagedTexture(options.metalness, false, options, options.onMetalness)
}

function loadManagedTexture(url: string, isColor: boolean, options: TextureSetOptions, onLoad: (texture: THREE.Texture) => void) {
  options.loader.load(
    publicPath(url),
    (texture) => {
      if (options.cancelledLoads.value) {
        texture.dispose()
        return
      }
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(options.repeat[0], options.repeat[1])
      texture.anisotropy = options.maxAnisotropy
      if (isColor) texture.colorSpace = THREE.SRGBColorSpace
      options.ownedTextures.add(texture)
      onLoad(texture)
    },
    undefined,
    () => {
      // 程序化 Canvas/DataTexture 已经挂在材质上；网络或资源失败时保持回退。
    },
  )
}

type TextureProperty = 'map' | 'normalMap' | 'roughnessMap' | 'metalnessMap'

function updateMaterialTexture(material: THREE.MeshStandardMaterial, property: TextureProperty, texture: THREE.Texture) {
  material[property] = texture
  material.needsUpdate = true
}

function disposeSceneGraph(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
      if (object.geometry) geometries.add(object.geometry)
      const material = object.material
      if (Array.isArray(material)) material.forEach((entry) => materials.add(entry))
      else if (material) materials.add(material)
    }
    if (object instanceof THREE.Sprite) materials.add(object.material)
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}
