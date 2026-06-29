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