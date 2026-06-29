# Agent Quest — 设计规格文档

> 创建日期：2026-06-29
> 状态：待实现
> 关联项目：[career-system](../../../career-system) — `distilled/common/agent/` 主题卡 & `labs/local-agent-python/` 代码

## 1. 产品定位

**Agent Quest** 是一个用关卡方式展示 Agent Harness 工作过程的教学与调试工具。目标用户是正在准备 Agent 开发面试的工程师，场景兼顾"自己理解 Agent 机制"和"面试时展示系统化设计能力"。

核心理念来自 `1.1-Agent与Harness边界-主题卡.md`：

> "大模型相当于负责理解和决策的'大脑'，Harness 相当于承载行动能力并施加约束的'身体'。"

### 1.1 不是仿真器，是透明探索工具

Agent Quest 不做"把 LLM API 包装起来当玩具"。它的核心价值是：**让 Agent 内部的每一条数据流、每一个决策、每一个边界判断都变得可见、可操作、可理解。**

类比：手机透明探索版——不是换了手机的功能，而是让你看到里面每个零件如何工作。

## 2. 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| 框架 | React 18 + TypeScript | 项目已有基础，保持一致 |
| 构建 | Vite | 快，适合 SPA |
| 路由 | React Router v6 | 每个关卡独立路由，URL 可分享 |
| 状态管理 | Zustand | 轻量高性能，三个独立 Store 职责分离 |
| 动画 | Framer Motion | 管道动画、展开收起、页面过渡 |
| 样式 | Tailwind CSS | Linear 风格的干净组件基础 |
| 代码展示 | Shiki | 消息/JSON 语法高亮 |
| HTTP | 原生 fetch + ReadableStream | SSE 流式解析，不引入额外依赖 |
| 数据持久化 | localStorage | API Key、关卡进度 |
| 测试 | Vitest + Testing Library | Vite 生态 |
| 部署 | Vercel / GitHub Pages | 纯静态 SPA，零成本 |

## 3. 关卡系统

### 3.1 五大区域

22 个关卡按能力依赖关系分为 5 个区域，整体呈线性依赖但区域间可自由跳转：

```
🏁 Zone 1: 核心循环 (Core Loop) — 4关
  1.1 Agent vs Harness 边界        [概念卡，轻量]
  1.2 ReAct 最小循环               [核心，重点打磨]
  1.3 ModelClient 消息协议          [配置实验]
  1.4 Function Calling 结构化工具调用 [核心，重点打磨]

🔧 Zone 2: 工具与安全 (Tools & Safety) — 4关
  2.1 Tool Registry 与 ACI         [配置实验]
  2.2 Runtime Policy 权限审批       [决策模拟]
  2.3 代码编辑与 Patch 系统         [配置实验]
  2.4 验证反馈与自动修复            [调试挑战]

🧠 Zone 3: 上下文与记忆 (Context & Memory) — 5关
  3.1 Context Engineering          [配置实验]
  3.2 Planning 与 Plan-Execute      [决策模拟]
  3.3 Coding Agent 项目探索         [决策模拟]
  3.4 Memory 记忆架构               [核心，重点打磨]
  3.5 完成条件与停止策略            [配置实验]

📊 Zone 4: 观测与评测 (Observability) — 4关
  4.1 可观测性 Trace 与 Replay      [调试挑战]
  4.2 Evaluation 评测               [配置实验]
  4.3 Human-in-the-Loop            [决策模拟]
  4.4 生产级 Sandbox 隔离           [概念卡，轻量]

🚀 Zone 5: 进阶扩展 (Advanced) — 5关
  5.1 Multi-Agent 编排             [决策模拟]
  5.2 MCP 与工具生态               [配置实验]
  5.3 模型抽象与路由               [配置实验]
  5.4 Java/Spring Agent 映射        [概念卡，轻量]
  5.5 毕业设计：完整 Agent 调试      [调试挑战，终极大关]
```

### 3.2 解锁规则

- 区域内有严格依赖的关卡（如 1.1→1.2→1.3→1.4）按顺序解锁
- 无依赖的关卡在所在区域解锁时即全部开放
- 区域解锁条件：上一区域的核心关卡全部完成
- 毕业后（Zone 5 全通）：所有关卡自由重玩，排行榜解锁

### 3.3 关卡类型

| 类型 | 说明 | 交互深度 | 实现重点 |
|------|------|---------|---------|
| 概念卡 | 教学为主，回放 trace + 回答问题 | 轻量 | 概念卡片内容质量、引用完整性 |
| 配置实验 | 调整参数观察行为变化 | 中等 | 配置 UI、对比视图 |
| 决策模拟 | 在关键节点做选择 | 中等 | 决策场景设计、结果反馈 |
| 调试挑战 | 诊断故障，找出根因 | 重量 | 故障场景真实性、诊断工具 |

## 4. 关卡页架构

### 4.1 三栏布局

```
┌─────────────────────────────────────────────────────┐
│  ← 返回地图    关卡 1.2：ReAct 最小循环    ○○○ 进度  │  顶栏
│                            模式: ◉ API ○ 模拟       │
├──────────────┬──────────────────┬───────────────────┤
│              │                  │                   │
│  概念卡片     │   交互模拟区      │   透明管道视图     │
│  (25%)       │   (45%)          │   (30%)           │
│              │                  │                   │
│  · 知识点    │  配置面板/        │   动态 Pipeline    │
│  · 图示      │  决策选项/        │   点击展开数据      │
│  · 参考文献  │  调试工具         │   · Messages      │
│              │                  │   · Tool Call     │
│              │  [提交] [重置]    │   · Policy        │
│              │                  │   · Observation   │
└──────────────┴──────────────────┴───────────────────┘
```

### 4.2 关卡路由

```
/                          → World Map
/play/:zone/:levelId        → 关卡页面
/settings                   → 全局设置（API Key 等）
```

### 4.3 关卡注册接口

```typescript
interface LevelConfig {
  id: string;                    // "1.1-boundary"
  zone: number;                  // 1-5
  order: number;                 // 区域内顺序
  title: string;                 // "Agent vs Harness 边界"
  description: string;           // 简要描述
  type: 'concept' | 'config' | 'decision' | 'debug';
  component: React.LazyComponent;
  requiresLevels: string[];
  references: Reference[];
  tracePath?: string;            // trace 数据路径
  quizQuestion?: QuizQuestion;
}
```

## 5. 透明探索版模拟引擎

### 5.1 核心设计原则

- **双模式**：每关支持真实 API 和预置 Trace 两种模式，一键切换
- **透明管道**：每个管道节点可点击展开，显示该节点此刻的完整内部数据
- **动态管道**：管道形状由当前 step 实际发生的事件决定，不是固定模板
- **数据来源**：Trace 数据从 `labs/local-agent-python/eval_runs/` 真实提取

### 5.2 动态管道分支

管道在每个 step 中动态决定展示哪些节点：

**情况 A：模型返回 tool_call → 工具执行路径**
```
Step N:
┌──────────┐   ┌──────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐
│ Context  │──→│  Model   │──→│ Policy │──→│   Tool   │──→│Observat- │
│ Builder  │   │ Request  │   │ Check  │   │ Execute  │   │  ion     │
└──────────┘   └──────────┘   └────────┘   └──────────┘   └──────────┘
```

**情况 B：模型返回文本 → Final 路径**
```
Step N:
┌──────────┐   ┌──────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐
│ Context  │──→│  Model   │──→│  Plan  │──→│  Policy  │──→│Complet-  │
│ Builder  │   │ Request  │   │  Check │   │  Check   │   │  ion     │
└──────────┘   └──────────┘   └────────┘   └──────────┘   └──────────┘
```

**情况 C：Policy Deny → 执行被截断**
```
┌──────────┐   ┌──────────┐   ┌────────┐
│ Context  │──→│  Model   │──→│ Policy │──→ ✋ DENY
│ Builder  │   │ Request  │   │ Check  │
└──────────┘   └──────────┘   └────────┘
```

**情况 D：Plan Blocked → final 被阻止**
```
┌──────────┐   ┌──────────┐   ┌────────┐
│ Context  │──→│  Model   │──→│  Plan  │──→ 🚫 blocked
│ Builder  │   │ Request  │   │ Check  │
└──────────┘   └──────────┘   └────────┘
```

### 5.3 管道节点可展开内容

每个管道节点点击后，在右侧面板或弹出层展示完整内部数据：

| 节点 | 展开内容 | 数据来源 |
|------|---------|---------|
| Context Builder | system contract 全文、user message、harness context（working memory、session summary）、context manifest（token 预算、省略记录） | Agent 引擎记录 |
| Model Request | 完整 messages 数组、tools 定义、tool_choice 参数、请求 headers | `fetch` 拦截 |
| Model Response | 流式 delta 逐条、finish_reason、usage（input/output tokens）、response_id、model 名称 | SSE 解析 |
| Policy Check | ToolSpec（name/risk/effects）、PermissionProfile、decision code + reason | 引擎逻辑 |
| Tool Execute | 参数校验过程、handler 调用、实际输出（stdout/stderr）、output schema 校验、耗时 | 引擎逻辑 / Trace |
| Observation | 回传模型的完整 tool result（裁剪前）、裁剪后的 model-visible 版本、裁剪理由 | 引擎逻辑 |
| Plan Check | 当前 plan goal、完成 evidence、blocked reason | 引擎逻辑 |
| Completion | RunResult（success/blocked/failed/exhausted）、final.md 内容、budget 报告 | 引擎逻辑 |

### 5.4 Trace 数据格式

```typescript
interface StepTrace {
  step: number;
  phase: 'context' | 'model' | 'tool' | 'policy' | 'final';
  messages: Message[];
  request?: ModelRequest;
  response?: ModelResponse;
  toolCall?: ToolCall;
  policyDecision?: PolicyDecision;
  toolResult?: ToolResult;
  planCheck?: PlanCheck;
  finalCheck?: FinalCheck;
  timing: Record<string, number>;
  budget: BudgetSnapshot;
}
```

### 5.5 真实 API 模式

用户配置 API Key（存在 localStorage）后，AgentLoop 在浏览器中运行：

```typescript
class AgentLoop {
  async *run(task: string, config: ConfigStore): AsyncGenerator<StepTrace> {
    // ① Context Builder：构建 system + user + harness context
    // ② ModelClient.stream()：用 fetch + ReadableStream 解析 SSE
    // ③ 根据 response.tool_calls 分支
    //    → 有 tool_call：Policy → Execute → Observation → 下一轮
    //    → 无 tool_call：Plan Check → Policy → Completion → 结束
    // ④ 每完成一个 Step，yield StepTrace
  }
}
```

- `ModelClient.stream()` 直接用 `fetch` + `ReadableStream` 解析 SSE
- `PolicyEngine.check()` 是纯逻辑判断，不涉及网络
- `ToolExecutor.execute()` 在前端沙盒中模拟执行（返回预设的合理结果，不真实操作文件系统）

## 6. 数据层

### 6.1 Zustand Store 设计

**configStore（持久化到 localStorage）**
```typescript
interface ConfigStore {
  apiKey: string;
  apiBaseUrl: string;          // 默认 "https://api.openai.com/v1"
  model: string;               // 默认 "gpt-4o"
  defaultMode: 'live' | 'replay';

  setApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setDefaultMode: (mode: 'live' | 'replay') => void;
  isConfigured: () => boolean;
}
```

**progressStore（持久化到 localStorage）**
```typescript
interface ProgressStore {
  completedLevels: Set<string>;
  unlockedLevels: Set<string>;
  levelResults: Record<string, { completedAt: number; mode: string; attempts: number }>;

  completeLevel: (levelId: string, mode: string) => void;
  isCompleted: (levelId: string) => boolean;
  isUnlocked: (levelId: string) => boolean;
}
```

**engineStore（运行时状态，不持久化）**
```typescript
interface EngineStore {
  mode: 'live' | 'replay';
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  steps: StepTrace[];
  currentStep: number;
  playbackSpeed: number;
  expandedNodeId: string | null;
  pendingDecision: Decision | null;

  startRun: (mode: 'live' | 'replay') => Promise<void>;
  pauseRun: () => void;
  resumeRun: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  submitDecision: (choice: string) => void;
  expandNode: (nodeId: string | null) => void;
  reset: () => void;
}
```

### 6.2 项目目录结构

```
agent-quest/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── traces/                    # 预置 trace 数据（从 lab 提取）
│       ├── 1.1-create-calc/
│       │   ├── event_log.jsonl
│       │   ├── model_call_log.jsonl
│       │   └── run_result.json
│       └── ...
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── ui/                    # Button, Card, Badge, Modal, Toggle
│   │   ├── pipeline/              # PipelineView, PipelineNode, DataPanel, JsonViewer
│   │   ├── playback/              # PlaybackControls, SpeedControl
│   │   ├── concept/               # ConceptCard, ReferenceLink
│   │   └── layout/                # LevelLayout, TopBar, WorldMap
│   ├── engine/
│   │   ├── AgentLoop.ts           # Agent 循环主逻辑
│   │   ├── ModelClient.ts         # 真实 API 调用 + SSE 解析
│   │   ├── ContextBuilder.ts      # 上下文构建
│   │   ├── PolicyEngine.ts        # 策略决策
│   │   ├── ToolExecutor.ts        # 工具执行（模拟）
│   │   ├── CompletionTracker.ts   # 完成条件判断
│   │   ├── TraceLoader.ts         # 加载预置 trace 数据
│   │   └── types.ts               # 引擎核心类型
│   ├── store/
│   │   ├── configStore.ts
│   │   ├── progressStore.ts
│   │   └── engineStore.ts
│   ├── levels/
│   │   ├── registry.ts            # 关卡注册表
│   │   ├── types.ts
│   │   ├── zone1-core/
│   │   │   ├── 1.1-boundary/
│   │   │   │   ├── index.ts
│   │   │   │   ├── BoundaryLevel.tsx
│   │   │   │   └── README.md
│   │   │   ├── 1.2-react-loop/
│   │   │   ├── 1.3-model-client/
│   │   │   └── 1.4-function-calling/
│   │   ├── zone2-tools/
│   │   ├── zone3-context/
│   │   ├── zone4-observability/
│   │   └── zone5-advanced/
│   ├── data/
│   │   ├── conceptContent.ts
│   │   ├── quizQuestions.ts
│   │   └── traceManifests.ts
│   └── utils/
│       ├── sse.ts
│       ├── json.ts
│       └── tokenCounter.ts
```

## 7. 设计系统

### 7.1 色彩

```
背景    #FAFAFA    页面背景
卡片    #FFFFFF    卡片、面板
边框    #E5E5E5    分隔线
正文    #1A1A1A    主要文字
辅助    #6B6B6B    次要文字
弱文字  #9B9B9B    占位符

主色    #5E6AD2    按钮、链接、高亮
成功    #2DA44E    完成、通过
警告    #D48C20    警告、blocked
错误    #D23B3B    错误、deny、failed

模型决策 #5E6AD2   管道节点（蓝色）
Harness #787F95    管道节点（灰色）
```

### 7.2 字体

- Display/Body: Inter（系统默认回退）
- Code: JetBrains Mono
- 字号层级: 12 / 13 / 14 / 16 / 20 / 28

### 7.3 动效

| 场景 | 规格 |
|------|------|
| 页面过渡 | 淡入 + 上移 8px, 200ms ease-out |
| 节点状态切换 | 边框色渐变 150ms |
| 活跃脉冲 | box-shadow 呼吸, 1.5s infinite |
| 数据面板展开 | 高度动画 250ms ease-out |
| 连线流向 | dash-offset 动画（仅 active 时） |
| 过关弹窗 | 缩放 + 淡入, 300ms spring |

## 8. 第一关详细设计：1.1 Agent vs Harness 边界

### 8.1 关卡目标

理解 Agent = Model（大脑/决策）+ Harness（身体/约束）的架构分工。

### 8.2 概念卡片

从 `distilled/common/agent/1.1-Agent与Harness边界-主题卡.md` 提取：

- **核心分层模型**：
  - Model Policy：理解目标 → 选择下一步 → 形成/调整计划 → 生成 final
  - Harness：构造上下文 → 暴露/执行工具 → 校验协议 → 管理权限 → 记录状态 → 判断结束 → 处理失败

- **边界判断规则**：
  | 问题 | 责任方 |
  |------|--------|
  | 下一步读哪个文件 | 模型 |
  | 文件是否越出 workspace | Harness |
  | 错误日志说明什么 | 模型 |
  | 未验证能否声称完成 | Harness |
  | 是否允许联网或执行危险命令 | Harness + 用户审批 |

- **关键结论**：
  - Prompt 只是 Harness 提供的行为上下文，不是安全边界
  - 成熟 Agent = "模型自由决策 + harness 硬边界"
  - 把确定性问题写进代码，把开放判断留给模型

- **参考文献**：
  - [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
  - [SWE-agent: Agent-Computer Interfaces](https://arxiv.org/abs/2405.15793) (NeurIPS 2024)
  - [OpenHands](https://arxiv.org/abs/2407.16741)
  - [Codex approvals and security](https://developers.openai.com/codex/agent-approvals-security)

### 8.3 交互模拟（回放模式）

加载 `labs/local-agent-python/eval_runs/create_add_function/` 的真实 trace，展示一个 6-step 的 Agent Run。播放控制支持暂停、单步前进/后退、速度调节。

每一步显示动态管道（Tool 路径 / Final 路径 / Deny 截断）。

关键教学点：用颜色区分蓝色（Model 决策）和灰色（Harness 约束），让用户直观看到每一步中谁在起作用。

### 8.4 过关条件

选择题：

> Agent 执行这个任务时，以下哪个判断是由 Harness 做出的？
> A) 创建 calc.py 文件
> B) 选择使用 write_file 工具
> C) 拒绝执行未知程序（Policy Deny）✓

完成回放 + 答对问题 → 过关，解锁 1.2。

## 9. API Key 安全

- Key 存储在 `localStorage["agent-quest-config"]`
- 请求从浏览器直发 LLM 提供商，无中间服务器
- 支持任意 OpenAI-compatible 端点（OpenAI / 阿里百炼 / Ollama 等）
- 关卡顶部显示 API 配置状态
- 提供「清除 Key」操作

## 10. 验收标准

### 10.1 第一关（1.1）

- [ ] 世界地图展示 Zone 1-5，1.1 可进入
- [ ] 概念卡片展示完整分层模型和边界判断规则
- [ ] 参考文献链接正确可点击
- [ ] 加载预置 trace，管道展示 6 个 step
- [ ] 管道节点可点击展开数据
- [ ] Model 决策 vs Harness 约束颜色区分
- [ ] 播放控制（播放/暂停/前进/后退/速度）
- [ ] 过关选择题正确判断
- [ ] 通过后解锁 1.2

### 10.2 整体

- [ ] 所有 22 关卡可注册、可导航
- [ ] 关卡进度持久化
- [ ] 真实 API 模式正确解析 SSE 流
- [ ] 模拟模式正确回放 trace
- [ ] 管道节点数据展示准确
- [ ] 移动端响应式不崩溃（至少可阅读）

## 11. 引用来源

本设计基于以下文件：

- `G:/project/career-system/distilled/common/agent/` — 22 张 Agent 主题卡
  - `1.1-Agent与Harness边界-主题卡.md`
  - `1.2-ReAct与最小AgentLoop-主题卡.md`
  - `1.3-ModelClient消息协议与Streaming-主题卡.md`
  - `1.4-FunctionCalling与结构化ToolUse-主题卡.md`
  - `1.5-ToolRegistry与ACI-主题卡.md`
  - `1.6-RuntimePolicy权限审批与基础安全-主题卡.md`
  - `1.7-ContextEngineering与PromptLayer-主题卡.md`
  - `1.11-验证反馈与自动修复循环-主题卡.md`
  - `1.12-完成条件停止策略与运行韧性-主题卡.md`
  - `1.13-Memory记忆架构-主题卡.md`
  - `1.14-可观测性Trace与Replay-主题卡.md`
  - `00-学习大纲.md`
- `G:/project/career-system/labs/local-agent-python/` — 完整 Agent 实现
  - `agent.py` — 入口和交互 shell
  - `stream_agent.py` — Agent 主循环（899 行）
  - `FLOW.md` — 完整数据流文档
  - `eval_runs/` — 真实执行 trace