# Project Seed Bank - 设计文档：社交串门 + 园丁 Agent

> 状态：已评审，待实施（2026-08-01）
> 本文档记录通过设计访谈达成的共识。配套背景见 `PROJECT_CONTEXT.md`。

## 1. 目标与范围

在现有本地优先花园展示（Vite + React + TS + localStorage + GitHub Pages）之上新增两个能力：

1. **社交串门**：用户之间可以互相访问花园，查看对方的完整成长档案并留言。
2. **园丁 Agent**：一个「数字园丁」AI 助手，用户可与其自由对话，它能分析当前花园/项目进展并给出建议。

约束：

- GitHub Pages 是纯静态托管，社交所需的共享存储必须依赖外部后端。
- 保留本地优先架构与现有视觉语言（深绿、玻璃、奶油色文字、发光植物）。
- 不破坏现有功能与部署流程。

## 2. 决策记录

### 2.1 社交分支

| # | 决策 | 理由 |
|---|---|---|
| 1 | **后端：Supabase**（Postgres + Auth + RLS + REST） | 免费档一站式提供账号、数据库、权限、API；无需自建运维 |
| 2 | **公开范围：完整花园只读公开**（区域布局、植物、标题/描述/日志/里程碑/成果） | 产品定位是成长展示；串门价值在于看到完整档案。per-project 私有开关留作后续 |
| 3 | **留言粒度：一张表两级都做**——花园级访客簿 + 项目级留言（`project_id` 可空） | 成本与只做一种几乎相同，交互丰富度翻倍 |
| 4 | **数据归属：本地为源 + 自动推快照**——localStorage 仍是编辑源，变更后防抖推送公开快照到云端；留言存云端 | 不重写现有数据层，保留离线体验；访客读到的就是推送的内容 |
| 5 | **身份：匿名登录 + 认领唯一 handle + 可选中文昵称**，公开档案 URL 为 `/u/:handle` | URL 用 ASCII 稳定可记忆；展示用中文昵称 |
| 6 | **留言门槛：游客可留言**，署名「游客·随机词」；认领 handle 后署昵称 | demo 需同一人扮演双角色；降低互动摩擦 |
| 7 | **发现：顶栏搜索（用户名/昵称模糊匹配）+ URL 直达**；不做目录页 | 目录页（列表 + 排序策略）价值/成本不成比例 |
| 8 | **通知：顶栏铃铛 + 未读计数，轮询 30–60s**，进入访客簿标记已读 | 轮询比 Realtime 简单可靠，demo 足够 |

### 2.2 园丁 Agent 分支

| # | 决策 | 理由 |
|---|---|---|
| 9 | **形态：真多轮对话 Agent**，自然语言回复；对话历史存 localStorage（最近 ~20 条，刷新不丢） | 结构化 intent 适合确定性任务，「分析档案/给建议」是开放式需求 |
| 10 | **宿主：全局浮动对话面板**（右下角），任意页面可开；从项目详情/区域打开时预填上下文 | 现有「和园丁聊聊」按钮改造为「打开面板 + 预填」 |
| 11 | **权限：纯顾问**——只分析建议，写操作全走现有 UI | 用户明确选择；对话层与数据层零耦合 |
| 12 | **上下文：分层注入**——每轮注入最小骨架（标题+状态+区域）；「分析我的花园」显式注入完整档案（复用 `buildProjectContext`）；项目入口注入单项目上下文 | token 成本与智能度平衡；纯顾问不需要每轮看全部日志 |
| 13 | **调用路径：统一服务端 key**——Supabase Edge Function 代理 LLM 调用；端点 `https://api.openai-next.com/v1/messages`（Anthropic Messages 协议）；模型由 env 配置（当前 `claude-opus-4-7`） | key 不落客户端；用户无需配置 |
| 14 | **面板：移除 BYO 设置面板**，降级为只读状态行（「AI 由花园统一提供」） | 统一 key 下配置 UI 失去意义 |
| 15 | **限流：不做**（demo 流量小，风险自担；后续需补 `ai_usage` 表） | 简化 MVP |
| 16 | **旧入口：保留**——种子完善弹窗（可编辑预览 + 应用建项目）、成长总结卡片（aiSummary）原样保留；项目详情「园丁」标签页加「去和园丁聊聊」 | 结构化入口是写操作闭环（确认后应用），对话是开放式交流，两者互补 |

## 3. 数据模型（Supabase）

```sql
-- 用户档案（认领 handle 时写入）
profiles (
  user_id       uuid primary key references auth.users(id),
  handle        text unique not null,   -- 3–20 位，字母/数字/下划线，大小写不敏感
  nickname      text,                   -- 可选中文昵称，展示用
  created_at    timestamptz default now()
)

-- 公开花园快照（本地变更后防抖推送，整个对象覆写）
gardens (
  user_id           uuid primary key references auth.users(id),
  public_snapshot   jsonb not null,     -- 区域布局 + 项目公开字段
  updated_at        timestamptz default now()
)

-- 留言（访客簿 + 项目级）
comments (
  id              uuid primary key default gen_random_uuid(),
  garden_user_id  uuid not null references auth.users(id),  -- 被留言的花园主人
  project_id      text,               -- 为空 = 花园级访客簿，非空 = 项目级留言
  author_user_id  uuid,               -- 认领用户留言时记录；游客为空
  author_name     text not null,      -- 中文昵称 / handle / 「游客·随机词」
  text            text not null,
  created_at      timestamptz default now()
)
```

**RLS 策略：**

- `profiles` / `gardens` / `comments`：SELECT 对所有匿名用户开放（公开档案）。
- `profiles` / `gardens`：INSERT/UPDATE 仅本人（`auth.uid() = user_id`）。
- `comments`：INSERT 对所有用户开放（游客可留言）；DELETE = 园主删自己花园的留言 OR 留言者删自己的（`garden_user_id = auth.uid()` OR `author_user_id = auth.uid()`）。

**边界行为：**

- 未认领 handle：无公开档案、不进搜索索引；访问不存在的 `/u/:handle` → 「这个花园不存在」空态。
- 留言排序：新的在前。
- 花园主人可通过 `/u/:handle` 预览自己的公开形态（访客视角）。

## 4. 前端路由与 UI 变更

### 路由（`src/App.tsx` 的 `parseRoute` / `routeToPath`）

| 路由 | 内容 |
|---|---|
| `/u/:handle`（新增） | 只读花园视图：渲染对方公开快照（区域布局 + 植物 + 项目 + 访客簿 + 项目级留言） |
| 其余现有路由 | 不变（`/garden`、`/plants`、`/board`、`/garden/:zoneId`、`/dev/plant-library`） |

### UI 变更

- **TopNav**（`src/components/TopNav.tsx`）：加用户名/昵称搜索框 + 铃铛（未读计数，轮询 30–60s；进入访客簿后标记已读）。
- **认领流程**：首次打开引导「认领你的花园用户名」（handle + 可选昵称），写入 `profiles`。
- **访客视图**：新视图组件，只读渲染云端快照 + 留言表单；主人访问时显示「这是你的花园」并给出编辑入口。
- **留言**：花园级访客簿（花园视图底部）+ 项目级留言（项目详情弹窗 `ProjectDetailView` 内）。
- **公开快照推送**：复用 `App.tsx` 的 `saveGardenState` effect 链，加防抖 + 在线检查，推 `public_snapshot` 到 `gardens` 表。
- **对话面板**：右下角浮动面板（新组件 `GardenerChatPanel`），现有「和园丁聊聊」按钮（`HomeView`/`ZoneView`）与项目详情的「AskGardener」改为「打开面板 + 预填上下文」。

## 5. AI 服务架构

### 调用链

```
客户端 (React)
  ├─ callGardener({intent, messages, context})  ──fetch──▶  Edge Function  /gardener
  │                                                              │
  │                                                    读取 env: LLM_KEY / LLM_BASE_URL
  │                                                    (https://api.openai-next.com)
  │                                                    / LLM_MODEL (claude-opus-4-7)
  │                                                              ▼
  └─────────────── 解析响应 ────────────────      POST /v1/messages (Anthropic 协议)
```

- key / provider / model 全部在 Edge Function 环境变量中，客户端不接触。
- 客户端发送 `{ intent, messages, context }`；`buildProjectContext()` / `buildGardenContext()`（`src/services/ai/context.ts`）仍在客户端构建并作为 payload 发送（非敏感）。
- 现有 `src/services/ai/gardener.ts` 的 anthropic 分支（`/v1/messages` + `x-api-key` + `anthropic-version: 2023-06-01` 头）可原样搬进 Edge Function，改动面最小。
- 提示词模板（`src/services/ai/prompts.ts`）保留在客户端或随实现迁至服务端均可（非敏感）。

### 对话上下文分层

| 触发方式 | 注入内容 |
|---|---|
| 每轮默认 | 花园最小骨架：各项目标题 + 状态 + 区域 |
| 「分析我的花园」按钮 | 完整档案：逐项目 `buildProjectContext`（目标/标签/里程碑/最近日志/成果） |
| 从项目详情打开 | 该项目 `buildProjectContext` |

### 对话历史

- 存 localStorage（`gardener-chat:v1`），最近 ~20 条；刷新不丢；多设备不互通（与本地优先架构一致）。

### 模型注意事项

- `claude-opus-4-7` 非 Anthropic 官方模型 ID（官方 Opus 最新为 `claude-opus-4-8`），以 openai-next.com 实际支持的模型串为准；模型串放 env，换模型只改环境变量不改代码。

## 6. 实现里程碑

1. **M1 云地基**：Supabase 项目 + `profiles`/`gardens`/`comments` 表 + RLS；Supabase 匿名登录接入；认领 handle 流程（含搜索索引写入）。
2. **M2 串门**：公开快照防抖推送（挂到现有 `saveGardenState` effect）；`/u/:handle` 访客视图（只读渲染快照 + 花园空态）；搜索；留言（访客簿 + 项目级，游客署名规则）；铃铛轮询 + 已读标记。
3. **M3 园丁对话**：Edge Function `/gardener`（env 配 key/endpoint/model）；对话面板 UI + localStorage 历史；上下文分层注入；现有 `refineSeed`/`summarizeGrowth` 迁移到代理路径；移除 BYO 设置面板（降级为只读状态行）。
4. **M4 打磨**：访客视角预览（主人视角）、留言删除（RLS 已定）、移动端适配、空态与错误态。

## 7. 风险与后续加固

| 风险 | 缓解/后续 |
|---|---|
| 统一 key 无限流，上线后被刷 | 补 `ai_usage` 用量表（user_id + 日期 + 累计 token，复用 `estimateTokens`），超限提示「园丁今天累了」 |
| 本地为源 + 云快照：离线时公开档案过期；多设备不互通 | 沿用现有单浏览器模型；如需多设备，升级为云端为唯一真相（需重写数据层） |
| 快照含完整日志/成果 = 等同公开展示 | 产品上需让用户知晓；per-project 私有开关留作后续 |
| `claude-opus-4-7` 模型串与官方不一致 | env 配置化，按供应商实际支持调整 |
| GitHub Pages 刷新 404 | 现有 `dist/404.html` 机制已覆盖；新增 `/u/:handle` 路由需复验 SPA fallback |

## 8. 实施要点对照（现有代码）

| 现有代码 | 本次改动 |
|---|---|
| `src/App.tsx`（路由、handlers、`saveGardenState` effect） | 新增 `/u/:handle` 路由；公开快照推送挂到 effect 链 |
| `src/components/TopNav.tsx` | 加搜索框 + 铃铛 |
| `src/services/ai/gardener.ts` | fetch 目标改为 Edge Function；anthropic 调用代码迁入 Edge Function |
| `src/services/ai/context.ts` | 保留，客户端构建上下文作为 payload |
| `src/services/ai/settings.ts` / `AISettingsPanel.tsx` | 移除（或降级为只读状态行） |
| `src/components/SeedRefiner.tsx`、`ProjectDetailView` 园丁标签页 | 保留；入口改为打开对话面板 |
| `src/data/garden.ts`（`GardenState`） | 本地结构不变；快照序列化时过滤私有字段（按公开范围定义） |

**不回归清单**（沿用 `PROJECT_CONTEXT.md` 第 9 节）：桌面布局、Plants 页固定 24 植物图鉴、Board 页、概览无文字标签、单园项目标签、显式植物选择器、localStorage 持久化、GitHub Pages base 路径。
