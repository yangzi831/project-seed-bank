import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')
const rawRootDir = join(projectRoot, 'public', 'images', 'plants', 'raw')
const growingRawDir = join(rawRootDir, 'growing')
const matureRawDir = join(rawRootDir, 'mature')
const libraryDir = join(projectRoot, 'public', 'images', 'plants', 'library')
const manifestPath = join(projectRoot, 'src', 'data', 'plantLibrary.ts')

const supportedExtensions = new Set(['.png'])

mkdirSync(growingRawDir, { recursive: true })
mkdirSync(matureRawDir, { recursive: true })
mkdirSync(libraryDir, { recursive: true })

const growingFiles = readImageFiles(growingRawDir, 'growing')
const matureFiles = readImageFiles(matureRawDir, 'mature')
const pairCount = Math.min(growingFiles.length, matureFiles.length)
const plantLibrary = []
const plantNames = [
  ['luminous-bloom', 'Luminous Bloom', '流光花'],
  ['mist-petal', 'Mist Petal', '雾瓣花'],
  ['moonlit-spray', 'Moonlit Spray', '月辉花簇'],
  ['glass-sprig', 'Glass Sprig', '琉璃枝'],
  ['star-cluster', 'Star Cluster', '星簇花'],
  ['pearl-stem', 'Pearl Stem', '珠光茎'],
  ['willow', 'Willow', '垂柳'],
  ['birch', 'Birch', '白桦'],
  ['silver-grass', 'Silver Grass', '银芒草'],
  ['foxglove', 'Foxglove', '毛地黄'],
  ['lotus', 'Lotus', '荷莲'],
  ['plume-grass', 'Plume Grass', '羽芒草'],
  ['coral-flower', 'Coral Flower', '珊瑚花'],
  ['crystal-bells', 'Crystal Bells', '水晶铃'],
  ['glass-leaves', 'Glass Leaves', '玻璃叶'],
  ['white-trumpets', 'White Trumpets', '白喇叭花'],
  ['moss-meadow', 'Moss Meadow', '苔原草甸'],
  ['mushroom-moss', 'Mushroom Moss', '蘑菇苔丛'],
  ['ginkgo-glass', 'Ginkgo Glass', '银杏琉璃'],
  ['disc-flowers', 'Disc Flowers', '圆盘花'],
  ['cattail-grass', 'Cattail Grass', '香蒲草'],
  ['blue-lotus', 'Blue Lotus', '蓝莲'],
  ['green-fern', 'Green Fern', '绿蕨'],
  ['blue-bells', 'Blue Bells', '蓝铃花'],
]
const categoryOverrides = new Map([['plant-06', 'green']])

for (let index = 0; index < pairCount; index += 1) {
  const plantNumber = String(index + 1).padStart(2, '0')
  const id = `plant-${plantNumber}`
  const growingFileName = `${id}-growing.png`
  const matureFileName = `${id}-mature.png`

  copyFileSync(growingFiles[index].absolutePath, join(libraryDir, growingFileName))
  copyFileSync(matureFiles[index].absolutePath, join(libraryDir, matureFileName))
  const [key, englishName, chineseName] = plantNames[index] ?? [`plant-${plantNumber}`, `Plant ${plantNumber}`, `植物 ${plantNumber}`]

  plantLibrary.push({
    id,
    name: englishName,
    englishName,
    chineseName,
    key,
    category: categoryOverrides.get(id) ?? inferCategory(growingFiles[index].fileName, matureFiles[index].fileName),
    growing: `/images/plants/library/${growingFileName}`,
    mature: `/images/plants/library/${matureFileName}`,
  })
}

const rawPlantFiles = [...growingFiles, ...matureFiles].map((file) => ({
  stage: file.stage,
  fileName: file.fileName,
  path: `/images/plants/raw/${file.stage}/${encodeURIComponent(file.fileName)}`,
  size: file.size,
  modifiedAt: file.modifiedAt,
}))

writeFileSync(manifestPath, renderManifest(plantLibrary, rawPlantFiles), 'utf8')

console.log(`Found ${growingFiles.length} growing images.`)
console.log(`Found ${matureFiles.length} mature images.`)
console.log(`Imported ${plantLibrary.length} plant pairs.`)
console.log(`Generated ${manifestPath}`)

if (growingFiles.length !== matureFiles.length) {
  console.warn(`Warning: growing/mature counts differ. Only ${pairCount} pairs were imported.`)
}

function readImageFiles(directory, stage) {
  return readdirSync(directory)
    .filter((fileName) => supportedExtensions.has(extname(fileName).toLowerCase()))
    .sort(compareByLeadingNumber)
    .map((fileName) => {
      const absolutePath = join(directory, fileName)
      const stats = statSync(absolutePath)
      return {
        stage,
        fileName,
        absolutePath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      }
    })
}

function compareByLeadingNumber(a, b) {
  const aNumber = getLeadingNumber(a)
  const bNumber = getLeadingNumber(b)

  if (aNumber !== bNumber) {
    return aNumber - bNumber
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function getLeadingNumber(fileName) {
  const match = fileName.match(/^(\d+)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

function inferCategory(...fileNames) {
  const text = fileNames.join(' ').toLowerCase()

  if (text.includes('tree') || text.includes('willow') || text.includes('birch')) {
    return 'tree'
  }

  if (text.includes('grass') || text.includes('fern') || text.includes('moss') || text.includes('leaves') || text.includes('ginkgo')) {
    return 'green'
  }

  return 'flower'
}

function renderManifest(library, rawFilesForManifest) {
  return `import type { PlantCategory } from './garden'

export type PlantLibraryItem = {
  id: string
  name: string
  englishName: string
  chineseName: string
  key: string
  category: PlantCategory
  growing: string
  mature: string
}

export type RawPlantFile = {
  stage: 'growing' | 'mature'
  fileName: string
  path: string
  size: number
  modifiedAt: string
}

export const plantLibrary: PlantLibraryItem[] = ${JSON.stringify(library, null, 2)}

export const rawPlantFiles: RawPlantFile[] = ${JSON.stringify(rawFilesForManifest, null, 2)}
`
}
