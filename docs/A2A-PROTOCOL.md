# Project Seed Bank · A2A 协议（轻量对等 · 文件交换）

> **性质**：Pilot ↔ Codex 之间（以及和用户/队友）的轻量对等协议，基于粘贴聊天 + 仓库内 Markdown 文件。
> **日期**：2026-08-01 · 配套：`A2A-ROUTING.md`（角色/触发词）· `A2A-DECISION-LOG.md`（决策流水）
> **核心**：角色分工 + 消息信封 + 回合礼仪 + 授权粒度。不是网络服务器，不需要自动 RPC。

---

## 1. 角色

| 角色 | 谁 | 职责 | 默认不做什么 |
|------|-----|------|------------|
| Orchestrator | 用户/队友 | 定目标、拍板、授权 push/部署、在窗口间传递文件 | 不必写协议正文 |
| Implementer | Codex 窗口 | 读协议落地代码；更新决策日志；按领地改 src/ | 不擅自 push/部署；不重写已交付系统 |
| Strategist | Pilot 窗口 | 优先级、叙事、审切片；挑战假设 | 不直接改 src/（除非明确授权）；不重复交付 |

---

## 2. 消息信封（每条回合必填）

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
  <正文：立场 / 切片计划 / 审阅意见>
```

---

## 3. 回合礼仪

1. **先读再写**：Codex 先读 `A2A-ROUTING.md` → `A2A-DECISION-LOG.md` → `PROJECT_CONTEXT.md`；Pilot 同。
2. **一小刀**：每回合只推一个可验收切片，禁止"整盘重做"。
3. **回传闭环**：顾问结论 → 用户确认 → 写入决策日志 → Implementer 执行。
4. **冲突**：写进决策日志"争议"栏；用户拍板；未拍板前不改代码。
5. **口令触发**：用户说 `A2A` / `让 Codex 看` / `双窗口` → 按本协议运转。

---

## 4. 明确禁止

- 未授权就 commit / push / deploy / 建 remote。
- 在前端 env 暴露任何 API key（必须先有后端/serverless 承载）。
- 臆造"已实现"而未对照 PROJECT_CONTEXT.md 实际状态。
- 重写整个现有 demo / 换掉核心花园隐喻。
- 把乐理小达人仓库的 A2A 决策当成本项目断点。

---

## 5. 授权粒度（必读）

| 动作 | 需要口令 |
|------|---------|
| 改 src/ 代码 | "Codex 执行" / "按切片做" |
| push 到 GitHub | "我授权你 push" |
| 部署 Pages | "我授权你部署 Pages" |
| 接真实 AI API | 单独确认承载方案后再授权 |

---

_Last updated: 2026-08-01_
