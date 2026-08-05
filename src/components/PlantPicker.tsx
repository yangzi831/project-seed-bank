import { plantLibrary } from '../data/plantLibrary'
import { getRandomPlantVariant, plantCategories, plantCategoryMeta } from '../data/garden'
import type { PlantCategory } from '../data/garden'
import { publicPath } from '../utils/publicPath'

type PlantPickerProps = {
  category: PlantCategory | 'all'
  selectedVariant?: string
  onCategoryChange: (category: PlantCategory | 'all') => void
  onSelectVariant: (plantVariant?: string) => void
}

export function PlantPicker({ category, selectedVariant, onCategoryChange, onSelectVariant }: PlantPickerProps) {
  const filteredPlants = category === 'all' ? plantLibrary : plantLibrary.filter((plant) => plant.category === category)
  const visiblePlants = filteredPlants.length ? filteredPlants : plantLibrary

  function chooseRandom() {
    const variant = category === 'all' ? getRandomPlantVariant('uncategorized') : getRandomPlantVariant(category)
    onSelectVariant(variant)
  }

  return (
    <section className="plant-picker-panel">
      <div className="plant-picker-intro">
        <div><p className="eyebrow">Living form</p><strong>为想法选择一种生命形态</strong></div>
        <small>植物不是分类标签，而是这颗想法在花园里的身体。</small>
      </div>
      <div className="plant-picker-toolbar">
        <div className="plant-filter-tabs" role="tablist" aria-label="Plant category">
          <button className={category === 'all' ? 'active' : ''} type="button" onClick={() => onCategoryChange('all')}>
            全部
          </button>
          {plantCategories.map((item) => (
            <button key={item} className={category === item ? 'active' : ''} type="button" onClick={() => onCategoryChange(item)}>
              {plantCategoryMeta[item].label}
            </button>
          ))}
        </div>
        <button type="button" className="ghost-button small" onClick={chooseRandom}>
          随机一株
        </button>
      </div>

      <div className="plant-choice-grid">
        {visiblePlants.length ? (
          visiblePlants.map((plant) => (
            <button
              key={plant.id}
              className={`plant-choice ${selectedVariant === plant.id ? 'selected' : ''}`}
              type="button"
              onClick={() => onSelectVariant(plant.id)}
            >
              <span className="plant-choice-image">
                <img src={publicPath(plant.mature)} alt={plant.chineseName} />
                <img className="plant-choice-mini" src={publicPath(plant.growing)} alt="" />
              </span>
              <strong>{plant.chineseName}</strong>
              <span>{plant.englishName}</span>
            </button>
          ))
        ) : (
          <p>还没有导入植物，先使用粒子占位。</p>
        )}
      </div>
    </section>
  )
}
