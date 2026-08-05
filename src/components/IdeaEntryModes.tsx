export type IdeaEntryMode = 'write' | 'fragment'

type IdeaEntryModesProps = {
  activeMode: IdeaEntryMode
  onWrite: () => void
  onDropFragment: () => void
  onTalkWithKeeper?: () => void
}

export function IdeaEntryModes({ activeMode, onWrite, onDropFragment, onTalkWithKeeper }: IdeaEntryModesProps) {
  return (
    <section className="idea-entry-modes" aria-label="Choose how to bring an idea into Bloom">
      <button className={`idea-entry-mode ${activeMode === 'write' ? 'is-active' : ''}`} type="button" onClick={onWrite}>
        <span className="idea-entry-mode-icon" aria-hidden="true">✎</span>
        <span className="idea-entry-mode-copy">
          <strong>Write an Idea</strong>
          <b>写下一个想法</b>
          <small>从一句话开始，把它轻轻种进花园。</small>
        </span>
        <em>{activeMode === 'write' ? '正在使用' : '选择 →'}</em>
      </button>

      <button className={`idea-entry-mode fragment-mode ${activeMode === 'fragment' ? 'is-active' : ''}`} type="button" onClick={onDropFragment}>
        <span className="idea-entry-mode-icon" aria-hidden="true">◇</span>
        <span className="idea-entry-mode-copy">
          <strong>Drop a Fragment</strong>
          <b>放入一个灵感碎片</b>
          <small>图片 · 音频 · 视频 · 文件</small>
        </span>
        <em>{activeMode === 'fragment' ? 'Prototype active' : 'Try prototype →'}</em>
      </button>

      <button className="idea-entry-mode keeper-mode" type="button" onClick={onTalkWithKeeper} disabled={!onTalkWithKeeper}>
        <span className="idea-entry-mode-icon" aria-hidden="true">✦</span>
        <span className="idea-entry-mode-copy">
          <strong>Talk with Keeper</strong>
          <b>和园丁聊聊</b>
          <small>把模糊的念头交给园丁，一起找到它的形状。</small>
        </span>
        <em>进入小屋 →</em>
      </button>
    </section>
  )
}
