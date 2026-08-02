# Project Seed Bank · A2A 联合决策日志（黑客松）

> 流水账：Pilot ↔ Codex ↔ 用户拍板。协议见 `docs/A2A-ROUTING.md` 与 `docs/A2A-PROTOCOL.md`。
> 写法：新条目置顶；状态三选一：开放 / 已拍板 / 已执行。
> 本日志与乐理小达人仓库的 A2A-DECISION-LOG 完全独立，互不读对方。

---

### 2026-08-01 · Pilot · 对齐确认 /api/ai 统一方案 · 用户拍板真实上游与清理

- **layer**: 当下
- **背景**: Codex 完成 AI 切片安全收口（`/api/ai` 服务端代理）后，Pilot 核实工作区实际状态并回传对齐结论。
- **核实发现**: Codex 实现已为主实现（services/ai/*、SeedRefiner、AISettingsPanel、schema v3、园丁标签、5 个迁移测试）；Pilot 此前的独立实现（SeedAssistantModal / GrowthSummaryPanel / utils/{aiClient,seedEngine,summarizer}）已无引用，属孤儿文件。
- **用户拍板**:
  1. ✅ 采用 `/api/ai` 服务端代理为统一 AI 承载方案（key 仅服务端读取，前端不保存）
  2. ✅ 真实冒烟用比赛额度 API（openai-next / gpt-5.5，100 刀额度），`.env.local` 已配置
  3. ✅ 授权清理孤儿文件（已删除 5 个文件；style.css 样式段已被 Codex 同步还原，无需再动）
  4. ✅ 分工确认：Codex 为主脑（Implementer），Pilot 辅助脑暴/审阅
- **状态**: 已执行
- **后续动作**: 验证 build/test → 真实 SeedRefiner + Growth Summary 冒烟 → 移动端与演示验收

---

### 2026-08-01 · Codex · 同步远端 1c35c43 并完成 AI 切片安全收口

- **layer**: 当下
- **结果**: 已执行
- **远端更新**: 已从 `yangzi831/project-seed-bank` 拉取并读取最新提交 `1c35c43`。新增 AI 设置、主页/分区「和园丁聊聊」、SeedRefiner、项目详情「园丁」标签、优先级、里程碑、AI 摘要、schema v3 迁移与 Vitest 测试。
- **交互现状**:
  1. HomeView / ZoneView 可打开 SeedRefiner，把模糊想法整理成标题、描述、园区、植物、目标、标签和首个里程碑。
  2. ProjectDetailView 新增 Digital gardener 标签，可请求项目总结并保存 AI 摘要、阻碍、下一步。
  3. TopNav 可打开 AI 设置；项目数据通过 `project-seed-bank:v3` 持久化并兼容 v2/v1。
- **安全决策**: 远端提交原本把 API Key 放在前端 `localStorage` 并由浏览器直连模型，违反 A2A 约定；已改为 Vite dev/preview `/api/ai` 服务端代理。Key 只由 `GARDEN_AI_API_KEY` 或 `OPENAI_API_KEY` 读取；前端仅保存 Provider、模型、开关、token 和 temperature；未配置/调用失败自动走本地降级。
- **DeepSeek 方案**: 默认服务端上游为 `https://api.deepseek.com/v1`，默认模型 `deepseek-chat`；通过 `.env.local` 配置 `GARDEN_AI_BASE_URL`、`GARDEN_AI_MODEL`、`GARDEN_AI_API_KEY`。前端设置不可填写或保存 Key。
- **验证**: `npm run build` 通过；Vitest `1 file / 5 tests passed`；静态扫描确认前端没有 `x-api-key` 或模型直连 URL。
- **未完成项**: 尚未配置真实 Key、尚未验证真实 DeepSeek 返回；尚未 commit / push / deploy；需 Pilot/Copilot 对齐是否采用本地 Provider 代理作为共同方案。
- **状态**: 已执行

---

### 2026-08-01 · 黑客松启动 · 双窗口协作接入

- **layer**: 当下
- **背景**: 参加 8.1 创作者黑客松 × OpenDev，队友 yangzi831 的项目 Project Seed Bank。接入 Codex（比赛 API 额度 gpt-5.5）作为 Implementer，Pilot 窗口作为战略。
- **决策**:
  1. 建立独立 A2A 路由 `docs/A2A-ROUTING.md`（不进乐理仓库）
  2. 首个切片：AI Garden Keeper 最小闭环（Seed Assistant + Growth Log Summarizer）
  3. AI 接入前先解决后端/serverless 承载 API key，不把 key 放前端 env
- **Codex**: 待执行（首回合）
- **Pilot**: 待出方向切片
- **用户拍板**: 确认双窗口分线协作
- **后续动作**: 打开 `docs/A2A-ROUTING.md` → 按"当前重点切片"开工
- **状态**: 已拍板（未执行）
