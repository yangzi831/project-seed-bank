# Project Seed Bank · 协作与项目交接文档（给后端老师）

> 版本: 2026-08-02 整合版（覆盖 8.1 黑客松首日 协作聊天记录 + 项目现状）
> 作者: Pilot（Copilot 窗口）｜配合: Codex（主脑）· 队长（社交 UI）· 后端老师（本文档读者）
> 说明: 本文档自包含，不需再翻其他文件；原始流水见文末索引。

---

## 0. 文档目的

把昨日（8.1）从"单机前端 demo"推进到"AI 园丁 + 园际社交"的**协作过程（聊天内容）**和**项目当前状态**整合成一份，供后端老师快速理解上下文、对齐方案、接手后端实现。

---

## 1. 项目一句话与产品愿景

**一句话**：把个人项目当"植物"种进五区数字花园，AI 园丁陪伴成长；将来园主之间可互相拜访、借鉴、留言、交换——**可视化成长 + 情绪价值 + 互相成就**，面向 AI 学习/转型者。

**核心语义（用户原话提炼，决定产品形态）**：
- 园丁要能**准确说出**每个项目在什么状态，且基于**真实断点**（日志/里程碑/成果）——成长速度快慢、迭代情况、下一步方向、关键词 idea
- **可对话提问**（不是点按钮生成报告）
- **主动发现**：在别人园区发现对自己项目有用的东西 → 主动提醒去交互（**QQ 农场式**互动：拜访、借鉴、申请扒代码、留言、星标、推广）
- 定位：像"数字花园 × 灵魂摆渡人式拜访仪式感"，但**不是航海地图**、不复制特定 IP

---

## 2. 当前技术状态（截至 8.2）

### 前端（已可运行）
- Vite + React 19 + TS + 纯 CSS + localStorage（单机 demo）
- 功能：Garden 总览 / 五区 / 24 植物库 / 项目档案（日志+成果+里程碑）/ 看板 / 拖拽定位
- 已新增：**SeedRefiner（和园丁聊聊）**、项目详情「园丁」标签、**园区全貌**面板、AI 设置

### AI 承载（已接真实 API，本地验证通过）
- `/api/ai` Vite dev 中间件代理（`vite-plugin-garden-ai.ts`），**key 仅服务端读取**（`.env.local`），前端不存 key
- 上游：**openai-next / gpt-5.5**（比赛额度 100 刀，`.env.local` 配置）
- intent 协议：`refineSeed` / `summarizeGrowth` / `understandGarden` / `understandForeignGarden` / `askGardener` / `crossGardenScan`（JSON 结构化输出，未配置 key 自动降级本地规则）

### 数据
- schema v3（priority / tags / milestones / aiSummary / schemaVersion），兼容 v1/v2
- 迁移测试：Vitest 3 files / 13 tests 通过

### 仓库
- 本地 git：`main` 基线 + `feat/garden-understanding` 开发分支
- origin：`https://github.com/yangzi831/project-seed-bank.git`（当前 GitHub 网络被重置，暂无法 fetch/push）
- 未提交改动约 16+ 项（切片 3/3.1 + 园际概念稿 + 文档）

---

## 3. 协作模式（A2A 轻量协议）

| 角色 | 谁 | 职责 |
|------|----|------|
| Orchestrator | 用户 | 拍板、提供 API key、对齐语义、协调 |
| Implementer | Codex 窗口 | 主脑，写 src/、验收、概念稿 |
| Strategist | Pilot（Copilot） | 架构/切片定义、接口契约、本地验收、归档 |
| 队长 | 队友 | 社交交互/园丁形象（视觉层）、园际 UI 部分 |
| 后端老师 | 本文档读者 | 后端方案（Supabase）、多用户、社交数据、merge 协调 |

协议文件：`docs/A2A-ROUTING.md` / `A2A-PROTOCOL.md` / `A2A-DECISION-LOG.md`。

---

## 4. 协作聊天记录精华（8.1 时间线）

> 来自：Pilot↔Codex A2A 消息 + Codex 会话归档（官方 API 时段）。

1. **扒取项目**：用户让 Codex 扒取 `yangzi831/project-seed-bank`，快速掌握状态和下一步进化方向。
2. **接入 A2A**：用户搭建轻量 A2A 协议，让 Codex（主脑）+ Pilot（Pilot 窗口）双窗口协作；先讨论是否用 deepseek 模型。
3. **开工口令**：`A2A，读 .../docs/A2A-ROUTING.md，按当前切片开工` → 切片 1+2「AI Garden Keeper 最小闭环」。
4. **切片 1+2（Codex）**：`SeedRefiner` + 园丁标签 + `/api/ai` 代理 + schema v3；Pilot 核实并清理 5 个孤儿文件。
5. **真实 API**：用户提供比赛 key（openai-next/gpt-5.5）→ `.env.local` → 真实冒烟通过。
6. **语义澄清**：用户反馈"园区全貌只是管理界面/太傻瓜式"，明确要**会对话、会主动发现的园丁**（QQ 农场式）。
7. **后端方案**：用户把架构分享给后端老师 → 敲定 **Supabase** + 社交最小集（访客留言+星标）+ key 服务端统一持。
8. **切片 3（Codex+Pilot）**：`understandGarden` 园区级理解 + 园区全貌 UI；独立复核 build/test/真实冒烟通过（32 项目，生成约 52s）。
9. **切片 3.1 定义（Pilot）**：`askGardener` 对话 + `crossGardenScan` 主动发现 + **简体中文修正**；用户决定"往下做做看"。
10. **园际地图（Codex）**：借鉴灵魂摆渡人（非航海）→ `docs/mockups/garden-network-concept.html` 高保真概念稿（自己园区居中、好友园区发光园路相连、拜访传送动画）；集成归属待拍板。
11. **合并讨论**：用户提到"凌晨把功能 push 上去了；队友也 push 了"，**merge 方法论明确交由后端老师协调**。

---

## 5. 已敲定决策 & 后端对接点

### 已敲定
| 决策 | 结果 |
|------|------|
| AI 承载 | `/api/ai` 服务端代理统一方案（key 不进前端） |
| 真实上游 | openai-next / gpt-5.5（`.env.local`） |
| 后端选型 | **Supabase**（免费 auth+DB+实时）；多用户+登录+园区数据迁 API |
| key 归属 | 部署方服务端统一持有 + 额度限流（BYOK 待议） |
| 社交范围 | 最小集先行：访客留言+星标；交换/扒取走申请-授权后置 |
| RAG | 现阶段不需要（50 项目≈5 万 token，全量装得下），预留决策点 |
| git 纪律 | 单仓库主干+分支；未授权不 push |

### 后端老师需对齐/接手
1. **多用户园区数据模型**：`UserGarden = { owner, zones, projects }`，把前端 localStorage 的 `GardenState` 迁到 Supabase（按用户隔离）
2. **园区授权模型**：`公开 / 好友 / 申请` 三档；对方园区**脱敏规则**（对外只给：项目标题/状态/目标/里程碑/公开成果；**不给**：内部日志细节/未公开备注/个人数据）
3. **好友/关注关系表** + 社交原语（留言、星标）表
4. **`crossGardenScan` 数据源**：授权后拉取对方脱敏园区 → 喂给 intent 生成"发现提醒"
5. **merge 协调**：`feat/garden-understanding` 与队友分支合并
6. 部署：Supabase 起来后，前端 `GardenState` 读写改走 API（保持现有 schema v3 结构，减少前端改动）

---

## 6. 仓库与文件索引

```
project-seed-bank/
├─ docs/
│  ├─ A2A-ROUTING.md / A2A-PROTOCOL.md / A2A-DECISION-LOG.md   # 协作协议与决策
│  ├─ COLLABORATION-SUMMARY-2026-08-01.md                       # 协作总结
│  ├─ CODEX-COLLABORATION-ARCHIVE-2026-08-01.md                 # Codex 会话归档（含恢复方案）
│  ├─ CODEX-SESSIONS-ARCHIVE-2026-08-01.md                      # 17 会话原始清单
│  ├─ SLICE-3-GARDEN-UNDERSTANDING.md / SLICE-3.1-GARDENER-CHAT-DISCOVERY.md
│  └─ mockups/garden-network-concept.html                       # 园际地图概念稿（可浏览器打开）
├─ src/
│  ├─ data/garden.ts                    # 数据 schema v3（地基，改需过契约评审）
│  ├─ services/ai/                      # AI 引擎（types/prompts/context/gardener/settings）
│  ├─ components/{SeedRefiner,AISettingsPanel,GardenUnderstandingPanel}.tsx
│  └─ views/  App.tsx  style.css
├─ vite-plugin-garden-ai.ts             # /api/ai 服务端代理
├─ scripts/codex-archive.mjs            # Codex 会话归档工具
└─ .env.example / .env.local(忽略)       # AI 配置（key 在 .env.local，不提交）
```

---

## 7. 给后端老师的行动清单（建议顺序）

1. **确认 Supabase 项目与 auth 方案**（邮箱/匿名+邀请码？）→ 定 `UserGarden` 表结构
2. **定脱敏规则**（对外园区可见字段白名单）→ 我（Pilot）据此更新 `buildForeignGardenContext`
3. **建好友关系 + 留言/星标表**（最小集）
4. **提供园区读写 API**：`GET/PUT /garden/:userId`、`GET /garden/:userId/public`（脱敏）、好友列表、社交原语端点
5. **merge 协调**：`feat/garden-understanding` 与队友分支合并到主干
6. 有疑问随时对齐——技术细节我在场可随时补

---

_End · 2026-08-02_
