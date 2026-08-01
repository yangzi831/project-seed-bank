import type { PlantCategory, ZoneKey } from '../data/garden'

export const demoPresetQuestions = [
  '帮我看看最近的项目',
  '整理我的想法',
  '下一步应该做什么',
  '看看有什么被遗忘的种子',
  '帮我整理一下项目成果',
  '我有一个新想法，帮我种下一颗种子',
  '哪些项目正在休眠？我想重新开始做',
] as const

export const dormantProjectFollowUp = '你帮我看看哪个在休眠，我想把它重新开始做'
export const seedCreationIdea = '最近想做一个声音和植物互动的装置'

export type DemoSeedDraft = {
  projectName: string
  type: string
  recommendedZone: string
  description: string
  zoneId: ZoneKey
  plantCategory: PlantCategory
}

export const seedCreationDraft: DemoSeedDraft = {
  projectName: '植语回声 Plant Echo',
  type: '声音互动装置',
  recommendedZone: 'Garden 05 · 实验区',
  description: '让植物的触碰、湿度或生长变化转化为声音，探索人与自然之间可以被听见的互动。',
  zoneId: 'experiment',
  plantCategory: 'flower',
}

const demoResponses: Record<(typeof demoPresetQuestions)[number], string> = {
  '帮我看看最近的项目': `云眠 Claudia：

我看到了你最近照料的几株种子。

最近更新比较活跃的是「Project Seed Bank」。
它正在经历一次新的生长期。

当前花园状态：
- 共 32 个项目
- 13 个项目正在生长
- 4 个项目处于休眠

最近比较值得关注的是：
「Project Seed Bank」
它已经有清晰方向，现在更适合继续补充细节，而不是重新开始。

我也发现有一些沉睡的种子，也许值得重新唤醒。`,
  '整理我的想法': `云眠 Claudia：

我发现你的花园里有一些刚萌芽的想法。

它们还没有长成完整的植物，但已经出现了一些方向。

我帮你整理成三个阶段：

🌱 萌芽中的种子：
还在探索方向，适合继续记录。

🌿 正在生长的项目：
已经有基础，需要持续投入。

🌳 接近成熟的项目：
可以考虑展示、发布或者转化。

有时候不用马上决定一个想法的终点。
先给它一点时间，它会告诉你自己想长成什么。`,
  '下一步应该做什么': `云眠 Claudia：

我观察了一下你的花园。

现在最大的挑战不是缺少新的种子，而是已有的植物需要更多照料。

我建议今天只完成一个小动作：

🌿 选择一个正在生长中的项目
✍️ 写下一条新的成长记录
🔎 找到当前最大的一个阻碍

不需要一次完成整个项目。
一次小小的照料，也会让它继续生长。`,
  '看看有什么被遗忘的种子': `云眠 Claudia：

我发现花园里有几颗沉睡了一段时间的种子。

它们没有失败，只是暂时没有被照顾。

🍂 Life Museum

曾经探索 AI、记忆和个人故事之间的关系。

🍂 Ableton 声音设计工具

曾经尝试让自然语言和声音创作产生连接。

我觉得它们值得重新看看。

不一定要重新开始。
也许只需要问自己：

“如果今天重新打开它，我最想改变什么？”`,
  '帮我整理一下项目成果': `云眠 Claudia：

我帮你整理了一份花园收获记录。

🌱 项目：
Project Seed Bank

当前状态：
生长中

核心想法：
将创意项目转化为可以持续培养的数字植物，让用户观察自己的创造过程。

已完成：
✓ 花园空间设计
✓ 植物成长系统
✓ Garden Keeper 角色系统

下一阶段：
让园丁真正参与项目成长，成为长期陪伴的创造伙伴。`,
  '我有一个新想法，帮我种下一颗种子': `云眠 Claudia：

当然可以。

先把这个还模糊的念头交给我吧。
你最近想做一个什么样的项目？`,
  '哪些项目正在休眠？我想重新开始做': `云眠 Claudia：

我看见目前有 4 颗种子正处于休眠状态。

🍂 Life Museum
关于 AI、记忆与个人故事的空间实验。

🍂 Ableton 声音设计工具
尝试连接自然语言和声音创作。

🍂 知识库清理
等待重新整理散落的资料与收藏。

🍂 开销观察表
曾经想把日常支出变成更容易理解的生活信号。

如果想重新开始，我最推荐先看看「Life Museum」。
它已经有清晰的概念，只需要从一条新的成长记录重新唤醒。`,
}

const dormantProjectResponse = `云眠 Claudia：

我帮你整理了一下目前休眠中的种子。

🍂 Life Museum

这个项目之前已经完成了一部分展览空间设计和 AI 陪伴概念，但最近没有继续推进。

它并没有消失，只是进入了休眠期。

如果重新唤醒，我建议先不要增加新的功能。

可以先记录：

- 为什么想重新打开它
- 最近产生了什么新的想法
- 它现在最需要的一束光是什么

有时候重新开始，不需要重新种下一颗种子。`

export function getPresetDemoResponse(question: string) {
  return demoResponses[question as keyof typeof demoResponses] ?? null
}

export function getDormantProjectDemoResponse(message: string, recentProjectsDemoStarted: boolean) {
  return recentProjectsDemoStarted && message === dormantProjectFollowUp ? dormantProjectResponse : null
}

export function getSeedCreationDemoResponse(message: string, seedCreationStarted: boolean) {
  if (!seedCreationStarted || message !== seedCreationIdea) return null
  return {
    message: `云眠 Claudia：

这个想法已经有了清晰的种子形状。
我帮你整理成一张项目种子卡：`,
    draft: seedCreationDraft,
  }
}
