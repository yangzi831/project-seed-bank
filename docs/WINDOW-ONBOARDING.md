# Project Seed Bank · 双窗口协作启动包（一次性给全）

> 用途：给 Pilot 新窗口 / Codex 新窗口 / 队友，开局即用。
> 版本：2026-08-01 · 黑客松

---

## 一、项目位置（唯一稳定路径，所有窗口统一用）

```
C:\Users\23017\Desktop\AI比赛\project-seed-bank
```

## 二、必读文件（启动顺序）

| 顺序 | 文件 | 绝对路径 |
|------|------|---------|
| 1 | A2A 路由（角色/触发词/当前切片） | `C:\Users\23017\Desktop\AI比赛\project-seed-bank\docs\A2A-ROUTING.md` |
| 2 | A2A 协议（信封/礼仪/授权） | `C:\Users\23017\Desktop\AI比赛\project-seed-bank\docs\A2A-PROTOCOL.md` |
| 3 | 决策日志（当前断点） | `C:\Users\23017\Desktop\AI比赛\project-seed-bank\docs\A2A-DECISION-LOG.md` |
| 4 | 项目现状与 AI 规划 | `C:\Users\23017\Desktop\AI比赛\project-seed-bank\PROJECT_CONTEXT.md` |
| 5 | 对外定位 | `C:\Users\23017\Desktop\AI比赛\project-seed-bank\README.md` |

## 三、首次运行步骤（新窗口必须做）

```bash
cd C:\Users\23017\Desktop\AI比赛\project-seed-bank
npm install        # 安装依赖（node_modules 未随项目复制）
npm run dev        # 本地预览
```

## 四、角色分工

| 角色 | 谁 | 职责 | 默认不做什么 |
|------|-----|------|------------|
| Orchestrator | 用户/队友 | 定目标、拍板、授权 push/部署 | — |
| Implementer | Codex 窗口 | 读协议落地代码，改 src/，更新决策日志 | 不擅自 push/部署；不重写已交付 |
| Strategist | Pilot 窗口 | 优先级、审切片、挑战假设 | 不改 src/（除非明确授权） |

## 五、消息信封（每条回合必填）

```text
A2A-MSG
from: Pilot | Codex | Orchestrator
to: Pilot | Codex | Orchestrator
goal: <一句话目标>
layer: 当下 | 中期 | 长远
constraints: <硬约束，分号分隔>
decision_asked: <需要拍板的问题；无则写「无」>
artifacts: <相关路径，逗号分隔>
DoD: <怎样算本回合完成>
body: |
  <正文>
```

## 六、当前切片（第一回合目标）

**AI Garden Keeper 最小闭环**（对应 PROJECT_CONTEXT §10 的 1+2）：

1. **Seed Assistant**：把模糊想法变成项目种子（标题/一句描述/建议园区/建议植物/初始下一步）
2. **Growth Log Summarizer**：把项目日志总结成当前状态（阻塞/势头/下一步）

> ⚠️ 接 AI 前必须先解决后端/serverless 承载 API key（PROJECT_CONTEXT §10 明令：不把 key 放 Vite 前端 env）。比赛额度 API 仅用于本地开发验证。

## 七、授权口令（必须等用户说）

| 动作 | 口令 |
|------|------|
| 改 src/ 代码 | "Codex 执行" / "按切片做" |
| push 到 GitHub | "我授权你 push" |
| 部署 Pages | "我授权你部署 Pages" |
| 接真实 AI API | 单独确认承载方案后再授权 |

## 八、一行启动口令（复制即用）

> **A2A，读 `C:\Users\23017\Desktop\AI比赛\project-seed-bank\docs\A2A-ROUTING.md`，按当前切片开工。项目在 `C:\Users\23017\Desktop\AI比赛\project-seed-bank`，首次需 `npm install` 后 `npm run dev`。**

---

_Last updated: 2026-08-01 · 稳定路径版_
