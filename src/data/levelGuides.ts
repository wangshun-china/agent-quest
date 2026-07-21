/**
 * 每关「新手引导」——明确怎么玩、规则表、看哪里、测什么。
 * 与 levelTestPrompts 的 prompt 联动。
 */
import { LEVEL_TEST_PROMPTS } from './levelTestPrompts'

export interface LevelGuide {
  levelId: string
  /** 一句话本关目标 */
  goal: string
  /** 怎么玩：步骤列表 */
  steps: string[]
  /** 规则/速查（可多块） */
  rules: { title: string; lines: string[] }[]
  /** 看右侧管道时关注什么 */
  watch: string[]
  /** 常见误区 */
  pitfalls?: string[]
}

const guides: Record<string, LevelGuide> = {
  '1.1-boundary': {
    levelId: '1.1-boundary',
    goal: '分清「模型做决定」和「Harness 做硬边界」。',
    steps: [
      '确认右上角已配置 API，Model 建议 qwen3.6-27b',
      '点「一键发送测试命令」，或自己描述只读任务',
      '看聊天里模型是否调用 list_files / read_file',
      '看右侧管道：Policy 是否 ALLOW，Execute / Observation 是否出现',
      '跑完后点「答题过关」',
    ],
    rules: [
      {
        title: '谁负责什么',
        lines: [
          '🧠 模型：选哪个工具、读哪个文件、怎么理解结果',
          '⚙️ Harness：构造上下文、执行工具、Policy 裁决、记日志',
          'Prompt 里的「不要做」≠ 真正安全边界',
        ],
      },
    ],
    watch: ['Intent（模型意图）', 'Policy ALLOW + code=read_allowed', 'Observation 回传'],
    pitfalls: ['不要一上来就 write_file——本关先体会只读 ALLOW 路径'],
  },
  '1.2-react-loop': {
    levelId: '1.2-react-loop',
    goal: '体会 ReAct：action → observation → 再决策，多轮闭环。',
    steps: [
      '点「一键发送测试命令」跑标准 4 步任务',
      '每出现 ⚠ ASK 审批，点「批准」才能继续写/执行',
      '观察多轮：list → read → replace → run',
      '右侧管道会连着亮多步，可点历史胶片回看',
      '不要用 python -c（会被 DENY），验证应写脚本文件再 run',
    ],
    rules: [
      {
        title: 'ReAct 闭环',
        lines: [
          '模型每轮看到最新 observation 再选下一步',
          '不是一次生成全部答案',
          '写文件 / 跑命令前会 ASK → 你点批准 = Human-in-the-loop',
        ],
      },
    ],
    watch: ['多步 pipeline 历史', 'ASK 闸门', 'run_command 成功后的 final'],
    pitfalls: ['python -c 会触发 inline_code_not_allowed'],
  },
  '1.3-model-client': {
    levelId: '1.3-model-client',
    goal: '理解请求里 messages + tools 边界，以及 tool 结果如何回传。',
    steps: [
      '发送测试命令：read_file 后 final 总结协议',
      '在聊天中确认：先有工具调用，再有文字总结',
      '右侧点开 Policy / Observation 看内部数据',
    ],
    rules: [
      {
        title: '消息协议要点',
        lines: [
          'tools 在请求顶层，不塞进 system 长文里伪装',
          '工具结果：role=tool + tool_call_id',
          '不是伪造一条 user 消息说「工具结果：…」',
        ],
      },
    ],
    watch: ['tool 气泡', 'final 文本', 'Observation 节点 JSON'],
  },
  '1.4-function-calling': {
    levelId: '1.4-function-calling',
    goal: '看清原生 Function Calling：tool_calls → 执行 → role=tool。',
    steps: [
      '一键发送：list_files → read_file → 总结',
      '确认模型走 tool_calls，而不是输出伪 JSON 文本协议',
      '右侧管道应对齐 Intent → Policy → Execute → Observation',
    ],
    rules: [
      {
        title: 'Function Calling',
        lines: [
          '模型只提出调用意图，不自己执行',
          'Harness 校验参数并执行',
          '结果用原生 tool 消息回传，形成闭环',
        ],
      },
    ],
    watch: ['连续两次 tool', '最后 final 总结'],
  },
  '2.1-tool-registry': {
    levelId: '2.1-tool-registry',
    goal: '工具来自唯一 TOOL_REGISTRY，不是 prompt 里随口编的函数名。',
    steps: [
      '发送测试命令，要求模型用 list_files + inspect_repo',
      '看它调用的名字是否都在 Registry 内',
      '点右侧 Registry/Policy 节点看 ToolSpec（risk/effects）',
    ],
    rules: [
      {
        title: 'ToolSpec 关键字段',
        lines: [
          'name / description → 模型可见',
          'risk + effects → 给 RuntimePolicy 用',
          '未知工具 → DENY code=unknown_tool',
        ],
      },
    ],
    watch: ['工具名是否合法', 'effects=inspect 时 ALLOW'],
  },
  '2.2-runtime-policy': {
    levelId: '2.2-runtime-policy',
    goal: 'RuntimePolicy 是唯一的 allow / ask / deny 决策器。',
    steps: [
      'Profile 先保持 workspace',
      '一键发送：list_files 再 write_file',
      'list 应直接执行；write 会弹审批 → 点「批准」',
      '再把 Profile 切到 read-only，自己发：write_file 试写 → 应 DENY',
      '对照右侧 code：read_allowed / workspace_write_requires_approval / workspace_write_not_allowed',
    ],
    rules: [
      {
        title: 'RuntimePolicy 检查（每次 tool call 前）',
        lines: [
          'inspect + 允许读 → ✓ ALLOW（read_allowed）直接执行',
          'edit + 允许写 + 读后编辑通过 → ⚠ ASK（workspace_write_requires_approval）',
          'execute + 允许命令 + 程序合法 → ⚠ ASK（command_requires_approval）',
          'profile 禁止写/命令 → ✕ DENY（workspace_write_not_allowed / command_not_allowed）',
          '未知程序 / python -c → ✕ DENY（program_not_allowed / inline_code_not_allowed）',
          'policy denial → 模型收到错误 observation，应改策略',
        ],
      },
      {
        title: '不是 risk 标签这么简单',
        lines: [
          '不是「safe=allow / high=deny」一刀切',
          '允许的 python 测试命令仍是 ASK，不是 DENY',
          'Approval 只处理 ASK，不重算 Policy',
        ],
      },
    ],
    watch: ['ALLOW vs ASK vs DENY 三种 outcome', '稳定 code 字符串', 'Profile 切换后行为变化'],
    pitfalls: ['把 DENY 当成模型「不听话」——其实是 Harness 硬边界'],
  },
  '2.3-code-edit': {
    levelId: '2.3-code-edit',
    goal: '已有文件必须先观察再编辑（read-before-edit）。',
    steps: [
      '一键发送：故意先不读就 replace_text',
      '应看到 DENY：inspect_before_edit 或 read_before_edit_required',
      '模型会改 read_file，再 replace → ASK → 你批准',
      '可选：自己验证「先读后改」一次成功路径',
    ],
    rules: [
      {
        title: '编辑安全',
        lines: [
          '未观察已有文件 → DENY read_before_edit_required',
          '观察后文件被改过 → DENY file_changed_since_read',
          '新鲜观察一致 → ASK 进入审批',
          '新建文件（不存在）→ 可进入 ASK（无 path 观察要求）',
        ],
      },
    ],
    watch: ['第一次 DENY', 'read 后 ASK', 'Policy 节点里的 fingerprint 对比'],
  },
  '2.4-verification': {
    levelId: '2.4-verification',
    goal: '编辑后要验证；无进展重复失败命令会被 Repair 拦截。',
    steps: [
      '一键发送：添加 multiply 并用测试文件验证（不要用 -c）',
      '编辑与 run_command 的 ASK 都点批准',
      '若模型用 python -c，会 DENY inline_code_not_allowed——这是预期教学点',
      '可选进阶：故意让测试失败后立刻重跑同一命令，看 repair_requires_progress',
    ],
    rules: [
      {
        title: '验证与修复',
        lines: [
          '失败验证 → 本地 fingerprint + repair_hint（hint 给模型，hash 不给）',
          '同一失败命令 + 无新 inspect/edit → DENY repair_requires_progress',
          'read/edit 成功算进展，可再次验证',
          '禁止 python -c / node -e 内联代码',
        ],
      },
    ],
    watch: ['ASK on edit/run', 'returncode=0', 'inline_code DENY（若模型踩坑）'],
  },
  '3.1-context-engineering': {
    levelId: '3.1-context-engineering',
    goal: '上下文是有预算的组装，不是「塞越多越好」。',
    steps: [
      '一键发送多步只读任务：list → read → search',
      '观察多轮后聊天变长 = 上下文在累积',
      '右侧每步管道代表一轮 Context 构建后的执行',
      '思考：哪些该进 system/contract，哪些是临时 observation',
    ],
    rules: [
      {
        title: 'Context 要点（主题卡 1.7）',
        lines: [
          '优先级：系统契约 > 用户消息 > harness 上下文 > 低优先级可省略',
          '大 tool 结果会被裁剪进模型可见窗口',
          'Auto-compact 压旧轮，不压 system 与最新消息',
        ],
      },
    ],
    watch: ['多轮 tool 气泡', '管道历史条变长'],
    pitfalls: ['本关不是 Policy 教学主场——若只看到 ALLOW 是正常的（只读任务）'],
  },
  '3.2-planning': {
    levelId: '3.2-planning',
    goal: '先 plan 再 execute；update_plan 不占用 workspace 写权限。',
    steps: [
      '一键发送：先 update_plan，再读文件，再实现 multiply 并验证',
      'update_plan 应 ALLOW（plan_update_allowed），不弹写审批',
      '真正 replace/write/run 仍会 ASK',
    ],
    rules: [
      {
        title: 'Plan vs Edit',
        lines: [
          'update_plan → effects=plan → ALLOW',
          'replace_text / write_file → effects=edit → ASK',
          '计划不是代码；完成仍要验证',
        ],
      },
    ],
    watch: ['第一枪 plan ALLOW', '后续 edit/run ASK'],
  },
  '3.3-project-explore': {
    levelId: '3.3-project-explore',
    goal: '用 inspect_repo / rank_repo_context 做项目探索，再精准 read。',
    steps: [
      '一键发送探索任务',
      '确认模型先 map/rank 再 read，而不是瞎写',
      '只读工具应全部 ALLOW',
    ],
    rules: [
      {
        title: '探索工具',
        lines: [
          'inspect_repo：结构 / 语言 / 文件列表',
          'rank_repo_context：按任务相关性排序',
          'search_text / find_files：缩小范围',
        ],
      },
    ],
    watch: ['inspect_repo / rank 调用', '最后 read calc.py'],
  },
  '3.4-memory': {
    levelId: '3.4-memory',
    goal: '区分「会话偏好/记忆」与「Harness 硬规则」。',
    steps: [
      '一键发送：声明偏好 replace_text，再按偏好改文件',
      '观察模型是否优先 replace 而不是整文件 write',
      '硬规则仍在：未读就改仍 DENY',
    ],
    rules: [
      {
        title: 'Memory vs Rules',
        lines: [
          '偏好/事实 → 适合 memory / 会话上下文',
          '权限、读后编辑、禁止 -c → 必须是 harness 代码',
          '不能靠「模型记住不要越权」当安全',
        ],
      },
    ],
    watch: ['read → replace ASK', '偏好是否被遵守'],
  },
  '3.5-completion': {
    levelId: '3.5-completion',
    goal: '完成 = 有证据；未验证不该轻易 final。',
    steps: [
      '一键发送：加 multiply 并验证后再声称完成',
      '看模型是否在验证通过后才 final',
      '若中途 -c 被拒，应改用测试文件（教学点）',
    ],
    rules: [
      {
        title: '停止条件',
        lines: [
          '模型说 final ≠ 一定允许成功结束',
          '编辑应有验证证据',
          '预算耗尽可 blocked，而不是死循环',
        ],
      },
    ],
    watch: ['验证 run returncode=0', '最后 final 文案含证据'],
  },
  '4.1-observability': {
    levelId: '4.1-observability',
    goal: '用 event_log 只读回放理解决策；也可 live 跑一小步对照。',
    steps: [
      '本关默认也可 live：一键发送 list+说明',
      '或切换思维：日志是事实源，replay 不重调模型',
      '右侧管道 = 当前 step 的可视化',
    ],
    rules: [
      {
        title: 'Trace / Replay',
        lines: [
          'event_log / model_call_log / trace.jsonl',
          'Replay = 读记录，不是再 call LLM',
          '完整原文 vs 模型可见摘要可分离',
        ],
      },
    ],
    watch: ['管道节点类型', 'final 说明是否可对照日志'],
  },
  '4.2-evaluation': {
    levelId: '4.2-evaluation',
    goal: '固定任务 + 证据 = 一次 eval 用例。',
    steps: [
      '一键发送 Eval 用例：add(1,2)==3',
      '要求模型给出 PASS 与证据（读代码 + 跑测试）',
      '同一 prompt 可重复跑做回归对比',
    ],
    rules: [
      {
        title: 'Eval',
        lines: [
          '同一任务、可判定对错',
          '记录 trace 才能对比升级前后',
          '不是排行榜，是回归验证',
        ],
      },
    ],
    watch: ['验证命令成功', '最终 PASS 表述'],
  },
  '4.3-hitl': {
    levelId: '4.3-hitl',
    goal: '只有 Policy=ASK 才出现人审批。',
    steps: [
      '一键发送：read 后 replace 加注释',
      '确认 read 不弹窗；replace 弹 Approval',
      '可点「拒绝」一次，看模型收到 approval_denied 后如何调整',
    ],
    rules: [
      {
        title: 'Approval 规则',
        lines: [
          'Policy ALLOW → 不经过你',
          'Policy ASK → 你批准/拒绝',
          'Policy DENY → 不执行、不询问（直接错误回传）',
          'Approval 不重新查 Registry / 不重算 risk',
        ],
      },
    ],
    watch: ['仅写操作 ASK', '拒绝后的 observation'],
  },
  '4.4-sandbox': {
    levelId: '4.4-sandbox',
    goal: '理解应用层 Policy ≠ 生产 OS Sandbox。',
    steps: [
      'Profile 保持 read-only（本关默认）',
      '一键发送：list / write / run 三连',
      '记录：list ALLOW；write DENY；command DENY',
      '切换 workspace 再试，对比差异',
    ],
    rules: [
      {
        title: 'read-only 下预期 code',
        lines: [
          'list_files → ALLOW read_allowed',
          'write_file → DENY workspace_write_not_allowed',
          'run_command → DENY command_not_allowed',
          '这仍不是 OS 隔离；被允许的 python 进程另当别论',
        ],
      },
    ],
    watch: ['两条 DENY code', 'Profile 切换'],
  },
  '5.1-multi-agent': {
    levelId: '5.1-multi-agent',
    goal: '子任务委派：delegate_readonly_task 结果回到主循环。',
    steps: [
      '一键发送：委派只读探索再总结',
      '若出现 ASK（execute 类），点批准',
      '看子结果如何变成 observation',
    ],
    rules: [
      {
        title: 'Multi-Agent',
        lines: [
          '父 Agent 决策是否委派',
          '子 run 应有更严边界/预算',
          '结果 ToolResult 化，不是随便开第二聊天窗',
        ],
      },
    ],
    watch: ['delegate_readonly_task', '后续 list/inspect'],
  },
  '5.2-mcp': {
    levelId: '5.2-mcp',
    goal: 'MCP/远程工具也应变成 ToolSpec，再过同一 Policy。',
    steps: [
      '一键发送：list + read，并要求模型类比 MCP',
      '理解：扩展工具面 ≠ 绕过 harness',
    ],
    rules: [
      {
        title: 'MCP 边界',
        lines: [
          'Server 暴露 tools',
          'Host 适配为 ToolSpec',
          '仍走 allow/ask/deny',
          '不可信 annotations ≠ Policy',
        ],
      },
    ],
    watch: ['本地工具调用路径与 Policy 一致'],
  },
  '5.3-routing': {
    levelId: '5.3-routing',
    goal: '模型可替换；协议在 ModelClient/客户端。',
    steps: [
      '确认当前 model（可用 qwen3.6-27b）',
      '一键发送 read + 说明分工',
      '可在配置里换模型再跑同一 prompt 对比',
    ],
    rules: [
      {
        title: '路由',
        lines: [
          '换模型不应换消息协议',
          '路由策略放客户端，不靠 prompt 自觉',
          '失败 fallback 也在客户端',
        ],
      },
    ],
    watch: ['顶栏 Live · model 名', '一次成功 tool+final'],
  },
  '5.4-java-spring': {
    levelId: '5.4-java-spring',
    goal: '把刚跑的一步映射到 Spring：Policy≈拦截器，Tool≈Service。',
    steps: [
      '一键发送 list 后要求对照 Spring 分层',
      '自己在最终回答里核对是否说清 Policy / Tool',
    ],
    rules: [
      {
        title: '映射',
        lines: [
          'AgentLoop → 服务内循环/状态机',
          'RuntimePolicy → 拦截器 / 安全组件',
          'ToolExecutor → 领域 Service',
          'Trace → 可观测性',
        ],
      },
    ],
    watch: ['模型是否正确类比'],
  },
  '5.5-capstone': {
    levelId: '5.5-capstone',
    goal: '端到端毕业：探索 → 编辑 → 验证 → final，并能解释每次裁决。',
    steps: [
      '一键发送毕业任务（multiply + 验证）',
      '所有 ASK 点批准；遇到 -c DENY 属正常，应写测试文件',
      '最终 final 应总结 allow/ask/deny',
      '用右侧历史胶片回放关键步骤',
    ],
    rules: [
      {
        title: '毕业检查单',
        lines: [
          '✓ 原生 tool 闭环',
          '✓ Policy/Approval 可解释',
          '✓ 读后编辑',
          '✓ 验证证据',
          '✓ 能指着管道讲故事',
        ],
      },
    ],
    watch: ['完整多步管道', '验证 OK', 'final 含证据'],
  },
}

export function getLevelGuide(levelId: string): LevelGuide {
  const g = guides[levelId]
  if (g) return g
  const t = LEVEL_TEST_PROMPTS[levelId]
  return {
    levelId,
    goal: '完成本关大模型驱动任务并观察透明管道。',
    steps: [
      '配置 API（建议 qwen3.6-27b）',
      '发送标准测试命令',
      'ASK 时批准',
      '观察右侧管道后答题',
    ],
    rules: [{ title: '通用', lines: ['tool_call → Policy → 执行/拒绝 → Observation'] }],
    watch: [t?.expect || '管道与裁决 code'],
  }
}
