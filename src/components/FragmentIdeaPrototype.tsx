import { useEffect, useRef, useState } from 'react'
import type { PlantCategory, ZoneKey } from '../data/garden'
import { publicPath } from '../utils/publicPath'

type FragmentKind = 'image' | 'audio' | 'video' | 'file'

export type FragmentIdeaDraft = {
  title: string
  description: string
  zoneId: ZoneKey
  plantCategory: PlantCategory
  plantVariant: string
}

type FragmentIdeaPrototypeProps = {
  onPlant: (draft: FragmentIdeaDraft) => void
}

const fragmentKinds: Array<{ id: FragmentKind; name: string; detail: string; icon: string; accept: string }> = [
  { id: 'image', name: 'Image', detail: '照片、截图、草图', icon: '▧', accept: 'image/*' },
  { id: 'audio', name: 'Audio', detail: '声音、语音、旋律', icon: '◖', accept: 'audio/*' },
  { id: 'video', name: 'Video', detail: '片段、动态记录', icon: '▷', accept: 'video/*' },
  { id: 'file', name: 'File', detail: '文字、PDF、其他文件', icon: '◇', accept: '.txt,.md,.pdf,.doc,.docx,.ppt,.pptx' },
]

const mockDraft: FragmentIdeaDraft = {
  title: '感官碎片收藏',
  description: '把一段还无法命名的视觉、声音或文字碎片留在花园里，观察它会慢慢连接出怎样的新想法。',
  zoneId: 'experiment',
  plantCategory: 'flower',
  plantVariant: 'plant-01',
}

export function FragmentIdeaPrototype({ onPlant }: FragmentIdeaPrototypeProps) {
  const [kind, setKind] = useState<FragmentKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasResult, setHasResult] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!file) return
    setIsAnalyzing(true)
    setHasResult(false)
    const timer = window.setTimeout(() => {
      setIsAnalyzing(false)
      setHasResult(true)
    }, 1250)
    return () => window.clearTimeout(timer)
  }, [file])

  function chooseFragment(nextKind: FragmentKind) {
    setKind(nextKind)
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.accept = fragmentKinds.find((item) => item.id === nextKind)?.accept ?? ''
      inputRef.current.click()
    }
  }

  const selectedKind = fragmentKinds.find((item) => item.id === kind) ?? fragmentKinds[0]

  return (
    <section className="fragment-prototype" aria-label="Drop a Fragment prototype">
      <header className="fragment-prototype-header">
        <div>
          <p className="eyebrow">Drop a Fragment · Prototype</p>
          <h3>把一个还没成形的片段放进来</h3>
          <p>文件只停留在当前浏览器中。园丁分析为固定演示，不会上传，也不会调用 AI。</p>
        </div>
        <span>LOCAL MOCK</span>
      </header>

      <input
        ref={inputRef}
        className="fragment-file-input"
        type="file"
        accept={selectedKind.accept}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      <div className="fragment-kind-grid">
        {fragmentKinds.map((item) => (
          <button key={item.id} className={kind === item.id ? 'active' : ''} type="button" onClick={() => chooseFragment(item.id)}>
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.name}</strong>
            <small>{item.detail}</small>
          </button>
        ))}
      </div>

      {!file && (
        <button className="fragment-drop-zone" type="button" onClick={() => chooseFragment(kind)}>
          <span aria-hidden="true">＋</span>
          <strong>选择一个 {selectedKind.name} 碎片</strong>
          <small>点击选择本地文件，开始体验 mock 分析流程</small>
        </button>
      )}

      {file && (
        <div className="fragment-file-chip">
          <span aria-hidden="true">{selectedKind.icon}</span>
          <div><strong>{file.name}</strong><small>{selectedKind.name} · {formatFileSize(file.size)}</small></div>
          <button type="button" onClick={() => { setFile(null); setHasResult(false) }}>更换</button>
        </div>
      )}

      {isAnalyzing && (
        <div className="fragment-analysis-state" role="status">
          <span className="fragment-keeper-orb" aria-hidden="true">✦</span>
          <div><strong>AI Garden Keeper 正在观察这个碎片</strong><p>正在寻找它可能长成的方向<span className="typing-dots"><i>.</i><i>.</i><i>.</i></span></p></div>
        </div>
      )}

      {hasResult && (
        <article className="fragment-discovery-card">
          <div className="fragment-discovery-heading">
            <div><p className="eyebrow">A new idea found</p><h3>发现一个新的想法</h3></div>
            <span>MOCK INSIGHT</span>
          </div>
          <div className="fragment-discovery-body">
            <img src={publicPath('/images/plants/library/plant-01-growing.png')} alt="流光花，推荐植物" />
            <dl>
              <div><dt>Idea Name</dt><dd>{mockDraft.title}</dd></div>
              <div><dt>Description</dt><dd>{mockDraft.description}</dd></div>
              <div><dt>Recommended Garden</dt><dd>Garden 05 · 实验区</dd></div>
              <div><dt>Recommended Plant</dt><dd>流光花 · Luminous Bloom</dd></div>
            </dl>
          </div>
          <div className="fragment-discovery-actions">
            <button type="button" onClick={() => onPlant(mockDraft)}>Plant this Idea</button>
            <button className="ghost-button" type="button" onClick={() => { setFile(null); setHasResult(false) }}>放入另一个碎片</button>
          </div>
        </article>
      )}
    </section>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
