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
  explanation: 'SWE-agent 的 ACI 研究证明：observation 需要被整理成模型可行动的形式，而非原样倾倒。lab 代码中 TOOL_RESULT_MAX_TOKENS=3000 明确限制回传长度，超大结果按预算裁剪。A 错误（"越多越好"会导致上下文雪崩），C 错误（每轮都需要 observation 才能形成闭环）。',
}