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
  id: '2.2-q1', question: '模型尝试调用 run_command("rm -rf /")。RuntimePolicy 应该？',
  options: [{label:'A',text:'allow，相信模型的判断'},{label:'B',text:'deny，高危操作+未知程序路径=直接拒绝'},{label:'C',text:'ask，让用户决定'}],
  correctIndex: 1, explanation: 'rm -rf 是高危操作且使用了 root 路径，RuntimePolicy 应根据 risk=high 直接 deny。这不是问用户的问题——Sandbox 不应允许这种操作。',
}

export const LEVEL_2_3_QUIZ: QuizQuestion = {
  id: '2.3-q1', question: '模型想直接 write_file 到已有文件但从未 read_file 查看过。Harness 应该？',
  options: [{label:'A',text:'允许写入，模型知道内容就行'},{label:'B',text:'返回 read_before_edit_required'},{label:'C',text:'自动先帮模型读一遍文件'}],
  correctIndex: 1, explanation: 'read_before_edit 是硬性要求——对已有文件编辑前必须先观察。Harness 检查文件 size/mtime/sha1，不一致则拒绝编辑。',
}

export const LEVEL_2_4_QUIZ: QuizQuestion = {
  id: '2.4-q1', question: '模型连续3次以相同参数运行同一失败测试。retry_controller 应该？',
  options: [{label:'A',text:'允许重试，说不定下次就过了'},{label:'B',text:'返回 repair_requires_progress'},{label:'C',text:'自动修改代码再试'}],
  correctIndex: 1, explanation: 'fingerprint 匹配同一失败模式且无新观察/新编辑 → repair_requires_progress。Harness 不替模型修代码，但也不让无信息增量的循环浪费预算。',
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
