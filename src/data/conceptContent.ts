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