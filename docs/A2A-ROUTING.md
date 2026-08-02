# Project Seed Bank · A2A 协作路由约定（黑客松专用）

> 版本: v1.0 | 2026-08-01 | 协议依据: A2A-PROTOCOL（信封格式复用）
> 本文件是黑客松窗口（Pilot 窗口 + Codex 窗口）的协作约定。与乐理小达人仓库的 A2A 完全独立，互不读对方决策日志。

---

## 项目一句话

把个人项目当作"种子"种进五区数字花园，用植物生长隐喻陪伴项目生命周期，未来接 AI Garden Keeper。

## 当前状态（2026-08-01）

- 前端 demo 已可用（Garden Overview / 五区 / 植物库 24 种 / 成长档案 / 看板 / localStorage 持久化）
- GitHub Pages 已部署：https://yangzi831.github.io/project-seed-bank/
- 下一步方向（见 PROJECT_CONTEXT.md §10）：**AI Garden Keeper Agent 阶段**

---

## 角色与领地

| Agent | 角色 | 读写目录 | 触发词 |
|-------|------|---------|-------|
| **Pilot 窗口** | Orchestrator / 战略 | 读: 本项目 README、PROJECT_CONTEXT.md、A2A 决策日志。写: docs/ 下评审与规划文件 | "Pilot 看方向" / "Pilot 审切片" |
| **Codex 窗口** | Implementer | 读: 决策日志、PROJECT_CONTEXT.md §10、A2A 路由约定。写: src/ 代码 + 执行后追加决策日志 | "Codex 执行" / "按切片做" / "部署" |
| **用户 / 队友** | 最终拍板 | 决定做哪块、验收、push/部署授权 | — |

## 共享上下文（两个 Agent 启动时必读）

1. `docs/A2A-DECISION-LOG.md` — 当前断点、已拍板决策、触发条件
2. `PROJECT_CONTEXT.md` — 项目现状、开发规则、AI 阶段规划（§10）
3. `README.md` — 对外定位与功能清单
4. `docs/A2A-PROTOCOL.md` — 消息信封格式、冲突解决、授权粒度

---

## 消息信封（每条回合必填，沿用乐理 A2A 格式）

```text
A2A-MSG
from: Pilot | Codex | Orchestrator
to: Pilot | Codex | Orchestrator
goal: <一句话目标>
layer: 当下 | 中期 | 长远
constraints: <硬约束，分号分隔>
decision_asked: <需要对方拍板/选边的问题；无则写「无」>
artifacts: <相关路径，逗号分隔>
DoD: <怎样算本回合完成>
body: |
  <正文>
```

---

## 写入规范

- **Codex**：改 `src/` 代码；执行完在 `docs/A2A-DECISION-LOG.md` 置顶追加一条（layer / 结果 / 未完成项 / 状态）
- **Pilot**：写规划/评审到 `docs/` 下（如 `docs/AI-GARDEN-KEEPER-PLAN.md`）
- 两个 Agent 写入后**不 commit / push / deploy**，必须等用户或队友授权口令（"我授权你 push" / "我授权你部署 Pages"）
- git remote 只指向 `yangzi831/project-seed-bank`，不与乐理仓库混用

---

## 冲突规则

- 立场冲突 → 各写 3 行利弊 → 用户/队友拍板 → 记入决策日志
- 文件互踩 → 各自只写自己约定的文件名前缀；引用文件默认只读
- 越界 → 另一方引本文件"写入规范"叫停，记日志

---

## 当前重点切片（首个回合建议）

**AI Garden Keeper 最小闭环**（对应 PROJECT_CONTEXT §10 的 1 + 2）：

1. **Seed Assistant**：把模糊想法变成项目种子（标题/一句描述/建议园区/建议植物/初始下一步）
2. **Growth Log Summarizer**：把项目日志总结成当前状态（阻塞/势头/下一步）

> 注意：接 AI 前需先解决后端或 serverless（PROJECT_CONTEXT §10 明确"不要在 Vite client env 暴露 API key"）。比赛额度 API 仅用于本地开发验证，不直接进前端。

---

## 快速开始（新机器 / 新窗口）

```bash
cd <本仓库>
npm install
npm run dev     # 本地预览
npm run build   # 生产构建（含 SPA fallback）
```

---

_Last updated: 2026-08-01 · 首次建立，配合黑客松启动_
