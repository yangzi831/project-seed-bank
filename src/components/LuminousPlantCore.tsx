import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type LuminousPlantCoreProps = {
  stageLabel: string
}

type ParticleCloud = {
  positions: number[]
  colors: number[]
  sizes: number[]
}

type LifeParticleCloud = ParticleCloud & {
  drifts: number[]
  phases: number[]
  speeds: number[]
}

type FlowerSpec = {
  center: THREE.Vector3
  radius: number
  petals: number
  rotation: THREE.Euler
  density: number
}

type LeafSpec = {
  base: THREE.Vector3
  direction: THREE.Vector3
  width: number
  curl: number
  density: number
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSize;
  varying vec3 vColor;
  varying float vShimmer;

  void main() {
    vec3 livingPosition = position;
    float drift = sin(uTime * 0.72 + position.y * 2.1 + position.x * 1.4) * 0.009;
    livingPosition.x += drift;
    livingPosition.z += cos(uTime * 0.55 + position.y * 1.7) * 0.007;
    vec4 modelPosition = modelMatrix * vec4(livingPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * (38.0 / max(1.0, -viewPosition.z)), 0.82, 3.8);
    vColor = color;
    vShimmer = 0.74 + 0.26 * sin(uTime * 1.3 + position.x * 4.0 + position.y * 3.0);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vShimmer;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(center);
    if (distanceToCenter > 0.5) discard;
    float core = 1.0 - smoothstep(0.05, 0.48, distanceToCenter);
    float halo = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
    gl_FragColor = vec4(vColor * (0.96 + core * 0.48), (core * 0.66 + halo * 0.13) * vShimmer);
  }
`

const lifeVertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSize;
  attribute vec3 aDrift;
  attribute float aPhase;
  attribute float aSpeed;
  varying vec3 vColor;
  varying float vLife;

  void main() {
    float cycle = fract(aPhase + uTime * aSpeed);
    float release = sin(cycle * 3.14159265);
    float easedRelease = release * release;
    vec3 livingPosition = position + aDrift * easedRelease;
    livingPosition.y += release * 0.1;
    livingPosition.x += sin(uTime * 0.7 + aPhase * 12.0) * 0.02 * release;
    vec4 modelPosition = modelMatrix * vec4(livingPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aSize * (34.0 / max(1.0, -viewPosition.z)), 0.75, 3.0);
    vColor = color;
    vLife = smoothstep(0.0, 0.16, cycle) * (1.0 - smoothstep(0.72, 1.0, cycle));
  }
`

const lifeFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vLife;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(center);
    if (distanceToCenter > 0.5) discard;
    float glow = 1.0 - smoothstep(0.06, 0.5, distanceToCenter);
    gl_FragColor = vec4(vColor * (0.95 + glow * 0.42), glow * vLife * 0.58);
  }
`

export function LuminousPlantCore({ stageLabel }: LuminousPlantCoreProps) {
  const webglRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const mount = webglRef.current
    if (!mount) return
    const mountElement = mount
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
    camera.position.set(0, 0.12, 14.4)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mountElement.appendChild(renderer.domElement)

    const plantGroup = new THREE.Group()
    const plant = createStructuredPlant()
    const geometry = createParticleGeometry(plant.cloud)
    const center = centerGeometry(geometry)
    plant.structure.position.copy(center).multiplyScalar(-1)
    plantGroup.add(plant.structure)

    const material = createPlantMaterial(vertexShader, fragmentShader)
    plantGroup.add(new THREE.Points(geometry, material))

    const lifeCloud = createLifeParticles(plant.cloud)
    const lifeGeometry = createLifeGeometry(lifeCloud)
    const lifeMaterial = createPlantMaterial(lifeVertexShader, lifeFragmentShader)
    const lifeParticles = new THREE.Points(lifeGeometry, lifeMaterial)
    lifeParticles.position.copy(center).multiplyScalar(-1)
    plantGroup.add(lifeParticles)
    plantGroup.position.y = -0.08
    scene.add(plantGroup)

    const ambient = createAmbientParticles()
    const ambientGeometry = createParticleGeometry(ambient)
    const ambientMaterial = createPlantMaterial(vertexShader, fragmentShader)
    const ambientPoints = new THREE.Points(ambientGeometry, ambientMaterial)
    scene.add(ambientPoints)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clock = new THREE.Clock()
    let frame = 0

    function resize() {
      const bounds = mountElement.getBoundingClientRect()
      const width = Math.max(1, bounds.width)
      const height = Math.max(1, bounds.height)
      renderer.setSize(width, height, true)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    function render() {
      const elapsed = clock.getElapsedTime()
      const pointer = pointerRef.current
      plantGroup.rotation.y = reduceMotion ? 0.42 : elapsed * 0.18
      plantGroup.rotation.x += ((pointer.y * -0.065) - plantGroup.rotation.x) * 0.035
      plantGroup.rotation.z += ((pointer.x * -0.03) - plantGroup.rotation.z) * 0.035
      const breath = reduceMotion ? 1 : 1 + Math.sin(elapsed * 1.08) * 0.0045
      plantGroup.scale.setScalar(breath)
      ambientPoints.rotation.y = elapsed * -0.024
      ambientPoints.rotation.z = Math.sin(elapsed * 0.11) * 0.035
      material.uniforms.uTime.value = elapsed
      lifeMaterial.uniforms.uTime.value = elapsed
      ambientMaterial.uniforms.uTime.value = elapsed
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(render)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mountElement)
    frame = window.requestAnimationFrame(render)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
      geometry.dispose()
      lifeGeometry.dispose()
      ambientGeometry.dispose()
      material.dispose()
      lifeMaterial.dispose()
      ambientMaterial.dispose()
      disposeStructure(plant.structure)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    }
  }

  return (
    <div
      className="luminous-plant-core luminous-plant-core-webgl"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => { pointerRef.current = { x: 0, y: 0 } }}
    >
      <div ref={webglRef} className="luminous-webgl-stage" aria-label="流光花结构化三维粒子雕塑" role="img" />
      <div className="luminous-core-caption">
        <span><i /> STRUCTURED ORGANISM 01</span>
        <small>{stageLabel}</small>
      </div>
    </div>
  )
}

function createStructuredPlant() {
  const cloud: ParticleCloud = { positions: [], colors: [], sizes: [] }
  const structure = new THREE.Group()
  const random = seededRandom(1701)
  const flowers: FlowerSpec[] = [
    { center: new THREE.Vector3(0.02, 2.4, 0.02), radius: 1.04, petals: 0, rotation: new THREE.Euler(-0.1, 0.12, 0.02), density: 7600 },
    { center: new THREE.Vector3(-1.14, 0.94, 0.34), radius: 0.73, petals: 0, rotation: new THREE.Euler(0.14, -0.64, -0.18), density: 4300 },
    { center: new THREE.Vector3(1.08, 1.24, -0.42), radius: 0.77, petals: 0, rotation: new THREE.Euler(-0.08, 0.74, 0.14), density: 4500 },
    { center: new THREE.Vector3(0.98, 0.05, 0.62), radius: 0.55, petals: 0, rotation: new THREE.Euler(0.2, 0.88, 0.06), density: 3200 },
  ]
  flowers.forEach((flower) => addStructuredFlower(structure, cloud, flower, random))

  const stemCurves = [
    curve([[-0.02, -2.85, 0], [0.12, -1.55, 0.08], [-0.18, 0.55, -0.1], [0.02, 2.2, 0.02]]),
    curve([[-0.18, -2.85, 0.05], [-0.42, -1.45, 0.2], [-0.92, -0.2, 0.42], [-1.14, 0.82, 0.34]]),
    curve([[0.12, -2.85, -0.08], [0.38, -1.4, -0.32], [0.82, 0.16, -0.5], [1.08, 1.1, -0.42]]),
    curve([[0.18, -2.85, 0.12], [0.38, -1.6, 0.5], [0.76, -0.46, 0.68], [0.98, -0.04, 0.62]]),
    curve([[-0.12, -2.85, -0.12], [-0.58, -1.45, -0.42], [-1.18, 0.48, -0.76], [-1.04, 1.78, -0.7]]),
    curve([[0.05, -2.85, 0.08], [0.5, -1.35, 0.24], [0.62, -0.18, 0.12], [0.48, 0.62, 0.18]]),
  ]
  stemCurves.forEach((stem, index) => addStructuredStem(structure, cloud, stem, index >= 4 ? 0.018 : 0.024, index === 0 ? 1200 : 900, random))
  addStructuredBud(structure, cloud, new THREE.Vector3(-1.02, 1.96, -0.7), new THREE.Euler(0.18, -0.22, -0.35), random)
  addStructuredBud(structure, cloud, new THREE.Vector3(0.46, 0.76, 0.18), new THREE.Euler(-0.08, 0.34, 0.18), random, 0.72)

  const leaves: LeafSpec[] = [
    leaf([-0.08, -2.62, 0.18], [-1.25, 0.36, 0.36], 0.34, 0.2),
    leaf([0.04, -2.58, -0.06], [1.34, 0.3, -0.28], 0.36, -0.18),
    leaf([-0.18, -2.42, -0.16], [-1.02, 0.72, -0.62], 0.3, -0.24),
    leaf([0.18, -2.38, 0.16], [1.04, 0.72, 0.58], 0.31, 0.25),
    leaf([-0.22, -2.18, 0.08], [-1.18, 0.88, 0.12], 0.3, 0.18),
    leaf([0.2, -2.12, -0.1], [1.18, 0.9, -0.12], 0.3, -0.18),
    leaf([-0.16, -1.92, 0.2], [-0.8, 1.02, 0.62], 0.27, 0.25),
    leaf([0.16, -1.88, -0.2], [0.82, 1.06, -0.62], 0.27, -0.25),
    leaf([-0.12, -1.62, -0.08], [-0.98, 0.74, -0.45], 0.24, 0.22),
    leaf([0.12, -1.56, 0.08], [0.98, 0.76, 0.45], 0.24, -0.22),
    leaf([-0.08, -1.3, 0.2], [-0.7, 0.82, 0.72], 0.22, 0.24),
    leaf([0.08, -1.26, -0.18], [0.72, 0.86, -0.7], 0.22, -0.24),
    leaf([-0.06, -0.98, -0.06], [-0.62, 0.72, -0.3], 0.19, 0.16),
    leaf([0.08, -0.9, 0.08], [0.64, 0.74, 0.32], 0.19, -0.16),
    leaf([-0.04, -2.72, 0.02], [-1.42, 0.14, -0.12], 0.2, 0.1),
    leaf([0.04, -2.7, 0], [1.46, 0.16, 0.14], 0.2, -0.1),
    leaf([-0.1, -2.5, 0.12], [-1.12, 0.48, 0.68], 0.18, 0.16),
    leaf([0.1, -2.48, -0.12], [1.12, 0.5, -0.68], 0.18, -0.16),
    leaf([-0.12, -2.28, -0.18], [-0.86, 0.8, -0.78], 0.17, -0.18),
    leaf([0.12, -2.25, 0.18], [0.88, 0.82, 0.78], 0.17, 0.18),
    leaf([-0.1, -2.02, 0.06], [-1.3, 0.54, 0.22], 0.17, 0.14),
    leaf([0.1, -1.98, -0.06], [1.28, 0.56, -0.24], 0.17, -0.14),
    leaf([-0.06, -1.72, 0.18], [-0.58, 0.94, 0.84], 0.15, 0.18),
    leaf([0.06, -1.68, -0.18], [0.6, 0.96, -0.84], 0.15, -0.18),
    leaf([-0.06, -1.36, -0.08], [-0.8, 0.68, -0.52], 0.14, 0.12),
    leaf([0.06, -1.32, 0.08], [0.82, 0.7, 0.52], 0.14, -0.12),
  ]
  leaves.forEach((item) => addStructuredLeaf(structure, cloud, item, random))
  return { cloud, structure }
}

function addStructuredFlower(structure: THREE.Group, cloud: ParticleCloud, spec: FlowerSpec, random: () => number) {
  const matrix = new THREE.Matrix4().compose(spec.center, new THREE.Quaternion().setFromEuler(spec.rotation), new THREE.Vector3(1, 1, 1))
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const radialSegments = 15
  const angleSegments = 72
  const deepOrange = new THREE.Color('#bd3811')
  const orange = new THREE.Color('#ff6818')
  const amber = new THREE.Color('#ffba30')
  const point = new THREE.Vector3()

  for (let angleIndex = 0; angleIndex <= angleSegments; angleIndex += 1) {
    const theta = angleIndex / angleSegments * Math.PI * 2
    for (let radialIndex = 0; radialIndex <= radialSegments; radialIndex += 1) {
      const u = radialIndex / radialSegments
      setCupPoint(point, theta, u, spec.radius)
      point.applyMatrix4(matrix)
      positions.push(point.x, point.y, point.z)
      const color = cupColor(u, theta, deepOrange, orange, amber)
      colors.push(color.r, color.g, color.b)
      if (angleIndex < angleSegments && radialIndex < radialSegments) {
        const row = radialSegments + 1
        const a = angleIndex * row + radialIndex
        const b = a + row
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const meshMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.Mesh(geometry, meshMaterial))
  addFlowerFibers(structure, spec, matrix)

  for (let index = 0; index < spec.density; index += 1) {
    const strand = Math.floor(random() * 112) / 112 * Math.PI * 2
    const theta = random() < 0.72 ? strand + (random() - 0.5) * 0.012 : random() * Math.PI * 2
    const u = random() < 0.34 ? 0.82 + random() * 0.18 : Math.sqrt(random())
    setCupPoint(point, theta, u, spec.radius)
    point.z += (random() - 0.5) * 0.025
    point.applyMatrix4(matrix)
    const color = cupColor(u, theta, deepOrange, orange, amber).multiplyScalar(0.88 + random() * 0.11)
    addPoint(cloud, point.x, point.y, point.z, color, u > 0.82 ? 0.38 + random() * 0.62 : 0.5 + random() * 0.84)
  }
  addStructuredCore(structure, cloud, spec, matrix, random)
}

function setCupPoint(point: THREE.Vector3, theta: number, u: number, radius: number) {
  const edge = radius * (0.91 + Math.sin(theta) * 0.065 + Math.sin(theta * 3 + 0.5) * 0.055 + Math.sin(theta * 5 - 0.8) * 0.032 + Math.sin(theta * 7 + 1.7) * 0.018)
  const radial = edge * u
  const edgeCurl = Math.pow(u, 5) * radius * (0.035 + Math.sin(theta * 4.0 + 0.8) * 0.028)
  const membraneRipple = Math.sin(theta * 6 + u * 8) * radius * 0.012 * u
  point.set(
    Math.cos(theta) * radial,
    Math.sin(theta) * radial * 0.76,
    -radius * 0.16 + Math.pow(u, 1.75) * radius * 0.36 + edgeCurl + membraneRipple,
  )
}

function cupColor(u: number, theta: number, deep: THREE.Color, orange: THREE.Color, amber: THREE.Color) {
  const centerLight = Math.max(0, 1 - u * 3.2)
  const rimLight = Math.max(0, (u - 0.82) / 0.18) * (0.28 + Math.sin(theta * 5 + 0.4) * 0.08)
  const fiberLight = Math.max(0, Math.sin(theta * 13 + u * 18)) * 0.08
  return deep.clone().lerp(orange, 0.54 + u * 0.3).lerp(amber, Math.min(0.82, centerLight * 0.72 + rimLight + fiberLight))
}

function addFlowerFibers(structure: THREE.Group, spec: FlowerSpec, matrix: THREE.Matrix4) {
  const positions: number[] = []
  const colors: number[] = []
  const orange = new THREE.Color('#ff7a1c')
  const amber = new THREE.Color('#ffc03a')
  const from = new THREE.Vector3()
  const to = new THREE.Vector3()
  const strands = 68
  const segments = 11
  for (let strand = 0; strand < strands; strand += 1) {
    const theta = strand / strands * Math.PI * 2
    for (let segment = 0; segment < segments; segment += 1) {
      const u0 = segment / segments
      const u1 = (segment + 1) / segments
      setCupPoint(from, theta, u0, spec.radius)
      setCupPoint(to, theta, u1, spec.radius)
      from.applyMatrix4(matrix)
      to.applyMatrix4(matrix)
      positions.push(from.x, from.y, from.z, to.x, to.y, to.z)
      const color = orange.clone().lerp(amber, Math.max(0, u1 - 0.72) * 0.65)
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.LineSegments(geometry, material))
}

function addStructuredCore(structure: THREE.Group, cloud: ParticleCloud, spec: FlowerSpec, matrix: THREE.Matrix4, random: () => number) {
  const coreCenter = new THREE.Vector3(0, 0, spec.radius * 0.02).applyMatrix4(matrix)
  const geometry = new THREE.SphereGeometry(spec.radius * 0.135, 18, 12)
  geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, 0.58))
  geometry.translate(coreCenter.x, coreCenter.y, coreCenter.z)
  const material = new THREE.MeshBasicMaterial({ color: '#ffe268', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.Mesh(geometry, material))
  const gold = new THREE.Color('#ffc52f')
  const pale = new THREE.Color('#fff3a2')
  const count = Math.round(spec.density * 0.2)
  const streakPositions: number[] = []
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2
    const v = random() * 2 - 1
    const ring = Math.sqrt(1 - v * v)
    const radius = Math.cbrt(random()) * spec.radius * 0.15
    const local = new THREE.Vector3(Math.cos(theta) * ring * radius, Math.sin(theta) * ring * radius, v * radius * 0.7).applyMatrix4(matrix)
    addPoint(cloud, local.x, local.y, local.z, gold.clone().lerp(pale, 0.25 + random() * 0.62).multiplyScalar(0.86 + random() * 0.12), 0.68 + random() * 1.05)
    if (index < 54) {
      const tip = new THREE.Vector3(Math.cos(theta) * spec.radius * 0.23, Math.sin(theta) * spec.radius * 0.23, spec.radius * (0.05 + random() * 0.08)).applyMatrix4(matrix)
      streakPositions.push(coreCenter.x, coreCenter.y, coreCenter.z, tip.x, tip.y, tip.z)
    }
  }
  const streakGeometry = new THREE.BufferGeometry()
  streakGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streakPositions, 3))
  const streakMaterial = new THREE.LineBasicMaterial({ color: '#ffe989', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.LineSegments(streakGeometry, streakMaterial))
}

function addStructuredStem(structure: THREE.Group, cloud: ParticleCloud, stem: THREE.CatmullRomCurve3, radius: number, density: number, random: () => number) {
  const geometry = new THREE.TubeGeometry(stem, 64, radius, 7, false)
  const material = new THREE.MeshBasicMaterial({ color: '#45d86f', transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.Mesh(geometry, material))
  const fiberGeometry = new THREE.BufferGeometry().setFromPoints(stem.getPoints(90))
  const fiberMaterial = new THREE.LineBasicMaterial({ color: '#a8ef61', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.Line(fiberGeometry, fiberMaterial))
  const darkGreen = new THREE.Color('#149447')
  const green = new THREE.Color('#35d46b')
  const lime = new THREE.Color('#b8ed55')
  for (let index = 0; index < density; index += 1) {
    const t = random()
    const center = stem.getPointAt(t)
    const tangent = stem.getTangentAt(t).normalize()
    const normal = tangent.clone().cross(Math.abs(tangent.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
    const binormal = tangent.clone().cross(normal).normalize()
    const angle = random() * Math.PI * 2
    const shell = radius * (0.72 + random() * 0.42)
    center.add(normal.multiplyScalar(Math.cos(angle) * shell)).add(binormal.multiplyScalar(Math.sin(angle) * shell))
    const color = darkGreen.clone().lerp(green, 0.35 + random() * 0.5).lerp(lime, random() * 0.22)
    addPoint(cloud, center.x, center.y, center.z, color, 0.48 + random() * 0.72)
  }
}

function addStructuredLeaf(structure: THREE.Group, cloud: ParticleCloud, spec: LeafSpec, random: () => number) {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const lengthSegments = 12
  const widthSegments = 5
  const dark = new THREE.Color('#117d3d')
  const green = new THREE.Color('#31c95f')
  const lime = new THREE.Color('#a9e94f')
  const direction = spec.direction.clone()
  const length = direction.length()
  const forward = direction.normalize()
  const side = forward.clone().cross(Math.abs(forward.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
  const normal = side.clone().cross(forward).normalize()
  const point = new THREE.Vector3()
  for (let uIndex = 0; uIndex <= lengthSegments; uIndex += 1) {
    const u = uIndex / lengthSegments
    for (let vIndex = 0; vIndex <= widthSegments; vIndex += 1) {
      const v = vIndex / widthSegments * 2 - 1
      setLeafPoint(point, spec, forward, side, normal, length, u, v)
      positions.push(point.x, point.y, point.z)
      const color = dark.clone().lerp(green, 0.42 + u * 0.28).lerp(lime, Math.abs(v) * 0.28)
      colors.push(color.r, color.g, color.b)
      if (uIndex < lengthSegments && vIndex < widthSegments) {
        const row = widthSegments + 1
        const a = uIndex * row + vIndex
        const b = a + row
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.Mesh(geometry, material))
  const fiberPositions: number[] = []
  const fiberFrom = new THREE.Vector3()
  const fiberTo = new THREE.Vector3()
  ;[0, -0.88, 0.88].forEach((v) => {
    for (let segment = 0; segment < 18; segment += 1) {
      setLeafPoint(fiberFrom, spec, forward, side, normal, length, segment / 18, v)
      setLeafPoint(fiberTo, spec, forward, side, normal, length, (segment + 1) / 18, v)
      fiberPositions.push(fiberFrom.x, fiberFrom.y, fiberFrom.z, fiberTo.x, fiberTo.y, fiberTo.z)
    }
  })
  const fiberGeometry = new THREE.BufferGeometry()
  fiberGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fiberPositions, 3))
  const fiberMaterial = new THREE.LineBasicMaterial({ color: '#a7eb54', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.LineSegments(fiberGeometry, fiberMaterial))
  for (let index = 0; index < spec.density; index += 1) {
    const u = Math.sqrt(random())
    const edgeSample = random() < 0.42
    const v = edgeSample ? (random() < 0.5 ? -1 : 1) * (0.76 + random() * 0.24) : random() * 2 - 1
    setLeafPoint(point, spec, forward, side, normal, length, u, v)
    const color = dark.clone().lerp(green, 0.38 + u * 0.35).lerp(lime, Math.abs(v) * 0.34).multiplyScalar(0.82 + random() * 0.16)
    addPoint(cloud, point.x, point.y, point.z, color, edgeSample ? 0.42 + random() * 0.68 : 0.5 + random() * 0.76)
  }
}

function setLeafPoint(point: THREE.Vector3, spec: LeafSpec, forward: THREE.Vector3, side: THREE.Vector3, normal: THREE.Vector3, length: number, u: number, v: number) {
  const serration = 0.88 + Math.sin(u * Math.PI * 8 + (v > 0 ? 0.4 : -0.4)) * 0.12
  const width = Math.sin(u * Math.PI) * spec.width * v * serration
  point.copy(spec.base)
    .add(forward.clone().multiplyScalar(length * u))
    .add(side.clone().multiplyScalar(width))
    .add(normal.clone().multiplyScalar(Math.sin(u * Math.PI) * spec.curl + v * v * 0.035))
}

function addStructuredBud(structure: THREE.Group, cloud: ParticleCloud, center: THREE.Vector3, rotation: THREE.Euler, random: () => number, scale = 1) {
  const geometry = new THREE.SphereGeometry(0.28, 18, 14)
  geometry.applyMatrix4(new THREE.Matrix4().makeScale(0.62 * scale, 1.24 * scale, 0.76 * scale))
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation))
  geometry.translate(center.x, center.y, center.z)
  const material = new THREE.MeshBasicMaterial({ color: '#75d84e', transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending })
  structure.add(new THREE.Mesh(geometry, material))
  const matrix = new THREE.Matrix4().compose(center, new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(0.62 * scale, 1.24 * scale, 0.76 * scale))
  const green = new THREE.Color('#36c65f')
  const lime = new THREE.Color('#c2ed50')
  for (let index = 0; index < Math.round(900 * scale); index += 1) {
    const theta = random() * Math.PI * 2
    const v = random() * 2 - 1
    const ring = Math.sqrt(1 - v * v)
    const point = new THREE.Vector3(Math.cos(theta) * ring * 0.28, v * 0.28, Math.sin(theta) * ring * 0.28).applyMatrix4(matrix)
    addPoint(cloud, point.x, point.y, point.z, green.clone().lerp(lime, 0.18 + random() * 0.56).multiplyScalar(0.84 + random() * 0.14), 0.52 + random() * 0.86)
  }
}

function createLifeParticles(source: ParticleCloud): LifeParticleCloud {
  const cloud: LifeParticleCloud = { positions: [], colors: [], sizes: [], drifts: [], phases: [], speeds: [] }
  const random = seededRandom(9137)
  const pointCount = source.positions.length / 3
  let created = 0
  while (created < 620) {
    const index = Math.floor(random() * pointCount)
    const offset = index * 3
    const color = new THREE.Color(source.colors[offset], source.colors[offset + 1], source.colors[offset + 2])
    const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
    if (random() > 0.25 + Math.min(0.7, luminance * 0.88)) continue
    const start = new THREE.Vector3(source.positions[offset], source.positions[offset + 1], source.positions[offset + 2])
    const drift = new THREE.Vector3(start.x * 0.1 + (random() - 0.5) * 0.16, 0.18 + random() * 0.3, start.z * 0.12 + (random() - 0.5) * 0.16).normalize().multiplyScalar(0.16 + random() * 0.46)
    addLifePoint(cloud, start, drift, color.multiplyScalar(0.88 + random() * 0.12), 0.48 + source.sizes[index] * 0.48, random(), 0.017 + random() * 0.027)
    created += 1
  }
  return cloud
}

function createAmbientParticles(): ParticleCloud {
  const cloud: ParticleCloud = { positions: [], colors: [], sizes: [] }
  const random = seededRandom(2608)
  const color = new THREE.Color('#9df5ce')
  for (let index = 0; index < 160; index += 1) {
    const radius = 2.8 + random() * 2.2
    const theta = random() * Math.PI * 2
    addPoint(cloud, Math.cos(theta) * radius, (random() - 0.5) * 7.2, Math.sin(theta) * radius, color.clone().multiplyScalar(0.5 + random() * 0.4), 0.4 + random() * 0.72)
  }
  return cloud
}

function createPlantMaterial(customVertexShader: string, customFragmentShader: string) {
  return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: customVertexShader, fragmentShader: customFragmentShader, vertexColors: true, transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending })
}

function createParticleGeometry(cloud: ParticleCloud) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(cloud.positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(cloud.colors, 3))
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(cloud.sizes, 1))
  return geometry
}

function createLifeGeometry(cloud: LifeParticleCloud) {
  const geometry = createParticleGeometry(cloud)
  geometry.setAttribute('aDrift', new THREE.Float32BufferAttribute(cloud.drifts, 3))
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(cloud.phases, 1))
  geometry.setAttribute('aSpeed', new THREE.Float32BufferAttribute(cloud.speeds, 1))
  return geometry
}

function centerGeometry(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox()
  const center = new THREE.Vector3()
  geometry.boundingBox?.getCenter(center)
  geometry.translate(-center.x, -center.y, -center.z)
  geometry.computeBoundingSphere()
  return center
}

function disposeStructure(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments)) return
    object.geometry.dispose()
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => materials.add(material))
  })
  materials.forEach((material) => material.dispose())
}

function curve(points: Array<[number, number, number]>) {
  return new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'catmullrom', 0.46)
}

function leaf(base: [number, number, number], direction: [number, number, number], width: number, curl: number): LeafSpec {
  return { base: new THREE.Vector3(...base), direction: new THREE.Vector3(...direction), width: width * 0.62, curl, density: 560 }
}

function addLifePoint(cloud: LifeParticleCloud, position: THREE.Vector3, drift: THREE.Vector3, color: THREE.Color, size: number, phase: number, speed: number) {
  cloud.positions.push(position.x, position.y, position.z)
  cloud.drifts.push(drift.x, drift.y, drift.z)
  cloud.colors.push(color.r, color.g, color.b)
  cloud.sizes.push(size)
  cloud.phases.push(phase)
  cloud.speeds.push(speed)
}

function addPoint(cloud: ParticleCloud, x: number, y: number, z: number, color: THREE.Color, size: number) {
  cloud.positions.push(x, y, z)
  cloud.colors.push(color.r, color.g, color.b)
  cloud.sizes.push(size)
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}
