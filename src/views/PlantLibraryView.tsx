import { plantLibrary, rawPlantFiles } from '../data/plantLibrary'
import { publicPath } from '../utils/publicPath'

export function PlantLibraryView() {
  return (
    <main className="page plant-library-page">
      <section className="section-heading list-heading">
        <div>
          <p className="eyebrow">Living forms</p>
          <h1>Plant Library</h1>
          <p>每一种植物都承载想法不同的生命气质，并呈现成长中与形成中的两种形态。</p>
        </div>
      </section>

      <section className="glass-panel">
        <p className="eyebrow">Imported library</p>
        <div className="plant-library-grid">
          {plantLibrary.length ? (
            plantLibrary.map((plant) => (
              <article key={plant.id} className="plant-library-card">
                <strong>{plant.name}</strong>
                <small>
                  {plant.id} / {plant.category}
                </small>
                <div className="plant-library-pair">
                  <figure>
                    <img src={publicPath(plant.growing)} alt={`${plant.name} growing`} />
                    <figcaption>成长中 / Growing</figcaption>
                  </figure>
                  <figure>
                    <img src={publicPath(plant.mature)} alt={`${plant.name} mature`} />
                    <figcaption>形成中 / Blooming</figcaption>
                  </figure>
                </div>
              </article>
            ))
          ) : (
            <p>还没有导入植物。把 PNG 分别放入 public/images/plants/raw/growing 和 public/images/plants/raw/mature 后运行 npm run import:plants。</p>
          )}
        </div>
      </section>

      <section className="glass-panel raw-library-panel">
        <p className="eyebrow">Raw files</p>
        <div className="raw-file-grid">
          {rawPlantFiles.length ? (
            rawPlantFiles.map((file, index) => (
              <figure key={file.path}>
                <img src={publicPath(file.path)} alt={file.fileName} />
                <figcaption>
                  {index + 1}. {file.fileName}
                </figcaption>
              </figure>
            ))
          ) : (
            <p>raw 文件列表为空。</p>
          )}
        </div>
      </section>
    </main>
  )
}
