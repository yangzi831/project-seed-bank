# Project Seed Bank - AI Garden Keeper 更新交接文档

## 1. 项目更新概述

本次分支主要完成 Project Seed Bank 的 AI Garden Keeper（数字园丁
Agent）功能接入。

目标： 让 Project Seed Bank
从一个项目记录工具，升级为一个可以陪伴创作者管理灵感、理解项目状态、辅助项目成长的
AI 花园。

核心理念： "让每一个想法，都拥有继续生长的空间。"

------------------------------------------------------------------------

## 2. 已完成功能

### AI Garden Keeper IP 系统

新增 6 个数字园丁：

-   苔光 Mosslight：温暖治愈型，陪伴项目成长
-   涟泡 Ripple：灵感整理型，帮助梳理碎片想法
-   雨弦 Rainelle：观察分析型，分析项目状态
-   珊芽 Coralia：实验探索型，鼓励尝试
-   云眠 Cloudia：收藏陪伴型，守护休眠项目
-   焰芽 Ember：行动推进型，帮助进入执行阶段

默认展示： 云眠 Cloudia

原因： 它代表"暂时未完成的想法并没有消失，而是在等待重新被唤醒"。

------------------------------------------------------------------------

## 3. AI Agent 架构

调用链：

UI → GardenKeeperChatPanel → requestGardenKeeper() →
realGardenKeeperAgent / mockGardenKeeperAgent → callGardener() → LLM
Provider API

设计原则：

Garden Keeper UI 不直接调用模型接口，而通过 Agent 层统一管理。

这样方便未来：

-   替换模型
-   增加 Agent 能力
-   增加长期记忆
-   实现 Agent-to-Agent 互动

------------------------------------------------------------------------

## 4. 当前 AI 能力

### Growth Companion（成长陪伴）

当前聊天默认使用：

scenario: growth-companion

输入：

-   用户问题
-   当前项目
-   当前花园区域
-   当前 Keeper 人格

输出：

-   项目状态总结
-   当前观察
-   下一步建议

------------------------------------------------------------------------

## 5. Demo 演示流程

推荐演示：

用户：

"帮我看看最近的项目"

AI：

展示： - 最近更新项目 - 当前成长状态 - 可能需要关注的项目

用户：

"哪个项目在休眠，我想重新开始做"

AI：

示例：

"我发现《旅行灵感地图》目前处于休眠状态。

它之前已经积累了一些探索记录，但最近没有继续推进。

如果想重新唤醒它，可以： 1. 整理已有素材 2. 明确现在最想解决的问题 3.
设定一个小目标重新开始。"

------------------------------------------------------------------------

## 6. 快捷问题

已有：

-   帮我看看最近的项目
-   整理我的想法
-   下一步应该做什么

建议增加：

-   哪个项目值得重新开始？
-   帮我记录这个想法

覆盖： 查看、整理、推进、记录四类场景。

------------------------------------------------------------------------

## 7. AI 设置

设置内容：

-   Provider
-   Model
-   Base URL
-   API Key
-   Max Tokens
-   Temperature
-   Enable AI

保存：

project-seed-bank:ai-settings

逻辑：

有 API Key： 调用真实模型

无 API Key： 使用 mock Agent

------------------------------------------------------------------------

## 8. 当前支持 Provider

支持：

-   Anthropic Compatible
-   OpenAI Compatible
-   OpenRouter Compatible

核心文件：

src/services/ai/gardener.ts

------------------------------------------------------------------------

## 9. 当前修改文件

主要：

### Components

GardenKeeperChatPanel.tsx - AI 对话界面 - 消息展示 - loading - error处理

GlobalGardenKeeper.tsx - 全局园丁入口

KeeperAvatar.tsx - 园丁形象展示

KeeperSelection.tsx - 园丁选择

### Agent

context.ts - 项目上下文生成

types.ts - Agent 数据结构

serialize.ts - 数据转换

### AI Service

gardener.ts - 模型请求 - 返回解析

------------------------------------------------------------------------

## 10. 已知问题

### API 返回格式兼容

当前期待：

{ summary, suggestions }

部分模型可能返回：

-   不同字段结构
-   空 summary
-   非 JSON 文本

后续优化：

-   更强解析
-   Prompt约束
-   普通文本结构化

------------------------------------------------------------------------

### 当前聊天模式

现在：

单轮调用。

没有保存历史消息。

未来：

增加多轮 conversation memory。

------------------------------------------------------------------------

## 11. 后续方向

### AI 项目创建助手

用户输入：

"我想做一个声音交互装置"

AI生成：

-   项目名称
-   项目描述
-   所属区域
-   第一阶段目标

### 项目生命周期陪伴

Seed → Growing → Mature → Harvest → Dormant

AI持续参与项目成长。

### Agent Community / A2A

未来：

不同用户拥有自己的 AI Keeper。

在授权情况下：

-   浏览好友公开花园
-   发现兴趣交集
-   推荐合作
-   Agent之间交流

形成创作者灵感社区。

------------------------------------------------------------------------

## 12. 当前分支

分支：

feature/ai-garden-keeper

当前完成：

-   Keeper IP 系统
-   AI Agent 接入
-   聊天交互
-   Provider 调用架构
-   Demo流程

下一阶段：

-   API 稳定
-   后端代理
-   数据持久化
-   多轮记忆
