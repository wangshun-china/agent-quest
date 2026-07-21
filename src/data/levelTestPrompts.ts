/**
 * 每关大模型驱动的「标准测试命令」——给用户一键试跑，也给自动化 live suite 用。
 */
export interface LevelTestSpec {
  levelId: string
  /** 一键发送给模型的任务原文 */
  prompt: string
  /** 用户应观察什么（界面文案） */
  expect: string
  /** 推荐 profile */
  profile?: 'workspace' | 'read-only'
  /** 自动审批时是否批准 ASK（suite 用） */
  autoApprove?: boolean
}

export const LEVEL_TEST_PROMPTS: Record<string, LevelTestSpec> = {
  '1.1-boundary': {
    levelId: '1.1-boundary',
    prompt:
      '请用工具完成：list_files 查看目录 → read_file 读取 calc.py → 用一句话说明 add 函数做什么。不要写文件。',
    expect: 'inspect 工具应 ALLOW；右侧管道出现 Policy ALLOW / tool_path。',
  },
  '1.2-react-loop': {
    levelId: '1.2-react-loop',
    prompt:
      '任务（ReAct 闭环）：1) list_files 看 workspace；2) read_file 读 calc.py；3) 用 replace_text 给 add 函数上方加一行注释 # calculator；4) 用 run_command 运行 python 验证 add(2,3)==5。每一步根据 observation 再决策。',
    expect: '多轮 tool_call → observation → 再决策；写/执行会 ASK，批准后继续；右侧管道多步点亮。',
  },
  '1.3-model-client': {
    levelId: '1.3-model-client',
    prompt: '调用 read_file 读取 calc.py，然后 final 用中文总结协议：tool 结果如何通过 role=tool 回传。',
    expect: '至少 1 次 tool_call + 一次 final；无协议错误。',
  },
  '1.4-function-calling': {
    levelId: '1.4-function-calling',
    prompt: '使用 function calling：先 list_files，再 read_file calc.py，最后总结文件内容。不要用虚构的 user 消息回传工具结果。',
    expect: '原生 tool_calls；右侧显示 Intent → Policy → Execute → Observation。',
  },
  '2.1-tool-registry': {
    levelId: '2.1-tool-registry',
    prompt: '从可用工具中选择 list_files 与 inspect_repo，探索 workspace，说明你调用了哪些工具名。',
    expect: '工具名来自 Registry；Policy 对 inspect 为 read_allowed。',
  },
  '2.2-runtime-policy': {
    levelId: '2.2-runtime-policy',
    prompt:
      '按顺序：① list_files；② write_file 创建 note.txt 内容 hello；③ 说明哪一步是 ALLOW、哪一步需要审批。',
    expect: 'list ALLOW；write 为 ASK（workspace_write_requires_approval）。可切换 read-only 再试 write 应 DENY。',
  },
  '2.3-code-edit': {
    levelId: '2.3-code-edit',
    prompt:
      '不要先读文件，直接 replace_text 把 calc.py 中 return a + b 改成 return a + b  # ok。若被拒绝（read_before_edit / inspect_before_edit），先 read_file 再改。',
    expect: '先 DENY 再 read 后 ASK；批准后 replace 成功。',
  },
  '2.4-verification': {
    levelId: '2.4-verification',
    prompt:
      '给 calc.py 添加 def multiply(a,b): return a*b（先 read_file 再 replace_text）。不要用 python -c。请 write_file 写 test_mul.py 内含 assert multiply(3,4)==12，再用 run_command program=python args=["test_mul.py"] 验证。',
    expect: '编辑 ASK；run_command ASK；成功 returncode=0。勿用 -c（会被 inline_code_not_allowed）。',
  },
  '3.1-context-engineering': {
    levelId: '3.1-context-engineering',
    prompt: '连续：list_files → read_file calc.py → search_text 搜 add → 总结你累计看到的信息。',
    expect: '多轮后 messages 变长；管道每步更新。',
  },
  '3.2-planning': {
    levelId: '3.2-planning',
    prompt: '先 update_plan 目标「为 calc 增加 multiply」，再 read_file，再实现 multiply 并验证。',
    expect: 'update_plan 应为 ALLOW（plan）；编辑/命令仍走 ASK。',
  },
  '3.3-project-explore': {
    levelId: '3.3-project-explore',
    prompt: '用 inspect_repo 与 rank_repo_context 分析项目，指出最相关文件，再 read_file 确认。',
    expect: 'inspect 类工具 ALLOW；能定位 calc.py。',
  },
  '3.4-memory': {
    levelId: '3.4-memory',
    prompt: '记住偏好：优先 replace_text。然后 read calc.py，用 replace_text 加注释 # preferred edit tool，说明你遵守了偏好。',
    expect: '会话内遵循偏好；编辑需先观察。',
  },
  '3.5-completion': {
    levelId: '3.5-completion',
    prompt: '为 calc 添加 multiply 后必须 run_command 验证 multiply(2,5)==10，再 final 声称完成。',
    expect: '验证通过后再 final；观察完整闭环。',
  },
  '4.1-observability': {
    levelId: '4.1-observability',
    // special: replay level — suite skips or light live if converted
    prompt: '（本关以 Trace 回放为主）步进 event_log，或发：list_files 后 final 说明你做了什么以便对照日志。',
    expect: '回放模式：自动/手动步进 jsonl；live 可选。',
  },
  '4.2-evaluation': {
    levelId: '4.2-evaluation',
    prompt: 'Eval 用例：确认 calc.add(1,2)==3。read_file + run_command 验证，输出 PASS/证据。',
    expect: '固定任务可复现；终态可当作一次 eval 证据。',
  },
  '4.3-hitl': {
    levelId: '4.3-hitl',
    prompt: 'read_file calc.py 后 replace_text 加注释 # hitl。观察只有写操作弹出 Approval。',
    expect: 'read ALLOW；replace ASK 需批准；拒绝则 observation 为 approval_denied。',
  },
  '4.4-sandbox': {
    levelId: '4.4-sandbox',
    prompt: '在当前 profile 下依次：list_files、write_file x.txt、run_command python -c print(1)。报告每步 outcome/code。',
    expect: 'read-only：list ALLOW；write DENY workspace_write_not_allowed；command DENY command_not_allowed。',
    profile: 'read-only',
  },
  '5.1-multi-agent': {
    levelId: '5.1-multi-agent',
    prompt: '调用 delegate_readonly_task 探索 workspace，再根据子任务结果总结文件列表。',
    expect: '委派工具执行并回传 observation。',
  },
  '5.2-mcp': {
    levelId: '5.2-mcp',
    prompt: 'list_files + read_file，说明这些本地工具与 MCP tool 一样需经 ToolSpec 与 Policy。',
    expect: '工具调用走 Registry + Policy。',
  },
  '5.3-routing': {
    levelId: '5.3-routing',
    prompt: '用当前模型 read_file calc.py 并一句话说明 ModelClient 与模型本身的分工。',
    expect: '协议层稳定；模型可替换（界面可改 model）。',
  },
  '5.4-java-spring': {
    levelId: '5.4-java-spring',
    prompt: 'list_files 后说明：哪一步像 Spring 拦截器（Policy）、哪一步像 Service（Tool）。',
    expect: '能对照 harness 分层作答。',
  },
  '5.5-capstone': {
    levelId: '5.5-capstone',
    prompt:
      '毕业任务：read calc.py → 添加 multiply(a,b)=a*b → run_command 验证 multiply(3,4)==12 → final 总结每步 allow/ask/deny。',
    expect: '完整探索-编辑-验证-final；右侧多步管道可回看。',
  },
}

export function getLevelTestSpec(levelId: string): LevelTestSpec | undefined {
  return LEVEL_TEST_PROMPTS[levelId]
}
