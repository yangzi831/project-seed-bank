import * as THREE from 'three'

export type DigitalGardenerMode = 'idle' | 'walk' | 'tend' | 'speak'

type AnimateOptions = {
  mode: DigitalGardenerMode
  thinking: boolean
  reducedMotion: boolean
}

export type DigitalGardenerAvatar = {
  group: THREE.Group
  ringMat: THREE.MeshBasicMaterial
  light: THREE.PointLight
  bodyMat: THREE.MeshPhysicalMaterial
  animate: (elapsed: number, delta: number, options: AnimateOptions) => void
}

type Axis = 'x' | 'y' | 'z'

const REFERENCE_SHEET_COUNT = 5

function readAxis(attribute: THREE.BufferAttribute, axis: Axis, index: number): number {
  if (axis === 'x') return attribute.getX(index)
  if (axis === 'z') return attribute.getZ(index)
  return attribute.getY(index)
}

function colorAt(palette: THREE.Color[], t: number, target: THREE.Color): THREE.Color {
  const scaled = THREE.MathUtils.clamp(t, 0, 1) * (palette.length - 1)
  const index = Math.min(palette.length - 2, Math.floor(scaled))
  return target.copy(palette[index]).lerp(palette[index + 1], scaled - index)
}

/** 给实体几何写入稳定的顶点虹彩，避免把参考 PNG 当成纸片贴图。 */
function paintGradient<T extends THREE.BufferGeometry>(geometry: T, palette: THREE.Color[], axis: Axis = 'y'): T {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return geometry

  const min = box.min[axis]
  const span = Math.max(0.0001, box.max[axis] - min)
  const colors = new Float32Array(position.count * 3)
  const mixed = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    colorAt(palette, (readAxis(position, axis, i) - min) / span, mixed)
    colors[i * 3] = mixed.r
    colors[i * 3 + 1] = mixed.g
    colors[i * 3 + 2] = mixed.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function createLeafGeometry(palette: THREE.Color[]): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(0.5, 24, 16)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    const normalizedY = THREE.MathUtils.clamp(y / 0.5, -1, 1)
    const lowerBulge = normalizedY < 0 ? 1 + (normalizedY + 1) * 0.12 : 1 - normalizedY * 0.24
    position.setXYZ(i, position.getX(i) * lowerBulge, y < 0 ? y * 0.82 : y * 1.18, position.getZ(i) * lowerBulge)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return paintGradient(geometry, palette)
}

function addLeaf(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position: [number, number, number],
  scale: [number, number, number],
  rotation: [number, number, number],
): THREE.Mesh {
  const leaf = new THREE.Mesh(geometry, material)
  leaf.name = name
  leaf.position.set(...position)
  leaf.scale.set(...scale)
  leaf.rotation.set(...rotation)
  leaf.castShadow = true
  parent.add(leaf)
  return leaf
}

function createStem(points: THREE.Vector3[], material: THREE.Material, name: string): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points)
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.032, 7, false), material)
  stem.name = name
  return stem
}

function makePalette(accent: THREE.Color): THREE.Color[] {
  const tint = accent.clone().lerp(new THREE.Color('#effff4'), 0.56)
  return [
    new THREE.Color('#ffd8be').lerp(tint, 0.12),
    new THREE.Color('#d9c8ff').lerp(tint, 0.1),
    new THREE.Color('#8ddfff').lerp(tint, 0.16),
    new THREE.Color('#79efc0').lerp(tint, 0.22),
    new THREE.Color('#fff1a9').lerp(tint, 0.08),
  ]
}

/**
 * 数字园丁 IP：综合五张设定稿中的半透明软体、长叶耳、芽叶冠、胸口种子晶核与漂浮星屑。
 * 整体是可旋转、有体积和受光关系的程序化网格，不依赖外部 GLB 或平面角色贴图。
 */
export function createDigitalGardenerAvatar(accent: string, glowTexture?: THREE.Texture): DigitalGardenerAvatar {
  const group = new THREE.Group()
  group.name = 'digital-gardener-avatar'
  group.userData.referenceSheetCount = REFERENCE_SHEET_COUNT
  group.userData.role = 'manor-gardener'

  const model = new THREE.Group()
  model.name = 'digital-gardener-model'
  group.add(model)

  const accentColor = new THREE.Color(accent)
  const pastelAccent = accentColor.clone().lerp(new THREE.Color('#effff6'), 0.5)
  const palette = makePalette(accentColor)
  const reversePalette = [...palette].reverse()

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.2,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.13,
    transmission: 0.14,
    thickness: 0.72,
    ior: 1.28,
    iridescence: 0.92,
    iridescenceIOR: 1.2,
    iridescenceThicknessRange: [110, 430],
    emissive: pastelAccent,
    emissiveIntensity: 0.28,
  })
  const petalMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.18,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.11,
    transmission: 0.28,
    thickness: 0.34,
    ior: 1.24,
    iridescence: 1,
    iridescenceIOR: 1.18,
    iridescenceThicknessRange: [90, 470],
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
    emissive: pastelAccent,
    emissiveIntensity: 0.24,
  })
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff7d9,
    roughness: 0.14,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transmission: 0.1,
    thickness: 0.2,
    ior: 1.25,
    emissive: 0xffedba,
    emissiveIntensity: 0.18,
  })
  const stemMat = new THREE.MeshPhysicalMaterial({
    color: pastelAccent,
    roughness: 0.28,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
    emissive: accentColor,
    emissiveIntensity: 0.35,
  })
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x24526d,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    emissive: 0x12384c,
    emissiveIntensity: 0.45,
  })
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0xffe49a,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transmission: 0.16,
    thickness: 0.4,
    ior: 1.35,
    emissive: 0xffc85a,
    emissiveIntensity: 2.1,
  })
  const crystalShellMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9fff4,
    roughness: 0.04,
    metalness: 0,
    transmission: 0.78,
    thickness: 0.42,
    ior: 1.33,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.2,
    iridescenceThicknessRange: [90, 520],
    transparent: true,
    opacity: 0.94,
  })

  // 接地软阴影把半透明角色稳稳压在庄园地面上。
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 36),
    new THREE.MeshBasicMaterial({ color: 0x020705, transparent: true, opacity: 0.3, depthWrite: false }),
  )
  shadow.name = 'gardener-contact-shadow'
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.018
  shadow.scale.set(1.25, 0.72, 1)
  group.add(shadow)

  const bodyProfile = [
    new THREE.Vector2(0.18, 0),
    new THREE.Vector2(0.56, 0.06),
    new THREE.Vector2(0.79, 0.3),
    new THREE.Vector2(0.8, 0.62),
    new THREE.Vector2(0.68, 0.92),
    new THREE.Vector2(0.52, 1.25),
    new THREE.Vector2(0.39, 1.48),
    new THREE.Vector2(0.16, 1.6),
    new THREE.Vector2(0, 1.62),
  ]
  const bodyGeometry = paintGradient(new THREE.LatheGeometry(bodyProfile, 40), palette)
  const body = new THREE.Mesh(bodyGeometry, bodyMat)
  body.name = 'gardener-pear-body'
  body.position.y = 0.18
  body.scale.set(0.92, 1, 0.82)
  body.castShadow = true
  model.add(body)

  const headGeometry = paintGradient(new THREE.SphereGeometry(0.62, 36, 24), reversePalette)
  const headPivot = new THREE.Group()
  headPivot.name = 'gardener-head-pivot'
  headPivot.position.y = 2.08
  const head = new THREE.Mesh(headGeometry, bodyMat)
  head.name = 'gardener-head'
  head.scale.set(1, 0.84, 0.9)
  head.castShadow = true
  headPivot.add(head)
  model.add(headPivot)

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.5, 30, 20), faceMat)
  face.name = 'gardener-face-mask'
  face.scale.set(0.86, 0.57, 0.18)
  face.position.set(0, -0.03, 0.52)
  headPivot.add(face)

  const eyeGeometry = new THREE.SphereGeometry(0.085, 16, 12)
  const catchlightGeometry = new THREE.SphereGeometry(0.022, 10, 8)
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMat)
    eye.name = side < 0 ? 'gardener-eye-left' : 'gardener-eye-right'
    eye.scale.set(0.6, 1.08, 0.45)
    eye.position.set(side * 0.2, 0, 0.61)
    const catchlight = new THREE.Mesh(catchlightGeometry, catchlightMat)
    catchlight.position.set(side * 0.19 - 0.012, 0.03, 0.68)
    headPivot.add(eye, catchlight)
  }

  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffc9bd, transparent: true, opacity: 0.58, toneMapped: false })
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), cheekMat)
    cheek.scale.set(1.2, 0.45, 0.25)
    cheek.position.set(side * 0.36, -0.1, 0.58)
    headPivot.add(cheek)
  }
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.011, 6, 20, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x447267, transparent: true, opacity: 0.72, toneMapped: false }),
  )
  mouth.name = 'gardener-smile'
  mouth.position.set(0, -0.13, 0.625)
  mouth.rotation.z = Math.PI
  headPivot.add(mouth)

  const leafGeometry = createLeafGeometry(palette)
  const reverseLeafGeometry = createLeafGeometry(reversePalette)
  const earLeft = addLeaf(headPivot, leafGeometry, petalMat, 'gardener-leaf-ear-left', [-0.61, 0.03, -0.02], [0.48, 1.26, 0.28], [0.08, 0.12, 0.98])
  const earRight = addLeaf(headPivot, reverseLeafGeometry, petalMat, 'gardener-leaf-ear-right', [0.61, 0.03, -0.02], [0.48, 1.26, 0.28], [-0.08, -0.12, -0.98])
  const earLeftBase = earLeft.rotation.z
  const earRightBase = earRight.rotation.z

  // 芽叶冠：三条真实管状枝条与五片实体叶，剪影直接对应设定稿。
  const crown = new THREE.Group()
  crown.name = 'gardener-sprout-crown'
  crown.position.set(0, 2.53, -0.03)
  crown.add(
    createStem([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.08, 0.28, 0), new THREE.Vector3(-0.2, 0.54, 0.02)], stemMat, 'crown-stem-left'),
    createStem([new THREE.Vector3(0.02, 0, 0), new THREE.Vector3(0.08, 0.32, 0.02), new THREE.Vector3(0.2, 0.68, 0)], stemMat, 'crown-stem-right'),
    createStem([new THREE.Vector3(0, 0.08, -0.01), new THREE.Vector3(0.22, 0.24, 0.01), new THREE.Vector3(0.37, 0.42, 0.02)], stemMat, 'crown-stem-side'),
  )
  addLeaf(crown, leafGeometry, petalMat, 'crown-leaf-left', [-0.26, 0.58, 0.02], [0.2, 0.48, 0.12], [0.02, 0.1, 0.58])
  addLeaf(crown, reverseLeafGeometry, petalMat, 'crown-leaf-top', [0.22, 0.73, 0.02], [0.23, 0.56, 0.13], [-0.04, -0.08, -0.34])
  addLeaf(crown, leafGeometry, petalMat, 'crown-leaf-side', [0.41, 0.45, 0.02], [0.16, 0.38, 0.1], [0.04, -0.06, -0.72])
  addLeaf(crown, reverseLeafGeometry, petalMat, 'crown-bud-left', [-0.08, 0.3, 0.02], [0.11, 0.25, 0.08], [0, 0, 0.34])
  addLeaf(crown, leafGeometry, petalMat, 'crown-bud-right', [0.16, 0.34, 0.03], [0.1, 0.22, 0.08], [0, 0, -0.5])
  model.add(crown)

  // 背翼与裙瓣让角色从任何庄园相机角度都保有立体层次。
  const cape = new THREE.Group()
  cape.name = 'gardener-petal-cape'
  addLeaf(cape, reverseLeafGeometry, petalMat, 'cape-left-upper', [-0.63, 1.25, -0.16], [0.46, 1.06, 0.22], [0.12, 0.18, 0.7])
  addLeaf(cape, leafGeometry, petalMat, 'cape-left-lower', [-0.7, 0.82, -0.1], [0.42, 0.98, 0.2], [0.08, 0.1, 1.0])
  addLeaf(cape, leafGeometry, petalMat, 'cape-right-upper', [0.63, 1.25, -0.16], [0.46, 1.06, 0.22], [-0.12, -0.18, -0.7])
  addLeaf(cape, reverseLeafGeometry, petalMat, 'cape-right-lower', [0.7, 0.82, -0.1], [0.42, 0.98, 0.2], [-0.08, -0.1, -1.0])
  model.add(cape)

  const skirt = new THREE.Group()
  skirt.name = 'gardener-petal-skirt'
  addLeaf(skirt, leafGeometry, petalMat, 'skirt-front', [0, 0.48, 0.5], [0.42, 0.92, 0.2], [0.18, 0, 0])
  addLeaf(skirt, reverseLeafGeometry, petalMat, 'skirt-left-front', [-0.34, 0.48, 0.35], [0.38, 0.82, 0.2], [0.16, 0.18, 0.46])
  addLeaf(skirt, leafGeometry, petalMat, 'skirt-right-front', [0.34, 0.48, 0.35], [0.38, 0.82, 0.2], [0.16, -0.18, -0.46])
  addLeaf(skirt, reverseLeafGeometry, petalMat, 'skirt-left-side', [-0.58, 0.56, 0.03], [0.34, 0.78, 0.18], [0.08, 0.34, 0.82])
  addLeaf(skirt, leafGeometry, petalMat, 'skirt-right-side', [0.58, 0.56, 0.03], [0.34, 0.78, 0.18], [0.08, -0.34, -0.82])
  model.add(skirt)

  const footGeometry = paintGradient(new THREE.SphereGeometry(0.32, 22, 14), [palette[1], palette[0], palette[4]])
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(footGeometry, bodyMat)
    foot.name = side < 0 ? 'gardener-foot-left' : 'gardener-foot-right'
    foot.scale.set(0.82, 0.7, 1.18)
    foot.position.set(side * 0.3, 0.2, 0.34)
    foot.rotation.y = side * 0.18
    foot.castShadow = true
    model.add(foot)
  }

  // 双臂围合胸口种子，动作模式会驱动手臂做照料与说话手势。
  const armGeometry = paintGradient(new THREE.CapsuleGeometry(0.115, 0.54, 7, 14), [palette[3], palette[2], palette[4]])
  const armLeft = new THREE.Mesh(armGeometry, bodyMat)
  armLeft.name = 'gardener-arm-left'
  armLeft.position.set(-0.42, 1.42, 0.5)
  armLeft.rotation.z = 0.78
  const armRight = new THREE.Mesh(armGeometry, bodyMat)
  armRight.name = 'gardener-arm-right'
  armRight.position.set(0.42, 1.42, 0.5)
  armRight.rotation.z = -0.78
  model.add(armLeft, armRight)
  const armLeftBase = armLeft.rotation.z
  const armRightBase = armRight.rotation.z

  const handGeometry = paintGradient(new THREE.SphereGeometry(0.145, 18, 12), [palette[4], palette[0]])
  for (const side of [-1, 1]) {
    const hand = new THREE.Mesh(handGeometry, bodyMat)
    hand.name = side < 0 ? 'gardener-hand-left' : 'gardener-hand-right'
    hand.scale.set(1.1, 0.76, 0.9)
    hand.position.set(side * 0.23, 1.2, 0.7)
    model.add(hand)
  }

  const corePivot = new THREE.Group()
  corePivot.name = 'gardener-seed-core'
  corePivot.position.set(0, 1.24, 0.72)
  const coreShell = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 18), crystalShellMat)
  coreShell.name = 'seed-core-shell'
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 2), coreMat)
  core.name = 'seed-core-crystal'
  const coreRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.018, 7, 44),
    new THREE.MeshBasicMaterial({ color: 0xffe8a2, transparent: true, opacity: 0.76, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  )
  coreRing.name = 'seed-core-halo'
  corePivot.add(coreShell, core, coreRing)
  model.add(corePivot)

  const light = new THREE.PointLight(0xffe7a0, 3.6, 7, 2)
  light.name = 'gardener-core-light'
  light.position.copy(corePivot.position)
  model.add(light)

  const ringMat = new THREE.MeshBasicMaterial({
    color: pastelAccent,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const halo = new THREE.Group()
  halo.name = 'gardener-orbit-halo'
  halo.position.y = 0.72
  const haloOuter = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.025, 8, 64), ringMat)
  haloOuter.rotation.x = Math.PI / 2
  haloOuter.rotation.z = 0.18
  const haloInner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, 7, 54), ringMat)
  haloInner.rotation.x = Math.PI / 2
  haloInner.rotation.y = 0.3
  halo.add(haloOuter, haloInner)
  model.add(halo)

  // 体内星屑：确定性点位，透过晶体材质能看到真正的内部纵深。
  const sparkleCount = 54
  const sparklePositions = new Float32Array(sparkleCount * 3)
  const sparkleColors = new Float32Array(sparkleCount * 3)
  const sparkleColor = new THREE.Color()
  for (let i = 0; i < sparkleCount; i++) {
    const t = i / (sparkleCount - 1)
    const angle = i * 2.399963229728653
    const y = 0.3 + t * 2.22
    const headBand = y > 1.7
    const radius = (headBand ? 0.36 : 0.46 + Math.sin(t * Math.PI) * 0.15) * (0.32 + ((i * 37) % 67) / 100)
    sparklePositions[i * 3] = Math.cos(angle) * radius
    sparklePositions[i * 3 + 1] = y
    sparklePositions[i * 3 + 2] = Math.sin(angle) * radius * 0.72 + (headBand ? 0.03 : 0)
    colorAt(palette, (t * 1.7) % 1, sparkleColor)
    sparkleColors[i * 3] = sparkleColor.r
    sparkleColors[i * 3 + 1] = sparkleColor.g
    sparkleColors[i * 3 + 2] = sparkleColor.b
  }
  const sparkleGeometry = new THREE.BufferGeometry()
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3))
  sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(sparkleColors, 3))
  const sparkles = new THREE.Points(
    sparkleGeometry,
    new THREE.PointsMaterial({
      size: 0.075,
      sizeAttenuation: true,
      vertexColors: true,
      map: glowTexture,
      transparent: true,
      opacity: 0.92,
      alphaTest: glowTexture ? 0.02 : 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  sparkles.name = 'gardener-inner-stardust'
  sparkles.renderOrder = 3
  model.add(sparkles)

  const moteGeometry = new THREE.IcosahedronGeometry(0.055, 1)
  const moteMaterials = [
    new THREE.MeshBasicMaterial({ color: palette[2], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: palette[4], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  ]
  const motes: Array<{ mesh: THREE.Mesh; radius: number; phase: number; speed: number; y: number }> = []
  for (let i = 0; i < 8; i++) {
    const mote = new THREE.Mesh(moteGeometry, moteMaterials[i % moteMaterials.length])
    mote.name = `gardener-orbit-mote-${i + 1}`
    const scale = 0.7 + (i % 3) * 0.22
    mote.scale.setScalar(scale)
    model.add(mote)
    motes.push({ mesh: mote, radius: 0.88 + (i % 4) * 0.18, phase: (i / 8) * Math.PI * 2, speed: 0.34 + (i % 3) * 0.07, y: 0.58 + (i % 5) * 0.43 })
  }

  function animate(elapsed: number, delta: number, { mode, thinking, reducedMotion }: AnimateOptions) {
    const motion = reducedMotion ? 0.18 : 1
    const active = mode === 'walk' || mode === 'tend' ? 1 : mode === 'speak' ? 0.65 : 0
    const breath = 1 + Math.sin(elapsed * 2.05) * 0.012 * motion
    model.position.y = Math.sin(elapsed * 1.55) * 0.035 * motion
    model.rotation.z = Math.sin(elapsed * 0.78) * 0.012 * motion
    model.scale.set(breath, 1 + (breath - 1) * 0.72, breath)

    headPivot.rotation.y = Math.sin(elapsed * 0.72) * 0.1 * motion
    headPivot.rotation.z = Math.sin(elapsed * 0.94) * 0.025 * motion
    earLeft.rotation.z = earLeftBase + Math.sin(elapsed * 1.28) * 0.055 * motion
    earRight.rotation.z = earRightBase - Math.sin(elapsed * 1.28 + 0.5) * 0.055 * motion
    crown.rotation.z = Math.sin(elapsed * 0.9) * 0.055 * motion
    crown.rotation.x = Math.sin(elapsed * 0.63) * 0.025 * motion
    cape.rotation.y = Math.sin(elapsed * 0.48) * 0.035 * motion
    skirt.rotation.y = Math.sin(elapsed * 0.72) * 0.025 * motion

    const gesture = mode === 'speak' ? Math.sin(elapsed * 3.2) * 0.18 : mode === 'tend' ? -0.18 : Math.sin(elapsed * 1.7) * 0.025
    armLeft.rotation.z = armLeftBase - gesture * motion
    armRight.rotation.z = armRightBase + gesture * motion
    armLeft.rotation.x = active * Math.sin(elapsed * 4) * 0.045 * motion
    armRight.rotation.x = -active * Math.sin(elapsed * 4) * 0.045 * motion

    halo.rotation.y += delta * (0.38 + active * 0.18) * motion
    halo.rotation.z = Math.sin(elapsed * 0.46) * 0.1 * motion
    ringMat.opacity = 0.5 + Math.sin(elapsed * 2.6) * 0.12
    sparkles.rotation.y += delta * 0.08 * motion
    sparkles.rotation.z = Math.sin(elapsed * 0.42) * 0.025 * motion

    const corePulse = 1 + Math.sin(elapsed * (thinking ? 4.8 : 2.8)) * (thinking ? 0.13 : 0.07) * motion
    corePivot.scale.setScalar(corePulse)
    core.rotation.x += delta * 0.6 * motion
    core.rotation.y += delta * 0.9 * motion
    coreRing.rotation.z -= delta * 0.7 * motion
    coreMat.emissiveIntensity = thinking ? 3.4 : mode === 'tend' ? 2.8 : 2.1
    light.intensity = thinking ? 5.4 : mode === 'tend' ? 4.6 : 3.6
    bodyMat.emissiveIntensity = mode === 'tend' ? 0.5 : thinking ? 0.42 : 0.28

    for (const mote of motes) {
      const angle = mote.phase + elapsed * mote.speed * motion
      mote.mesh.position.set(Math.cos(angle) * mote.radius, mote.y + Math.sin(angle * 1.7) * 0.14 * motion, Math.sin(angle) * mote.radius * 0.62)
      mote.mesh.rotation.x += delta * 0.7 * motion
      mote.mesh.rotation.y += delta * 0.9 * motion
    }
  }

  return { group, ringMat, light, bodyMat, animate }
}
