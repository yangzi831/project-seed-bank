import type { PlantCategory } from './garden'

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

export const plantLibrary: PlantLibraryItem[] = [
  {
    "id": "plant-01",
    "name": "Luminous Bloom",
    "englishName": "Luminous Bloom",
    "chineseName": "流光花",
    "key": "luminous-bloom",
    "category": "flower",
    "growing": "/images/plants/library/plant-01-growing.png",
    "mature": "/images/plants/library/plant-01-mature.png"
  },
  {
    "id": "plant-02",
    "name": "Mist Petal",
    "englishName": "Mist Petal",
    "chineseName": "雾瓣花",
    "key": "mist-petal",
    "category": "flower",
    "growing": "/images/plants/library/plant-02-growing.png",
    "mature": "/images/plants/library/plant-02-mature.png"
  },
  {
    "id": "plant-03",
    "name": "Moonlit Spray",
    "englishName": "Moonlit Spray",
    "chineseName": "月辉花簇",
    "key": "moonlit-spray",
    "category": "flower",
    "growing": "/images/plants/library/plant-03-growing.png",
    "mature": "/images/plants/library/plant-03-mature.png"
  },
  {
    "id": "plant-04",
    "name": "Glass Sprig",
    "englishName": "Glass Sprig",
    "chineseName": "琉璃枝",
    "key": "glass-sprig",
    "category": "flower",
    "growing": "/images/plants/library/plant-04-growing.png",
    "mature": "/images/plants/library/plant-04-mature.png"
  },
  {
    "id": "plant-05",
    "name": "Star Cluster",
    "englishName": "Star Cluster",
    "chineseName": "星簇花",
    "key": "star-cluster",
    "category": "flower",
    "growing": "/images/plants/library/plant-05-growing.png",
    "mature": "/images/plants/library/plant-05-mature.png"
  },
  {
    "id": "plant-06",
    "name": "Pearl Stem",
    "englishName": "Pearl Stem",
    "chineseName": "珠光茎",
    "key": "pearl-stem",
    "category": "green",
    "growing": "/images/plants/library/plant-06-growing.png",
    "mature": "/images/plants/library/plant-06-mature.png"
  },
  {
    "id": "plant-07",
    "name": "Willow",
    "englishName": "Willow",
    "chineseName": "垂柳",
    "key": "willow",
    "category": "tree",
    "growing": "/images/plants/library/plant-07-growing.png",
    "mature": "/images/plants/library/plant-07-mature.png"
  },
  {
    "id": "plant-08",
    "name": "Birch",
    "englishName": "Birch",
    "chineseName": "白桦",
    "key": "birch",
    "category": "tree",
    "growing": "/images/plants/library/plant-08-growing.png",
    "mature": "/images/plants/library/plant-08-mature.png"
  },
  {
    "id": "plant-09",
    "name": "Silver Grass",
    "englishName": "Silver Grass",
    "chineseName": "银芒草",
    "key": "silver-grass",
    "category": "green",
    "growing": "/images/plants/library/plant-09-growing.png",
    "mature": "/images/plants/library/plant-09-mature.png"
  },
  {
    "id": "plant-10",
    "name": "Foxglove",
    "englishName": "Foxglove",
    "chineseName": "毛地黄",
    "key": "foxglove",
    "category": "flower",
    "growing": "/images/plants/library/plant-10-growing.png",
    "mature": "/images/plants/library/plant-10-mature.png"
  },
  {
    "id": "plant-11",
    "name": "Lotus",
    "englishName": "Lotus",
    "chineseName": "荷莲",
    "key": "lotus",
    "category": "flower",
    "growing": "/images/plants/library/plant-11-growing.png",
    "mature": "/images/plants/library/plant-11-mature.png"
  },
  {
    "id": "plant-12",
    "name": "Plume Grass",
    "englishName": "Plume Grass",
    "chineseName": "羽芒草",
    "key": "plume-grass",
    "category": "green",
    "growing": "/images/plants/library/plant-12-growing.png",
    "mature": "/images/plants/library/plant-12-mature.png"
  },
  {
    "id": "plant-13",
    "name": "Coral Flower",
    "englishName": "Coral Flower",
    "chineseName": "珊瑚花",
    "key": "coral-flower",
    "category": "flower",
    "growing": "/images/plants/library/plant-13-growing.png",
    "mature": "/images/plants/library/plant-13-mature.png"
  },
  {
    "id": "plant-14",
    "name": "Crystal Bells",
    "englishName": "Crystal Bells",
    "chineseName": "水晶铃",
    "key": "crystal-bells",
    "category": "flower",
    "growing": "/images/plants/library/plant-14-growing.png",
    "mature": "/images/plants/library/plant-14-mature.png"
  },
  {
    "id": "plant-15",
    "name": "Glass Leaves",
    "englishName": "Glass Leaves",
    "chineseName": "玻璃叶",
    "key": "glass-leaves",
    "category": "green",
    "growing": "/images/plants/library/plant-15-growing.png",
    "mature": "/images/plants/library/plant-15-mature.png"
  },
  {
    "id": "plant-16",
    "name": "White Trumpets",
    "englishName": "White Trumpets",
    "chineseName": "白喇叭花",
    "key": "white-trumpets",
    "category": "flower",
    "growing": "/images/plants/library/plant-16-growing.png",
    "mature": "/images/plants/library/plant-16-mature.png"
  },
  {
    "id": "plant-17",
    "name": "Moss Meadow",
    "englishName": "Moss Meadow",
    "chineseName": "苔原草甸",
    "key": "moss-meadow",
    "category": "green",
    "growing": "/images/plants/library/plant-17-growing.png",
    "mature": "/images/plants/library/plant-17-mature.png"
  },
  {
    "id": "plant-18",
    "name": "Mushroom Moss",
    "englishName": "Mushroom Moss",
    "chineseName": "蘑菇苔丛",
    "key": "mushroom-moss",
    "category": "green",
    "growing": "/images/plants/library/plant-18-growing.png",
    "mature": "/images/plants/library/plant-18-mature.png"
  },
  {
    "id": "plant-19",
    "name": "Ginkgo Glass",
    "englishName": "Ginkgo Glass",
    "chineseName": "银杏琉璃",
    "key": "ginkgo-glass",
    "category": "green",
    "growing": "/images/plants/library/plant-19-growing.png",
    "mature": "/images/plants/library/plant-19-mature.png"
  },
  {
    "id": "plant-20",
    "name": "Disc Flowers",
    "englishName": "Disc Flowers",
    "chineseName": "圆盘花",
    "key": "disc-flowers",
    "category": "flower",
    "growing": "/images/plants/library/plant-20-growing.png",
    "mature": "/images/plants/library/plant-20-mature.png"
  },
  {
    "id": "plant-21",
    "name": "Cattail Grass",
    "englishName": "Cattail Grass",
    "chineseName": "香蒲草",
    "key": "cattail-grass",
    "category": "green",
    "growing": "/images/plants/library/plant-21-growing.png",
    "mature": "/images/plants/library/plant-21-mature.png"
  },
  {
    "id": "plant-22",
    "name": "Blue Lotus",
    "englishName": "Blue Lotus",
    "chineseName": "蓝莲",
    "key": "blue-lotus",
    "category": "flower",
    "growing": "/images/plants/library/plant-22-growing.png",
    "mature": "/images/plants/library/plant-22-mature.png"
  },
  {
    "id": "plant-23",
    "name": "Green Fern",
    "englishName": "Green Fern",
    "chineseName": "绿蕨",
    "key": "green-fern",
    "category": "green",
    "growing": "/images/plants/library/plant-23-growing.png",
    "mature": "/images/plants/library/plant-23-mature.png"
  },
  {
    "id": "plant-24",
    "name": "Blue Bells",
    "englishName": "Blue Bells",
    "chineseName": "蓝铃花",
    "key": "blue-bells",
    "category": "flower",
    "growing": "/images/plants/library/plant-24-growing.png",
    "mature": "/images/plants/library/plant-24-mature.png"
  }
]

export const rawPlantFiles: RawPlantFile[] = [
  {
    "stage": "growing",
    "fileName": "1-transparent-glow.png",
    "path": "/images/plants/raw/growing/1-transparent-glow.png",
    "size": 765981,
    "modifiedAt": "2026-07-06T11:23:30.589Z"
  },
  {
    "stage": "growing",
    "fileName": "2-transparent-glow.png",
    "path": "/images/plants/raw/growing/2-transparent-glow.png",
    "size": 680104,
    "modifiedAt": "2026-07-06T11:23:30.811Z"
  },
  {
    "stage": "growing",
    "fileName": "3-transparent-glow.png",
    "path": "/images/plants/raw/growing/3-transparent-glow.png",
    "size": 640810,
    "modifiedAt": "2026-07-06T11:23:30.924Z"
  },
  {
    "stage": "growing",
    "fileName": "4-transparent-glow.png",
    "path": "/images/plants/raw/growing/4-transparent-glow.png",
    "size": 445241,
    "modifiedAt": "2026-07-06T11:23:31.013Z"
  },
  {
    "stage": "growing",
    "fileName": "5-transparent--glow.png",
    "path": "/images/plants/raw/growing/5-transparent--glow.png",
    "size": 750798,
    "modifiedAt": "2026-07-06T11:23:30.705Z"
  },
  {
    "stage": "growing",
    "fileName": "6-transparent-glow.png",
    "path": "/images/plants/raw/growing/6-transparent-glow.png",
    "size": 764188,
    "modifiedAt": "2026-07-06T11:23:30.444Z"
  },
  {
    "stage": "growing",
    "fileName": "7-tree-willow-transparent-glow.png",
    "path": "/images/plants/raw/growing/7-tree-willow-transparent-glow.png",
    "size": 1229828,
    "modifiedAt": "2026-07-07T01:52:41.757Z"
  },
  {
    "stage": "growing",
    "fileName": "8-tree-birch-transparent-glow.png",
    "path": "/images/plants/raw/growing/8-tree-birch-transparent-glow.png",
    "size": 882085,
    "modifiedAt": "2026-07-07T01:52:42.047Z"
  },
  {
    "stage": "growing",
    "fileName": "9-silver-grass-transparent-glow.png",
    "path": "/images/plants/raw/growing/9-silver-grass-transparent-glow.png",
    "size": 1012425,
    "modifiedAt": "2026-07-07T01:52:41.475Z"
  },
  {
    "stage": "growing",
    "fileName": "10-foxglove-transparent-glow.png",
    "path": "/images/plants/raw/growing/10-foxglove-transparent-glow.png",
    "size": 694010,
    "modifiedAt": "2026-07-07T01:52:42.157Z"
  },
  {
    "stage": "growing",
    "fileName": "11-lotus-transparent-glow.png",
    "path": "/images/plants/raw/growing/11-lotus-transparent-glow.png",
    "size": 787155,
    "modifiedAt": "2026-07-07T01:52:41.586Z"
  },
  {
    "stage": "growing",
    "fileName": "12-plume-grass-transparent-glow.png",
    "path": "/images/plants/raw/growing/12-plume-grass-transparent-glow.png",
    "size": 937054,
    "modifiedAt": "2026-07-07T01:52:41.904Z"
  },
  {
    "stage": "growing",
    "fileName": "13-coral-flower-transparent-glow.png",
    "path": "/images/plants/raw/growing/13-coral-flower-transparent-glow.png",
    "size": 1274953,
    "modifiedAt": "2026-07-07T02:37:01.726Z"
  },
  {
    "stage": "growing",
    "fileName": "14-crystal-bells-transparent-glow.png",
    "path": "/images/plants/raw/growing/14-crystal-bells-transparent-glow.png",
    "size": 719020,
    "modifiedAt": "2026-07-07T02:37:01.996Z"
  },
  {
    "stage": "growing",
    "fileName": "15-glass-leaves-transparent-glow.png",
    "path": "/images/plants/raw/growing/15-glass-leaves-transparent-glow.png",
    "size": 1052297,
    "modifiedAt": "2026-07-07T02:37:01.570Z"
  },
  {
    "stage": "growing",
    "fileName": "16-white-trumpets-transparent-glow.png",
    "path": "/images/plants/raw/growing/16-white-trumpets-transparent-glow.png",
    "size": 1227868,
    "modifiedAt": "2026-07-07T02:37:02.146Z"
  },
  {
    "stage": "growing",
    "fileName": "17-moss-meadow-transparent-glow.png",
    "path": "/images/plants/raw/growing/17-moss-meadow-transparent-glow.png",
    "size": 1012915,
    "modifiedAt": "2026-07-07T02:37:02.701Z"
  },
  {
    "stage": "growing",
    "fileName": "18-mushroom-moss-transparent-glow.png",
    "path": "/images/plants/raw/growing/18-mushroom-moss-transparent-glow.png",
    "size": 1400366,
    "modifiedAt": "2026-07-07T02:37:02.430Z"
  },
  {
    "stage": "growing",
    "fileName": "19-ginkgo-glass-transparent-glow.png",
    "path": "/images/plants/raw/growing/19-ginkgo-glass-transparent-glow.png",
    "size": 1318100,
    "modifiedAt": "2026-07-07T02:37:01.875Z"
  },
  {
    "stage": "growing",
    "fileName": "20-disc-flowers-transparent-glow.png",
    "path": "/images/plants/raw/growing/20-disc-flowers-transparent-glow.png",
    "size": 731852,
    "modifiedAt": "2026-07-07T02:37:02.557Z"
  },
  {
    "stage": "growing",
    "fileName": "21-cattail-grass-transparent-glow.png",
    "path": "/images/plants/raw/growing/21-cattail-grass-transparent-glow.png",
    "size": 778592,
    "modifiedAt": "2026-07-07T02:37:02.952Z"
  },
  {
    "stage": "growing",
    "fileName": "22-lotus-blue-transparent-glow.png",
    "path": "/images/plants/raw/growing/22-lotus-blue-transparent-glow.png",
    "size": 1058744,
    "modifiedAt": "2026-07-07T02:37:02.835Z"
  },
  {
    "stage": "growing",
    "fileName": "23-green-fern-transparent-glow.png",
    "path": "/images/plants/raw/growing/23-green-fern-transparent-glow.png",
    "size": 1083639,
    "modifiedAt": "2026-07-07T02:37:01.435Z"
  },
  {
    "stage": "growing",
    "fileName": "24-blue-bells-transparent-glow.png",
    "path": "/images/plants/raw/growing/24-blue-bells-transparent-glow.png",
    "size": 990797,
    "modifiedAt": "2026-07-07T02:37:02.272Z"
  },
  {
    "stage": "mature",
    "fileName": "1-transparent-strong.png",
    "path": "/images/plants/raw/mature/1-transparent-strong.png",
    "size": 1785809,
    "modifiedAt": "2026-07-06T11:00:23.432Z"
  },
  {
    "stage": "mature",
    "fileName": "2-transparent-strong.png",
    "path": "/images/plants/raw/mature/2-transparent-strong.png",
    "size": 1562709,
    "modifiedAt": "2026-07-06T11:00:23.640Z"
  },
  {
    "stage": "mature",
    "fileName": "3-transparent-strong.png",
    "path": "/images/plants/raw/mature/3-transparent-strong.png",
    "size": 1483777,
    "modifiedAt": "2026-07-06T11:00:23.846Z"
  },
  {
    "stage": "mature",
    "fileName": "4-transparent-strong.png",
    "path": "/images/plants/raw/mature/4-transparent-strong.png",
    "size": 924198,
    "modifiedAt": "2026-07-06T11:00:24.017Z"
  },
  {
    "stage": "mature",
    "fileName": "5-transparent-strong.png",
    "path": "/images/plants/raw/mature/5-transparent-strong.png",
    "size": 1453470,
    "modifiedAt": "2026-07-06T11:00:24.193Z"
  },
  {
    "stage": "mature",
    "fileName": "6-transparent-strong.png",
    "path": "/images/plants/raw/mature/6-transparent-strong.png",
    "size": 2054774,
    "modifiedAt": "2026-07-06T11:00:24.429Z"
  },
  {
    "stage": "mature",
    "fileName": "7-tree-willow-transparent-glow.png",
    "path": "/images/plants/raw/mature/7-tree-willow-transparent-glow.png",
    "size": 1864196,
    "modifiedAt": "2026-07-06T11:05:35.577Z"
  },
  {
    "stage": "mature",
    "fileName": "8-tree-birch-transparent-glow.png",
    "path": "/images/plants/raw/mature/8-tree-birch-transparent-glow.png",
    "size": 1506891,
    "modifiedAt": "2026-07-06T11:05:35.760Z"
  },
  {
    "stage": "mature",
    "fileName": "9-silver-grass-transparent-glow.png",
    "path": "/images/plants/raw/mature/9-silver-grass-transparent-glow.png",
    "size": 1931739,
    "modifiedAt": "2026-07-06T11:05:36.151Z"
  },
  {
    "stage": "mature",
    "fileName": "10-foxglove-transparent-glow.png",
    "path": "/images/plants/raw/mature/10-foxglove-transparent-glow.png",
    "size": 1189716,
    "modifiedAt": "2026-07-06T11:05:35.916Z"
  },
  {
    "stage": "mature",
    "fileName": "11-lotus-transparent-glow.png",
    "path": "/images/plants/raw/mature/11-lotus-transparent-glow.png",
    "size": 2058595,
    "modifiedAt": "2026-07-06T11:05:36.356Z"
  },
  {
    "stage": "mature",
    "fileName": "12-plume-grass-transparent-glow.png",
    "path": "/images/plants/raw/mature/12-plume-grass-transparent-glow.png",
    "size": 2100408,
    "modifiedAt": "2026-07-06T11:05:36.625Z"
  },
  {
    "stage": "mature",
    "fileName": "13-coral-flower-transparent-glow.png",
    "path": "/images/plants/raw/mature/13-coral-flower-transparent-glow.png",
    "size": 1785897,
    "modifiedAt": "2026-07-06T11:13:59.175Z"
  },
  {
    "stage": "mature",
    "fileName": "14-crystal-bells-transparent-glow.png",
    "path": "/images/plants/raw/mature/14-crystal-bells-transparent-glow.png",
    "size": 1046615,
    "modifiedAt": "2026-07-06T11:13:59.360Z"
  },
  {
    "stage": "mature",
    "fileName": "15-glass-leaves-transparent-glow.png",
    "path": "/images/plants/raw/mature/15-glass-leaves-transparent-glow.png",
    "size": 1679536,
    "modifiedAt": "2026-07-06T11:13:59.567Z"
  },
  {
    "stage": "mature",
    "fileName": "16-white-trumpets-transparent-glow.png",
    "path": "/images/plants/raw/mature/16-white-trumpets-transparent-glow.png",
    "size": 1397079,
    "modifiedAt": "2026-07-06T11:13:59.731Z"
  },
  {
    "stage": "mature",
    "fileName": "17-moss-meadow-transparent-glow.png",
    "path": "/images/plants/raw/mature/17-moss-meadow-transparent-glow.png",
    "size": 1808658,
    "modifiedAt": "2026-07-06T11:13:59.947Z"
  },
  {
    "stage": "mature",
    "fileName": "18-mushroom-moss-transparent-glow.png",
    "path": "/images/plants/raw/mature/18-mushroom-moss-transparent-glow.png",
    "size": 2349955,
    "modifiedAt": "2026-07-06T11:14:00.180Z"
  },
  {
    "stage": "mature",
    "fileName": "19-ginkgo-glass-transparent-glow.png",
    "path": "/images/plants/raw/mature/19-ginkgo-glass-transparent-glow.png",
    "size": 2412546,
    "modifiedAt": "2026-07-06T11:14:00.406Z"
  },
  {
    "stage": "mature",
    "fileName": "20-disc-flowers-transparent-glow.png",
    "path": "/images/plants/raw/mature/20-disc-flowers-transparent-glow.png",
    "size": 2004893,
    "modifiedAt": "2026-07-06T11:14:00.662Z"
  },
  {
    "stage": "mature",
    "fileName": "21-cattail-grass-transparent-glow.png",
    "path": "/images/plants/raw/mature/21-cattail-grass-transparent-glow.png",
    "size": 1958228,
    "modifiedAt": "2026-07-06T11:14:00.897Z"
  },
  {
    "stage": "mature",
    "fileName": "22-lotus-blue-transparent-glow.png",
    "path": "/images/plants/raw/mature/22-lotus-blue-transparent-glow.png",
    "size": 2046341,
    "modifiedAt": "2026-07-06T11:14:01.114Z"
  },
  {
    "stage": "mature",
    "fileName": "23-green-fern-transparent-glow.png",
    "path": "/images/plants/raw/mature/23-green-fern-transparent-glow.png",
    "size": 2239672,
    "modifiedAt": "2026-07-06T11:14:01.387Z"
  },
  {
    "stage": "mature",
    "fileName": "24-blue-bells-transparent-glow.png",
    "path": "/images/plants/raw/mature/24-blue-bells-transparent-glow.png",
    "size": 2220695,
    "modifiedAt": "2026-07-06T11:14:01.630Z"
  }
]
