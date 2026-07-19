export interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  correctIndex: number;
  explanation: string;
}

export const LEVEL_1_1_QUIZ: QuizQuestion = {
  id: '1.1-q1',
  question: 'Agent 执行任务时，以下哪个判断是由 Harness 做出的？',
  options: [
    { label: 'A', text: '创建 calc.py 文件' },
    { label: 'B', text: '选择使用 write_file 工具' },
    { label: 'C', text: '拒绝执行未知程序（Policy Deny）' },
  ],
  correctIndex: 2,
  explanation: 'A 和 B 是模型根据任务语义自主选择的，属于 Model Policy 的决策范围。而拒绝执行未知程序是 Harness 的硬边界——它不依赖模型的"自觉"，而是用 RuntimePolicy 的确定性代码判断程序是否在允许列表中，并直接返回 DENY。这正是"模型自由决策 + Harness 硬边界"的体现。',
}

export const LEVEL_1_2_QUIZ: QuizQuestion = {
  id: '1.2-q1',
  question: '关于 ReAct 循环中的 observation，以下哪个说法是正确的？',
  options: [
    { label: 'A', text: '把工具的全部原始输出原样发给模型，越多越好' },
    { label: 'B', text: 'observation 被裁剪整理后回传，超出预算的大结果只保留摘要' },
    { label: 'C', text: 'observation 只在最后一步才发给模型' },
  ],
  correctIndex: 1,
  explanation: 'SWE-agent 的 ACI 研究证明：observation 需要被整理成模型可行动的形式，而非原样倾倒。lab 代码中 TOOL_RESULT_MAX_TOKENS=3000 明确限制回传长度，超大结果按预算裁剪。',
}

export const LEVEL_1_3_QUIZ: QuizQuestion = {
  id: '1.3-q1',
  question: '关于 ModelClient 的 streaming 机制，哪个说法正确？',
  options: [
    { label: 'A', text: 'Streaming 只是为了 UI 好看，runtime 不需要关心' },
    { label: 'B', text: 'ToolCallDelta 参数 delta 需要等 ResponseCompleted 后才能组装成可执行的 ToolCall' },
    { label: 'C', text: 'Streaming 模式下每个 delta 都应该立刻执行对应的工具' },
  ],
  correctIndex: 1,
  explanation: 'B 正确。Streaming 是 runtime 协议的一部分——ToolCallDelta 的参数可能分散在多个 SSE chunk 中，必须在 ResponseCompleted 后才由 accumulator 组装成完整 ToolCall。',
}

export const LEVEL_1_4_QUIZ: QuizQuestion = {
  id: '1.4-q1',
  question: '关于 Function Calling 的工具结果回传，哪个说法正确？',
  options: [
    { label: 'A', text: '用普通 user message 发"工具结果：xxx"' },
    { label: 'B', text: '使用 role=tool + tool_call_id 原生协议回传，模型自动关联到对应的 assistant tool_calls' },
    { label: 'C', text: '工具结果不需要回传给模型' },
  ],
  correctIndex: 1,
  explanation: 'B 正确。升级到原生 Function Calling 后，工具结果使用 role=tool + tool_call_id 回传，模型通过 call_id 自动关联。A 是旧实现的虚构 user message 方案（已被删除），C 错误（不回传结果就无法形成 observation 闭环）。',
}
export const LEVEL_2_1_QUIZ: QuizQuestion = {
  id: '2.1-q1', question: 'ToolSpec 中的 risk 字段主要给谁用？',
  options: [{label:'A',text:'模型，帮助它选择工具'},{label:'B',text:'RuntimePolicy，判断 allow/ask/deny'},{label:'C',text:'用户，决定是否继续运行'}],
  correctIndex: 1, explanation: 'risk 是 RuntimePolicy 的决策依据：safe→allow, medium→ask, high→deny。模型看到的是 description 和 schema，不直接看到 risk 字段。',
}

export const LEVEL_2_2_QUIZ: QuizQuestion = {
  id: '2.2-q1',
  question: 'workspace profile 下模型调用 run_command(program="rm", args=["-rf","/"])。RuntimePolicy 应？',
  options: [
    { label: 'A', text: 'allow，相信模型' },
    { label: 'B', text: 'deny，code=program_not_allowed（command_registry 拒绝未知程序）' },
    { label: 'C', text: 'ask，一律交给用户审批' },
  ],
  correctIndex: 1,
  explanation:
    'lab 中 execute 先检查 PermissionProfile.allow_command，再 check_command_rules。rm 不在 python/node/npm allowlist → DENY program_not_allowed。这不是 ASK：Approval 只处理 Policy 已判定为 ask 的调用。允许的 python -m unittest 才会 command_requires_approval。',
}

export const LEVEL_2_3_QUIZ: QuizQuestion = {
  id: '2.3-q1',
  question: '模型要对已有 calc.py 做 replace_text，但 observed_files 里没有该 path。Harness 应？',
  options: [
    { label: 'A', text: '允许写入，模型声称知道内容即可' },
    { label: 'B', text: 'DENY，稳定 code=read_before_edit_required' },
    { label: 'C', text: '自动先帮模型 read_file 再静默写入' },
  ],
  correctIndex: 1,
  explanation:
    '主题卡 1.10 / runtime_policy._check_edit_targets：已有文件必须先被观察；code 为 read_before_edit_required。若观察后 size/mtime/sha1 变化则为 file_changed_since_read。Harness 不静默代读代写。',
}

export const LEVEL_2_4_QUIZ: QuizQuestion = {
  id: '2.4-q1',
  question: '同一失败验证命令在无新 inspect/edit 时再次 run_command。RepairController.guard_tool 应？',
  options: [
    { label: 'A', text: '允许重试，或许偶发能过' },
    { label: 'B', text: '拒绝，code=repair_requires_progress' },
    { label: 'C', text: '自动改代码后再跑' },
  ],
  correctIndex: 1,
  explanation:
    'lab repair_controller：latest_failed_command 相同且 new_evidence_since_failure / new_edit_since_failure 均为 false → allowed=false, code=repair_requires_progress。指纹仅本地使用；模型看到 repair_hint。Harness 不替模型改代码。',
}

export const LEVEL_3_1_QUIZ: QuizQuestion = {
  id: '3.1-q1', question: 'ContextBuilder 的 priority 系统用来做什么？',
  options: [{label:'A',text:'决定哪些消息先发给模型'},{label:'B',text:'超出 output_reserve 时省略低优先级 context item'},{label:'C',text:'给消息排序让模型更好理解'}],
  correctIndex: 1, explanation: 'priority 决定预算紧张时的省略顺序。required（系统契约）永不被省略，high（用户消息）优先保留，low（冗余context）先被压缩。',
}

export const LEVEL_3_2_QUIZ: QuizQuestion = {
  id: '3.2-q1', question: 'Plan-Execute 模式中，update_plan 工具和 write_file 工具有何不同？',
  options: [{label:'A',text:'两者一样，都能写文件'},{label:'B',text:'update_plan 只写 session 下的 task_plan.json，无 workspace 权限'},{label:'C',text:'update_plan 可以直接改代码'}],
  correctIndex: 1, explanation: 'update_plan 的 effect=plan，只修改 task_plan.json。它不获得 workspace 写权限，也不需要 Approval。计划由模型生成，Harness 只保证结构有效。',
}

export const LEVEL_3_3_QUIZ: QuizQuestion = {
  id: '3.3-q1', question: 'rank_repo_context 工具的主要作用是什么？',
  options: [{label:'A',text:'列出所有文件'},{label:'B',text:'根据任务语义对文件进行相关性评分，返回候选文件和建议读取顺序'},{label:'C',text:'修改 repo map 中的符号索引'}],
  correctIndex: 1, explanation: 'rank_repo_context 是 inspect 类工具，它根据当前任务对文件进行语义排名，返回评分最高的候选文件和 suggested_reads。模型据此决定优先读哪些文件，避免盲目遍历。',
}

export const LEVEL_3_4_QUIZ: QuizQuestion = {
  id: '3.4-q1', question: 'Agent 的 structured memory 在什么时候被检索？',
  options: [{label:'A',text:'每次 tool call 之后'},{label:'B',text:'每次 run 开始时，通过 MemoryRetriever.search() 检索并注入为 harness context'},{label:'C',text:'只在用户显式要求时'}],
  correctIndex: 1, explanation: 'Memory 检索发生在每次 run 开始时：先读 working_memory，再 MemoryRetriever.search(structured_memory)，再 search_relevant_memory(session)。结果合并后注入 ContextItem(kind="memory", priority=3)。',
}

export const LEVEL_3_5_QUIZ: QuizQuestion = {
  id: '3.5-q1', question: '模型声称 final 但测试还没跑过。CompletionTracker 应该？',
  options: [{label:'A',text:'相信模型，记录 final'},{label:'B',text:'拒绝 final，返回 plan_final_denied 或 verification_required'},{label:'C',text:'自动帮模型跑测试'}],
  correctIndex: 1, explanation: 'CompletionTracker 是硬边界：未验证的编辑不能声称完成。Harness 不自动替模型做事，但必须阻止模型绕过完成条件。',
}

export const LEVEL_4_1_QUIZ: QuizQuestion = {
  id: '4.1-q1',
  question: 'lab / 主题卡 1.14 中的 Replay 语义是？',
  options: [
    { label: 'A', text: '重新调用 LLM API 再跑一遍任务' },
    { label: 'B', text: '只读消费 event_log / model_call_log / trace 等记录，解释决策；不重复调模型，也非工具副作用重执行' },
    { label: 'C', text: '换成更小模型做 deterministic re-execution' },
  ],
  correctIndex: 1,
  explanation:
    '主题卡明确：当前 replay 是只读复盘（replay.py 读 event_log、run_result、trace），不做 deterministic re-execution，也不重新调模型。trace span 另可用于 eval 指标提取。',
}

export const LEVEL_4_2_QUIZ: QuizQuestion = {
  id: '4.2-q1', question: 'Eval 评测的主要目的是什么？',
  options: [{label:'A',text:'给 Agent 打分排名'},{label:'B',text:'量化 Agent 升级是否真的改进了行为，通过回归对比验证改进有效'},{label:'C',text:'替代人工测试'}],
  correctIndex: 1, explanation: 'Eval 的核心是回归对比：升级前 vs 升级后在相同测试用例上的表现差异。它不是排名工具，而是"我的代码改动真的让 Agent 变好了吗"的验证手段。',
}
