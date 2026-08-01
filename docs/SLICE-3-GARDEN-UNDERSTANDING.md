# 切片 3 · 园区级理解（Garden Understanding）

> 作者: Pilot | 日期: 2026-08-01 | 状态: 已定义，待 Codex 开工
> 关联: PROJECT_CONTEXT §10（AI 规划）+ 用户与后端老师已敲定后端方案（Supabase / 服务端统一持 key / 社交最小集先行）

## 1. 目标

让 AI 具备"园区级"理解能力，支撑两类诉求：

1. **理解自己的园区**：一眼看懂整个园区每个项目处于什么状态、健康度如何、各自该推进到什么状态。
2. **理解对方园区（边界内）**：经授权后读取对方园区的脱敏摘要，产出"能借鉴什么 / 可申请什么"的建议，喂给园丁社交交互（队友在做 UI）。

## 2. 现状核实（2026-08-01）

- ✅ 已有单项目理解：`intent=summarizeGrowth`（园丁标签「请园丁整理」）
- ✅ 已有 `buildProjectContext(project)`：标题/状态/目标/描述/标签/里程碑/日志/成果
- ⚠️ `buildGardenContext(state)` 只列"每个区域有哪些项目名"，**不含每项目状态/健康度/推进建议** → 本次要增强
- ⚠️ 无园区级 intent、无园区全貌 UI

## 3. 关于 RAG（结论：现阶段不建）

用 `estimateTokens`（中文≈0.5 token/字）估算：50 个项目 × 1-2KB ≈ 5 万 token，`gpt-5.5` 上下文窗口可全量容纳，**连对方园区（脱敏摘要）也塞得下**。
- 现在上 RAG 属过度设计（引入向量库/检索误差）
- 预留决策点：当园区出现海量文档库/图片/长积累资料（>几十万 token）时再评估

## 4. 改动范围（Codex 领地 src/）

1. **增强 `buildGardenContext`**：把每个项目纳入 状态 / 最近动态（logs 前几条）/ 里程碑完成度 / 是否久未更新
2. **新增 intent `understandGarden`**
   - 输入：`buildGardenContext` 增强版（自己园区全量）
   - 输出 JSON：
     ```json
     {
       "gardenSummary": "园区整体叙事（80字内）",
       "rhythm": "整体节奏判断（如：生长型/沉淀型/偏停滞）",
       "projects": [
         { "title": "...", "current": "生长中",
           "health": "active | slowing | stuck | dormant",
           "recommendedStatus": "growing | mature | dormant | harvested",
           "oneLine": "一句判断与建议" }
       ]
     }
     ```
3. **新增 intent `understandForeignGarden`**
   - 输入：对方园区**脱敏摘要**（见 §5）
   - 输出 JSON：
     ```json
     {
       "impression": "对对方园区的整体印象",
       "borrowable": [ { "from": "项目名", "what": "可借鉴的点", "how": "怎么申请/复用" } ],
       "compliment": "一句真诚的认可（供留言/星标话术）"
     }
     ```
4. **最小 UI 验证**：园丁面板增加「园区全貌」视图（只读展示 understandGarden 结果，暂不做重设计，后续接队友的交互形象）

## 5. 前置：脱敏规则（需与后端老师对齐）

对方园区喂给 AI 时给什么、不给什么，先定死，避免越权/隐私泄漏：

- 给：项目标题 / 状态 / 目标 / 里程碑 / 成果（对外可见部分）
- 不给：内部日志细节、未公开备注、个人数据
- 授权模型：`公开 / 好友 / 申请` 三档（Supabase 端实现）

## 6. 验收清单（DoD）

- [ ] `understandGarden` 真实 AI 返回结构合法（本地 `.env.local` + gpt-5.5 冒烟）
- [ ] `understandForeignGarden` 用**本地假数据**先冒烟通过（等后端授权就绪再接真数据）
- [ ] 园区全貌 UI 可读、无样式回归
- [ ] `npm run build` + `npm test` 通过
- [ ] 未 commit / push / deploy，等用户口令

## 7. Git 工作流（必须遵守）

- 在独立分支开发：`feat/garden-understanding`
- 只提交本切片改动；不夹带 .env.local（已被 .gitignore 忽略，确认不含 key）
- 合回主干前：本地验收通过 + 用户口令（"我授权你 push"）
- 单一主干为协作基准，避免双份代码（与队友/后端老师统一）
