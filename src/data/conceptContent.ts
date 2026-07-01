export const LEVEL_1_1_CONCEPT = {
  title: 'Agent vs Harness 边界',
  subtitle: '理解大脑与身体的分工——哪些事交给模型决定，哪些事必须由 Harness 用确定性代码保证',
  sections: [
    {
      heading: '核心分层模型',
      content: `Agentic System
├─ Model Policy（大脑）
│  ├─ 理解目标
│  ├─ 根据 observation 选择下一步
│  ├─ 形成或调整计划
│  └─ 生成 final 内容
└─ Harness（身体）
   ├─ 构造可见上下文
   ├─ 暴露和执行工具
   ├─ 校验协议与参数
   ├─ 管理权限、审批
   ├─ 记录状态、事件和预算
   ├─ 判断能否结束
   └─ 处理失败、恢复`,
      type: 'code' as const,
    },
    {
      heading: '边界判断规则',
      content: '',
      type: 'table' as const,
      rows: [
        { left: '下一步读哪个文件', right: '模型', highlight: 'model' as const },
        { left: '文件是否越出 workspace', right: 'Harness', highlight: 'harness' as const },
        { left: '错误日志说明什么', right: '模型', highlight: 'model' as const },
        { left: '未验证能否声称完成', right: 'Harness', highlight: 'harness' as const },
        { left: '是否允许联网或执行危险命令', right: 'Harness + 用户审批', highlight: 'harness' as const },
      ],
    },
    {
      heading: '一个规则适合写入 Harness 的条件',
      content: '• 涉及安全、权限、资源或不可逆副作用\n• 可以用确定性代码可靠判断\n• 失败后必须保证一致性\n• 属于产品契约（如修改后必须验证）',
    },
    {
      heading: '一个判断适合留给模型的条件',
      content: '• 任务语义依赖强\n• 可行路径很多，无法预先枚举\n• 需要结合最新 observation 调整\n• 错误选择可通过工具反馈低成本纠正',
    },
  ],
  conclusion: '成熟 Agent 等于"模型自由决策 + Harness 硬边界"。Harness 不是 system prompt——prompt 只是 Harness 提供给模型的行为上下文，无法替代真实的权限限制、文件系统隔离和完成条件。',
  references: [
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', source: 'Anthropic' },
    { title: 'SWE-agent: Agent-Computer Interfaces', url: 'https://arxiv.org/abs/2405.15793', source: 'NeurIPS 2024' },
    { title: 'OpenHands', url: 'https://arxiv.org/abs/2407.16741', source: 'arXiv 2024' },
    { title: 'Codex approvals and security', url: 'https://developers.openai.com/codex/agent-approvals-security', source: 'OpenAI' },
  ],
}

export const LEVEL_1_2_CONCEPT = {
  title: 'ReAct 最小循环',
  subtitle: 'Agent 不是一次性生成答案，而是 action → observation → next action 的控制循环',
  sections: [
    {
      heading: 'ReAct 循环架构',
      content: `while budget.has_capacity():
    action = model.next(build_context(state))
    decision = policy.check(action, state)

    if decision.outcome == "deny":
        state.observe(policy_feedback(decision))
        continue          ← 被拒绝，重新决策

    if action.is_final:
        return completion.finish_or_reject(action, state)
                          ← 模型认为完成，Harness 验证

    observation = environment.execute(action)
    state.record(action, observation)
                          ← 记录动作和结果，进入下一轮`,
      type: 'code' as const,
    },
    {
      heading: 'ReAct vs 一次性计划',
      content: '',
      type: 'table' as const,
      rows: [
        { left: '一次性生成', right: '模型一次输出全部答案，没有反馈修正机会', highlight: 'harness' as const },
        { left: 'ReAct 循环', right: '模型每步观察环境反馈，根据新信息调整后续决策', highlight: 'model' as const },
        { left: '交错推理与行动', right: '模型在每轮中看到最新 observation，形成闭环', highlight: 'model' as const },
        { left: 'Harness 角色', right: '控制预算、执行工具、校验协议、判断结束，不规定动作顺序', highlight: 'harness' as const },
      ],
    },
    {
      heading: 'Observation 的关键设计',
      content: '• 不是把原始终端输出全量回灌——SWE-agent 的 ACI 思路强调要整理成模型可行动的 structured observation\n• 过大结果按 TOOL_RESULT_MAX_TOKENS 裁剪后再进入模型上下文\n• role=tool + tool_call_id 关联原调用，保持协议完整性\n• tool failure / policy denial 产生不同的 observation，给模型可行动的反馈',
    },
    {
      heading: 'Harness 的停止条件',
      content: '• 模型不能绕过完成条件：必须通过 CompletionTracker 验证（编辑有验证、plan goal 有 evidence）\n• Harness 不强制僵硬工具顺序（如"必须读→改→测"），但会检测无进展循环（repair_requires_progress）\n• 预算耗尽时允许带证据的 blocked 结果，而非无限循环',
    },
  ],
  conclusion: 'ReAct 的核心是：模型在每步看到最新 observation，基于最新信息做下一步决策。Harness 负责执行、记录和边界控制，但把"选哪个动作"的自由留给模型。这个循环是后续所有 Agent 能力（planning、memory、multi-agent）的基础。',
  references: [
    { title: 'ReAct: Synergizing Reasoning and Acting in Language Models', url: 'https://arxiv.org/abs/2210.03629', source: 'NeurIPS 2023' },
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', source: 'Anthropic' },
    { title: 'SWE-agent: Agent-Computer Interfaces', url: 'https://arxiv.org/abs/2405.15793', source: 'NeurIPS 2024' },
    { title: 'mini-swe-agent', url: 'https://github.com/SWE-agent/mini-swe-agent', source: 'GitHub' },
  ],
}

export const LEVEL_1_3_CONCEPT = {
  title: 'ModelClient 消息协议与 Streaming',
  subtitle: 'runtime 如何与模型通信——SSE 流式事件、规范化响应、错误重试',
  sections: [
    {
      heading: 'ModelClient 模型',
      content: `class ModelClient:
    def stream(request: ModelRequest) -> Iterator[ModelEvent]: ...
        # SSE 流 → TextDelta | UsageUpdate | ResponseCompleted

    def complete(request: ModelRequest) -> ModelResponse:
        return collect_response(self.stream(request))
        # 同一套流产生完整响应

ModelEvent = TextDelta | UsageUpdate | ResponseCompleted

class ModelResponse:
    content: str
    finish_reason: str | None
    usage: ModelUsage | None
    response_id: str | None
    model: str | None`,
      type: 'code' as const,
    },
    {
      heading: 'SSE 事件类型',
      content: '',
      type: 'table' as const,
      rows: [
        { left: 'TextDelta', right: 'content 字段的增量文本片段。多个 delta 拼接成完整响应', highlight: 'model' as const },
        { left: 'ToolCallDelta', right: 'tool call 的 name + arguments 增量（1.4 扩展）。不能执行半截 JSON', highlight: 'harness' as const },
        { left: 'UsageUpdate', right: 'input/output token 使用量，中途可能多次更新', highlight: 'harness' as const },
        { left: 'ResponseCompleted', right: 'finish_reason + response_id + model。在此之前不能执行 tool call', highlight: 'harness' as const },
      ],
    },
    {
      heading: '错误重试规则',
      content: '• retry 只包围无副作用的模型请求\n• 记录 attempt 次数（MODEL_MAX_RETRIES=2）\n• MODEL_RETRY_BACKOFF_SECONDS=2 间隔\n• 只重试网络/超时错误，不重试 4xx（参数/认证问题）',
    },
    {
      heading: '与 Agent Loop 的关系',
      content: 'ModelClient 是 Agent Loop 的"通信层"：每轮 while 循环中，ModelRequest → ModelClient.stream() → SSE 事件 → 累积 ModelResponse → 交给 RuntimePolicy 判断 → 返回 Agent Loop',
    },
  ],
  conclusion: 'ModelClient 隐藏供应商 HTTP/SSE 差异，保留 Agent 所需语义（usage/finish_reason/response_id/model）。Streaming 不是 UI 优化而是 runtime 协议——ToolCallDelta 需要等 ResponseCompleted 才能执行。',
  references: [
    { title: 'OpenAI Streaming', url: 'https://platform.openai.com/docs/api-reference/streaming', source: 'OpenAI' },
    { title: 'MCP Architecture', url: 'https://modelcontextprotocol.io/docs/learn/architecture', source: 'MCP' },
  ],
}

export const LEVEL_1_4_CONCEPT = {
  title: 'Function Calling 与结构化 Tool Use',
  subtitle: '模型不执行函数——它通过结构化协议表达调用意图，Harness 负责执行和结果关联',
  sections: [
    {
      heading: '从文本协议到原生 Function Calling',
      content: `旧实现（已删除）:
  system prompt 注入自定义工具说明
  → 模型输出 {"type":"tool","name":"read_file",...}
  → ActionParser 解析 JSON
  → 用 user message 回传结果

新实现:
  ToolSpec → tool_schema.py → provider function tools
  → ModelRequest(tools, tool_choice="auto")
  → ModelClient 解析 delta.tool_calls
  → ToolCall(call_id, name, arguments)
  → validate → execute
  → role=tool + tool_call_id 回传`,
      type: 'code' as const,
    },
    {
      heading: '关键设计决策',
      content: '',
      type: 'table' as const,
      rows: [
        { left: '工具定义位置', right: '请求顶层 tools 参数，不是 message 内容', highlight: 'harness' as const },
        { left: '工具结果回传', right: 'role=tool + tool_call_id（原生协议），非虚构 user message', highlight: 'harness' as const },
        { left: '参数校验', right: 'provider schema 改善生成约束，本地 validate_tool_arguments 仍是可信边界', highlight: 'harness' as const },
        { left: '无效 JSON', right: '不做启发式修复，以相同 call_id 返回结构化错误', highlight: 'harness' as const },
        { left: '并行调用', right: 'parallel_tool_calls=False。多调用全部拒绝并逐个返回错误', highlight: 'harness' as const },
        { left: '消息快照', right: 'ModelRequest.messages 在调用边界深拷贝，保证 replay 稳定', highlight: 'harness' as const },
      ],
    },
    {
      heading: 'ToolSpec → Function Tool 映射',
      content: '• tool_schema.py: ToolSpec(name, handler, risk, parameters, effects, output_schema) → provider function tool\n• 工具不在 system prompt 中描述，而是通过 API 的 tools 参数暴露\n• 模型通过 tool_choice="auto" 自主决定是否调用工具',
    },
  ],
  conclusion: 'Function Calling 是 Agent 能力的核心——模型用结构化协议表达意图，Harness 校验并执行。关键区分：provider schema ≠ runtime validation（前者改善生成，后者保证安全）；工具结果用原生 role=tool 回传而非虚构消息。',
  references: [
    { title: 'OpenAI Function Calling', url: 'https://platform.openai.com/docs/guides/function-calling', source: 'OpenAI' },
    { title: 'MCP Architecture', url: 'https://modelcontextprotocol.io/docs/learn/architecture', source: 'MCP' },
  ],
}
export const LEVEL_2_1_CONCEPT = {
  title: 'Tool Registry 与 ACI',
  subtitle: '工具不是函数集合，而是Agent与计算机之间的界面设计',
  sections: [
    { heading: 'ACI 核心思想', content: '工具名称、描述、粒度、输入输出schema、结果长度和错误反馈——都会影响Agent的选择质量。好的ACI让模型"一看就懂怎么用"，差的ACI让模型反复试错。', type:'text' as const },
    { heading: 'ToolSpec 结构', content: `ToolSpec(
  name="read_file",         # 模型看到的工具名
  handler=read_file,        # 实际执行函数
  risk="safe",              # safe/medium/high → Policy 依据
  description="...",        # 自然语言描述（关键！）
  parameters={...},         # JSON Schema → provider function tool
  effects=frozenset({"inspect"}),  # inspect/edit/execute
  output_schema={...},      # 输出校验
)`, type:'code' as const },
    { heading: '单一 Registry', content: 'TOOL_REGISTRY 是唯一工具事实来源。新增工具不需要同步多个名单——注册后自动出现在 provider tools 和文档中。', type:'text' as const },
  ],
  conclusion: 'SWE-agent 证明 ACI 直接影响任务成功率。好工具接口让模型自然选择正确动作，坏接口让模型陷入混乱。',
  references: [{ title:'SWE-agent: ACI', url:'https://arxiv.org/abs/2405.15793', source:'NeurIPS 2024' }],
}

export const LEVEL_2_2_CONCEPT = {
  title: 'Runtime Policy 权限审批',
  subtitle: 'allow/ask/deny — Harness的安全决策边界',
  sections: [
    { heading: '三层决策', content: 'RuntimePolicy 根据 ToolSpec.risk + PermissionProfile 决策:\n• allow: 低风险 inspect 类工具，直接放行\n• ask: 中等风险 edit 类工具，交给 ApprovalController\n• deny: 高风险操作或未知程序，直接拒绝', type:'text' as const },
    { heading: '不是 system prompt', content: 'Policy 是代码级 enforcement，不是 prompt 建议。模型不能通过"说服"来绕过——RuntimePolicy 在每次 tool_call 前都重新检查。', type:'text' as const },
    { heading: '命令安全', content: 'run_command 使用 program + args 且 shell=False。这消除了 shell 操作符解释攻击，但应用层路径检查不是 OS Sandbox。', type:'text' as const },
  ],
  conclusion: 'Sandbox 决定技术上能做什么，Policy 决定何时允许做，Approval 决定何时必须停下来问。',
  references: [{ title:'Codex Approvals', url:'https://developers.openai.com/codex/agent-approvals-security', source:'OpenAI' }],
}

export const LEVEL_2_3_CONCEPT = {
  title: '代码编辑与 Patch 系统',
  subtitle: '读后编辑、精确替换、patch创建与回滚',
  sections: [
    { heading: '编辑三工具', content: 'write_file（全覆盖）、replace_text（精确替换）、apply_patch（unified diff）。区别在于精确度和安全性。', type:'text' as const },
    { heading: 'read-before-edit 机制', content: '对已有文件，Harness要求模型已通过inspect工具观察过该文件，且当前size/mtime/sha1与观察时一致。否则返回read_before_edit_required或file_changed_since_read。', type:'text' as const },
    { heading: '回滚保护', content: 'apply_patch支持create/update/delete。写入阶段保留旧文件快照，普通写入异常自动回滚已触碰目标。', type:'text' as const },
  ],
  conclusion: '编辑不是"信任模型写正确的文件"——Harness在每次编辑前检查前置条件，编辑后验证结果。',
  references: [{ title:'Aider', url:'https://github.com/paul-gauthier/aider', source:'GitHub' }],
}

export const LEVEL_2_4_CONCEPT = {
  title: '验证反馈与自动修复',
  subtitle: '测试失败 → 反馈 → 修复 → 重测，直到通过或预算耗尽',
  sections: [
    { heading: '验证闭环', content: `1. 模型完成编辑
2. run_command 执行验证
3. 失败 → verification_feedback 生成带 repair_hint 的摘要
4. 模型根据 hint 调整代码
5. 重新验证`, type:'code' as const },
    { heading: 'repair_controller', content: 'Harness保存失败指纹（规范化命令+退出码+关键错误行）。如果模型没有新观察、新搜索或新编辑就重跑同一条失败验证，返回repair_requires_progress。', type:'text' as const },
    { heading: '指纹只在本地', content: '失败指纹是Harness内部索引，不暴露给模型。模型看到的是错误摘要和repair_hint（首次/同类/编辑后仍失败/新失败模式）。', type:'text' as const },
  ],
  conclusion: 'Reflexion 证明语言反馈可以改善后续尝试，但要避免空转——repair_controller 确保每次重试都有信息增量。',
  references: [{ title:'Reflexion', url:'https://arxiv.org/abs/2303.11366', source:'ICLR 2023' }],
}

export const LEVEL_3_1_CONCEPT = {
  title: 'Context Engineering',
  subtitle: 'ContextBuilder 按优先级组装上下文，超出预算时自动压缩',
  sections: [
    { heading: 'ContextItem 优先级系统', content: '不同来源的上下文有不同优先级:\n• required(系统契约) > high(用户消息) > medium(harness context) > low\n• 超出 output_reserve 时低优先级项可能被省略', type:'text' as const },
    { heading: 'ContextManifest', content: '每轮构建后产出: input_tokens, output_tokens, usable_tokens, compacted, omitted_groups, omitted_call_ids, compressed_call_ids。', type:'text' as const },
    { heading: 'Auto-compact', content: '当 total_tokens ≥ context_window × CONTEXT_WARNING_RATIO(0.8) 时触发压缩。压缩对象是旧的 assistant+tool 消息组，不压缩 system 和最新消息。', type:'text' as const },
  ],
  conclusion: '上下文工程不是"塞越多越好"——它是有预算的优先级组装，确保模型在有限窗口内看到最关键的信息。',
  references: [{ title:'Building effective agents', url:'https://www.anthropic.com/engineering/building-effective-agents', source:'Anthropic' }],
}

export const LEVEL_3_2_CONCEPT = {
  title: 'Planning 与 Plan-Execute',
  subtitle: '先计划还是边做边计划？Auto/Required/Off三种模式',
  sections: [
    { heading: '三种 Plan Mode', content: '• auto: 模型可选择是否先制定计划\n• required: workspace edit前必须有plan\n• off: 不暴露update_plan工具', type:'text' as const },
    { heading: 'update_plan 工具', content: 'update_plan 和 read_file 一样通过原生 Function Calling 暴露。它的effect是plan，只修改session下的task_plan.json，不获得workspace写权限。', type:'text' as const },
    { heading: '重规划', content: '模型可随时调用update_plan修改计划。Harness不规定工具顺序，但要求重规划有原因和触发证据，并受总步数/step budget/stall/revision budget约束。', type:'text' as const },
  ],
  conclusion: 'Plan-and-Execute vs ReAct 不是二选一。成熟系统混合两者：外层确定性workflow控制权限和完成条件，内层agentic loop让模型动态调整。',
  references: [{ title:'Plan-and-Solve', url:'https://arxiv.org/abs/2305.04091', source:'ICLR 2024' }, { title:'Building effective agents', url:'https://www.anthropic.com/engineering/building-effective-agents', source:'Anthropic' }],
}

export const LEVEL_3_3_CONCEPT = {
  title: 'Coding Agent 项目探索',
  subtitle: '理解陌生仓库 → inspect_repo/rank_repo_context → 精准读取',
  sections: [
    { heading: '探索三步骤', content: '1. inspect_repo → 项目结构/语言/符号\n2. rank_repo_context(task) → 候选文件+评分\n3. read_file → 读取真实代码窗口', type:'text' as const },
    { heading: 'Repo Map', content: '本地缓存 .local_agent/repo_map.json。文件mtime/size/hash变更时自动增量刷新。记录确定性代码事实：文件角色、语言、符号、import。', type:'text' as const },
    { heading: '典型探索顺序', content: 'rank_repo_context(task) → 候选文件+suggested_reads → read_file(窗口) → search_text(精确定位)', type:'code' as const },
  ],
  conclusion: 'Coding Agent 不需要每次重新扫描整个项目。RepoMap 缓存 + 按需探索让模型在最小上下文中找到关键代码。',
  references: [{ title:'Aider repo map', url:'https://github.com/paul-gauthier/aider', source:'GitHub' }, { title:'SWE-agent', url:'https://arxiv.org/abs/2405.15793', source:'NeurIPS 2024' }],
}

export const LEVEL_3_4_CONCEPT = {
  title: 'Memory 记忆架构',
  subtitle: '工作记忆/语义记忆/情景记忆 — Agent 如何记住、检索和遗忘',
  sections: [
    { heading: 'Memory 分层', content: `工作记忆 (Working Memory): 当前对话上下文\n  → working_memory.md, 每次 run 结束后更新\n\n语义记忆 (Structured Memory): 可检索的知识条目\n  → memories.jsonl, MemoryEntry(type/scope/evidence/confidence)\n  → MemoryRetriever.search() → 关键词+语义检索\n\n情景记忆 (Session Summary): 历史对话摘要\n  → session_summary.md, compact 后保留最近 N 个 run`, type:'code' as const },
    { heading: 'Memory 检索', content: '每次 run 开始时: read_working_memory → MemoryRetriever.search(structured_memory_path) → search_relevant_memory(session) → 注入 ContextItem(kind="memory")', type:'text' as const },
    { heading: 'Memory 写入', content: 'run 结束时: update_working_memory(run_dir, memory_path) → write_run_memories(run_dir, structured_memory_path) → MemoryEntry 持久化到 memories.jsonl', type:'text' as const },
  ],
  conclusion: 'Memory 不是把所有历史塞进 context。它是分层存储 + 按需检索 + 结构化写入——Agent 在需要时才召回相关记忆。',
  references: [{ title:'MemGPT', url:'https://arxiv.org/abs/2310.08560', source:'NeurIPS 2024' }, { title:'Building effective agents', url:'https://www.anthropic.com/engineering/building-effective-agents', source:'Anthropic' }],
}

export const LEVEL_3_5_CONCEPT = {
  title: '完成条件与停止策略',
  subtitle: 'RunBudget, TerminationPolicy, RunResult — Agent 何时、如何停止',
  sections: [
    { heading: '四层停止条件', content: '1. 模型声称 final → PlanController.check_final()\n2. 编辑有验证 → CompletionTracker\n3. 无进展循环 → repair_requires_progress\n4. 预算耗尽 → RunBudget(steps/model_calls/tool_calls)', type:'code' as const },
    { heading: '不是僵硬状态机', content: 'Harness 不强制"读→改→测"顺序，但阻止未经验证的final声称、同一失败的空转重试、以及预算超额。', type:'text' as const },
    { heading: 'RunResult 类型', content: 'success: 所有条件满足\nblocked: 预算耗尽但有证据\nfailed: 无法完成的错误\nexhausted: 达到 MAX_STEPS', type:'text' as const },
  ],
  conclusion: '真正的 Agent 不是"跑完就行"——Harness 通过多层停止条件确保 Agent 在正确的时候以正确的方式结束。',
  references: [{ title:'Building effective agents', url:'https://www.anthropic.com/engineering/building-effective-agents', source:'Anthropic' }],
}

export const LEVEL_4_1_CONCEPT = {
  title: '可观测性 Trace 与 Replay',
  subtitle: 'JSONL 日志、trace span、checkpoint——定位 Agent 行为',
  sections: [
    { heading: 'Trace 体系', content: 'event_log.jsonl: 每步事件\nmodel_call_log.jsonl: 请求/响应快照\ntool_call_log.jsonl: 完整工具参数和结果\ntrace.jsonl: span 事件(父子/耗时/状态)\nrun_result.json: 最终状态/reason_code', type:'text' as const },
    { heading: 'Checkpoint 与 Replay', content: 'checkpoint.json: 最近step/state/message digest/预算。replay 通过重放 model_call_log.jsonl 中的响应，不重复调用模型。用于调试和回归对比。', type:'text' as const },
    { heading: '回放机制', content: 'replay 不重新跑 Agent——它消费已有的 model_call_log.jsonl 记录。相同输入 → 相同输出，保证调试可复现。', type:'text' as const },
  ],
  conclusion: '可观测性不是事后加日志，而是 Agent 运行时的基础设施——trace 让每一次 failure 都可定位，replay 让修复可验证。',
  references: [{ title:'OpenHands', url:'https://arxiv.org/abs/2407.16741', source:'arXiv 2024' }],
}

export const LEVEL_4_2_CONCEPT = {
  title: 'Evaluation 评测',
  subtitle: 'eval_runner, 测试用例, 回归对比 — 量化 Agent 能力',
  sections: [
    { heading: 'Eval 结构', content: 'eval_cases.json: 任务列表\nrun_agent(task) → approval_log.jsonl + event_log + run_result.json\neval_runner 对比输出和预期，计算 pass/warn/fail', type:'text' as const },
    { heading: '回归测试', content: '每次升级代码后，replay 之前的 eval run 并对比结果。相同模型+相同任务 → 应有相同或更好的结果。', type:'text' as const },
    { heading: '评测维度', content: '任务完成率、工具选择准确性、错误恢复能力、token 使用效率。不是比模型大小，而是比 Agent 行为质量。', type:'text' as const },
  ],
  conclusion: 'Eval 不是给 Agent 打分排名——它量化 Agent 升级是否真的改进了行为。没有 eval 的 Agent 迭代是盲目的。',
  references: [{ title:'SWE-bench', url:'https://arxiv.org/abs/2310.06770', source:'ICLR 2024' }, { title:'AgentBench', url:'https://arxiv.org/abs/2308.03688', source:'NeurIPS 2023' }],
}
