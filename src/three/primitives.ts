import * as THREE from 'three'

/**
 * 可复用的 3D 基础构建件：从 DungeonBoardScene 提炼，
 * 供 FarmRoomScene / WorldMapScene 共享。
 * 所有 texture 登记进 ownedTextures，统一由场景 dispose。
 */

/** 径向渐变贴图（火焰 / 光晕 / 软圆点）。 */
export function createRadialTexture(stops: string[], ownedTextures: Set<THREE.Texture>): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  const step = 1 / (stops.length - 1)
  stops.forEach((color, i) => grad.addColorStop(i * step, color))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  ownedTextures.add(texture)
  return texture
}

/** 文字精灵（房间名牌 / 楼层铭牌）。 */
export function createTextSprite(text: string, ownedTextures: Set<THREE.Texture>, opts: { size?: number; color?: string; bg?: string } = {}): THREE.Sprite {
  const fontSize = 64
  const pad = 24
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  const width = Math.ceil(ctx.measureText(text).width) + pad * 2
  canvas.width = width
  canvas.height = fontSize + pad * 2
  const ctx2 = canvas.getContext('2d')!
  if (opts.bg) {
    ctx2.fillStyle = opts.bg
    roundRect(ctx2, 0, 0, canvas.width, canvas.height, 18)
    ctx2.fill()
  }
  ctx2.font = `bold ${fontSize}px system-ui, sans-serif`
  ctx2.textAlign = 'center'
  ctx2.textBaseline = 'middle'
  ctx2.fillStyle = opts.color ?? '#f4ead8'
  ctx2.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  ownedTextures.add(texture)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  const scale = opts.size ?? 2.2
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1)
  return sprite
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 农场地基：一块略厚的圆角石板/土块。 */
export function createGroundSlab(material: THREE.Material, opts: { w?: number; h?: number; d?: number } = {}): THREE.Mesh {
  const { w = 2.4, h = 0.5, d = 2.4 } = opts
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** 小房子：方块墙 + 三棱屋顶 + 门 + 亮窗 + 门前灯。 */
export function createHouse(accent: string, glowTexture: THREE.Texture) {
  const group = new THREE.Group()
  group.name = 'house'
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8a6f52, roughness: 0.9, metalness: 0.05 })
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.85, metalness: 0.05 })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3c2a1c, roughness: 0.8 })

  const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 4.4), wallMat)
  wall.position.y = 1.7
  wall.castShadow = true
  wall.receiveShadow = true

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2.4, 4), roofMat)
  roof.position.y = 3.4 + 1.2
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.16), trimMat)
  door.position.set(0, 1.0, 2.22)

  // 亮窗（发光 sprite，穿透 Bloom）
  const winMat = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffd98a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  const win = new THREE.Sprite(winMat)
  win.scale.set(1.2, 1.2, 1)
  win.position.set(-1.5, 2.0, 2.28)

  const lamp = new THREE.PointLight(new THREE.Color(accent), 6, 9, 2)
  lamp.position.set(0, 2.2, 3.2)

  group.add(wall, roof, door, win, lamp)
  return { group, lamp }
}

/** Agent 角色：发光小人（cone 身 + sphere 头 + 呼吸环 + 点光 + 朝向相机）。 */
export function createAgentAvatar(accent: string) {
  const group = new THREE.Group()
  group.name = 'agent-avatar'
  const color = new THREE.Color(accent)
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3, emissive: color, emissiveIntensity: 0.4 })
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 20), bodyMat)
  body.position.y = 0.85
  body.castShadow = true
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), bodyMat)
  head.position.y = 1.85
  head.castShadow = true
  // 眼睛（亮点）
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 6)
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
  eyeL.position.set(-0.13, 1.9, 0.31)
  const eyeR = eyeL.clone()
  eyeR.position.x = 0.13
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 32), ringMat)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.06
  const light = new THREE.PointLight(color, 2.4, 5, 2)
  light.position.y = 0.9
  group.add(body, head, eyeL, eyeR, ring, light)
  return { group, ringMat, light, bodyMat }
}

/** 传送门（通往大地图 / 别的房间）：双柱 + 门楣 + 光晕核 + 半环。 */
export function createPortal(accent: string, glowTexture: THREE.Texture) {
  const group = new THREE.Group()
  group.name = 'portal'
  const color = new THREE.Color(accent)
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.85, metalness: 0.1 })
  const pillarGeo = new THREE.BoxGeometry(0.45, 4.0, 0.55)
  const left = new THREE.Mesh(pillarGeo, pillarMat)
  left.position.x = -1.4
  left.castShadow = true
  const right = left.clone()
  right.position.x = 1.4
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 0.6), pillarMat)
  lintel.position.y = 2.0
  lintel.castShadow = true
  const coreMat = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  const core = new THREE.Sprite(coreMat)
  core.scale.set(2.9, 3.9, 1)
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 10, 44, Math.PI), ringMat)
  ring.rotation.z = Math.PI
  ring.position.y = 1.35
  group.add(core, left, right, lintel, ring)
  return { group, ringMat, coreMat }
}

/** 漂浮萤火虫 / 尘埃粒子。 */
export function createFireflies(count: number, texture: THREE.Texture, accent = '#bfe8a0') {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const radius = 6 + Math.random() * 22
    const angle = Math.random() * Math.PI * 2
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = 0.5 + Math.random() * 8
    positions[i * 3 + 2] = Math.sin(angle) * radius
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: new THREE.Color(accent),
    size: 0.18,
    map: texture,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  return new THREE.Points(geometry, material)
}

/** 深度遍历 dispose 一个场景图（geometry / material / material.map 等）。 */
export function disposeSceneGraph(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) material.forEach(disposeMaterial)
    else if (material) disposeMaterial(material)
  })
}

function disposeMaterial(material: THREE.Material) {
  const m = material as THREE.MeshStandardMaterial
  if (m.map) m.map.dispose()
  const std = m as THREE.MeshStandardMaterial & { normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; metalnessMap?: THREE.Texture; emissiveMap?: THREE.Texture }
  std.normalMap?.dispose()
  std.roughnessMap?.dispose()
  std.metalnessMap?.dispose()
  std.emissiveMap?.dispose()
  material.dispose()
}
