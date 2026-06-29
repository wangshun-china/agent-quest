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