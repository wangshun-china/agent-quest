/**
 * Build transparent-exploration pipeline graphs from harness decisions.
 * Nodes are click-expandable in the UI; shape follows design §5.2 branches.
 */

import { TOOL_REGISTRY } from './tools'
import type {
  FileFingerprint,
  PermissionProfile,
  PolicyAgentState,
  PolicyDecision,
} from './types'
import type { EventLogEntry } from './eventLog'

export type NodeKind = 'model' | 'harness'

export type NodeStatus = 'idle' | 'active' | 'done' | 'error' | 'skipped' | 'blocked'

export interface GlassNode {
  id: string
  label: string
  kind: NodeKind
  status: NodeStatus
  /** Short status chip e.g. ALLOW / DENY */
  chip?: string
  /** Full internal payload shown when expanded */
  data: Record<string, unknown>
  /** One-line pedagogy */
  note: string
}

export type GlassBranch =
  | 'tool_path'
  | 'deny_truncated'
  | 'ask_gate'
  | 'repair_block'
  | 'final_path'
  | 'event_step'
  | 'idle'
  | 'wrong_choice'
  | 'react_step'

export interface GlassPipeline {
  title: string
  branch: GlassBranch
  nodes: GlassNode[]
  /** Human summary of what just happened */
  summary: string
  /** Optional step index for history strip */
  stepIndex?: number
}

function node(
  partial: Omit<GlassNode, 'note'> & { note?: string },
): GlassNode {
  return { note: partial.note || '', ...partial }
}

/** Policy check step → dynamic pipeline (design cases A/C). */
export function buildPolicyPipeline(input: {
  toolName: string
  args: Record<string, unknown>
  profile: PermissionProfile
  state: PolicyAgentState
  decision: PolicyDecision
  workspaceSnapshot?: Record<string, unknown>
}): GlassPipeline {
  const { toolName, args, profile, state, decision, workspaceSnapshot } = input
  const spec = TOOL_REGISTRY[toolName]
  const intent = node({
    id: 'intent',
    label: 'Model Intent',
    kind: 'model',
    status: 'done',
    chip: 'tool_call',
    data: {
      tool: toolName,
      arguments: args,
      note: '模型只提出意图，不执行',
    },
    note: 'Model Policy：选择工具与参数（非确定性）',
  })

  const registry = node({
    id: 'registry',
    label: 'Tool Registry',
    kind: 'harness',
    status: spec ? 'done' : 'error',
    chip: spec ? 'found' : 'unknown',
    data: {
      ToolSpec: spec || null,
      effects: spec?.effects || [],
      risk: spec?.risk || 'unknown',
    },
    note: 'Harness：从 TOOL_REGISTRY 解析 ToolSpec',
  })

  const policyStatus: NodeStatus =
    decision.outcome === 'deny' ? 'error' : decision.outcome === 'ask' ? 'active' : 'done'

  const policy = node({
    id: 'policy',
    label: 'RuntimePolicy',
    kind: 'harness',
    status: policyStatus,
    chip: decision.outcome.toUpperCase(),
    data: {
      decision: {
        outcome: decision.outcome,
        code: decision.code,
        reason: decision.reason,
        risk: decision.risk,
        capability: decision.capability,
      },
      PermissionProfile: profile,
      AgentState: {
        inspected: state.inspected,
        codingGuardsEnabled: state.codingGuardsEnabled,
        observedFiles: state.observedFiles,
      },
      workspaceSnapshot: workspaceSnapshot || null,
    },
    note: 'Harness 唯一 allow/ask/deny 决策器（确定性代码）',
  })

  if (decision.outcome === 'deny') {
    return {
      title: 'Policy DENY — 管道截断',
      branch: 'deny_truncated',
      summary: `✋ DENY · ${decision.code} — 工具不会执行，模型将收到 policy 错误 observation`,
      nodes: [
        intent,
        registry,
        policy,
        node({
          id: 'truncated',
          label: 'Execute',
          kind: 'harness',
          status: 'skipped',
          chip: 'skipped',
          data: { reason: 'Policy denied — ToolExecutor never called' },
          note: '被拒绝后不再进入执行与 observation 成功路径',
        }),
      ],
    }
  }

  if (decision.outcome === 'ask') {
    return {
      title: 'Policy ASK — 审批闸门',
      branch: 'ask_gate',
      summary: `⚠ ASK · ${decision.code} — 仅此时进入 ApprovalController`,
      nodes: [
        intent,
        registry,
        policy,
        node({
          id: 'approval',
          label: 'Approval',
          kind: 'harness',
          status: 'active',
          chip: 'pending',
          data: {
            role: 'reviewer_only',
            receives: 'PolicyDecision(outcome=ASK)',
            does_not: ['re-check risk', 'query registry'],
          },
          note: 'Approval 只做 reviewer，不重新解释风险',
        }),
        node({
          id: 'execute',
          label: 'Tool Execute',
          kind: 'harness',
          status: 'idle',
          data: { waiting: 'approval' },
          note: '批准后才执行 handler',
        }),
      ],
    }
  }

  // allow
  return {
    title: 'Policy ALLOW — 可执行',
    branch: 'tool_path',
    summary: `✓ ALLOW · ${decision.code} — 跳过审批，可直接执行`,
    nodes: [
      intent,
      registry,
      policy,
      node({
        id: 'execute',
        label: 'Tool Execute',
        kind: 'harness',
        status: 'done',
        chip: 'ready',
        data: {
          would_call: toolName,
          arguments: args,
          shell: toolName === 'run_command' ? false : undefined,
        },
        note: 'Harness 执行；模型不碰文件系统',
      }),
      node({
        id: 'observation',
        label: 'Observation',
        kind: 'harness',
        status: 'done',
        data: {
          role: 'tool',
          tool_call_id: '(bound to call)',
          would_return: 'structured ToolResult → model context',
        },
        note: '结构化 observation 回传模型，形成 ReAct 闭环',
      }),
    ],
  }
}

/** Edit path: show fingerprint compare inside policy payload. */
export function buildEditPipeline(input: {
  action: string
  toolName: string
  args: Record<string, unknown>
  profile: PermissionProfile
  state: PolicyAgentState
  decision: PolicyDecision | null
  currentFingerprint: FileFingerprint | Record<string, unknown> | null
  observedFingerprint: FileFingerprint | Record<string, unknown> | null
  detail: string
}): GlassPipeline {
  if (!input.decision) {
    return {
      title: 'Workspace 状态变化',
      branch: 'idle',
      summary: input.detail,
      nodes: [
        node({
          id: 'workspace',
          label: 'Workspace',
          kind: 'harness',
          status: 'active',
          data: {
            action: input.action,
            currentFingerprint: input.currentFingerprint,
            observedFingerprint: input.observedFingerprint,
            detail: input.detail,
          },
          note: '文件系统真相；模型只通过 inspect 看到快照',
        }),
      ],
    }
  }

  const base = buildPolicyPipeline({
    toolName: input.toolName,
    args: input.args,
    profile: input.profile,
    state: input.state,
    decision: input.decision,
    workspaceSnapshot: {
      current: input.currentFingerprint,
      observed: input.observedFingerprint,
      compare:
        input.currentFingerprint && input.observedFingerprint
          ? {
              path_match:
                (input.currentFingerprint as { path?: string }).path ===
                (input.observedFingerprint as { path?: string }).path,
              sha1_match:
                (input.currentFingerprint as { sha1?: string }).sha1 ===
                (input.observedFingerprint as { sha1?: string }).sha1,
              mtime_match:
                (input.currentFingerprint as { mtime_ns?: number }).mtime_ns ===
                (input.observedFingerprint as { mtime_ns?: number }).mtime_ns,
            }
          : 'missing observation or file',
    },
  })
  base.summary = `${input.action} → ${input.decision.outcome}/${input.decision.code}`
  return base
}

/** Repair guard pipeline. */
export function buildRepairPipeline(input: {
  phase: 'guard' | 'failed' | 'progress' | 'passed'
  toolName: string
  args: Record<string, unknown>
  guardAllowed: boolean
  guardCode: string
  guardReason: string
  controllerSnapshot: Record<string, unknown>
  repairHint?: string
  executeResult?: Record<string, unknown>
}): GlassPipeline {
  const intent = node({
    id: 'intent',
    label: 'Model Intent',
    kind: 'model',
    status: 'done',
    chip: input.toolName,
    data: { tool: input.toolName, arguments: input.args },
    note: '模型再次选择验证命令',
  })

  const guard = node({
    id: 'repair_guard',
    label: 'RepairController',
    kind: 'harness',
    status: input.guardAllowed ? 'done' : 'error',
    chip: input.guardAllowed ? 'pass' : 'BLOCK',
    data: {
      guard: {
        allowed: input.guardAllowed,
        code: input.guardCode || null,
        reason: input.guardReason || null,
      },
      controller: input.controllerSnapshot,
    },
    note: '同一失败命令 + 无进展 → repair_requires_progress',
  })

  if (!input.guardAllowed) {
    return {
      title: 'Repair 截断 — 无进展空转',
      branch: 'repair_block',
      summary: `✕ ${input.guardCode} — 不执行 run_command，要求 inspect/edit 后再试`,
      nodes: [
        intent,
        guard,
        node({
          id: 'execute',
          label: 'Tool Execute',
          kind: 'harness',
          status: 'skipped',
          chip: 'skipped',
          data: { skipped: true },
          note: 'guard 拒绝后不调用 executor',
        }),
      ],
    }
  }

  if (input.phase === 'progress') {
    return {
      title: '记录进展',
      branch: 'tool_path',
      summary: 'inspect/edit 成功 → new_evidence 或 new_edit',
      nodes: [
        intent,
        node({
          id: 'progress',
          label: 'Progress Flag',
          kind: 'harness',
          status: 'done',
          chip: 'progress',
          data: { controller: input.controllerSnapshot },
          note: '指纹仍本地保留；仅放行下一次同命令验证',
        }),
      ],
    }
  }

  return {
    title: input.phase === 'passed' ? '验证通过' : '验证执行',
    branch: 'tool_path',
    summary:
      input.phase === 'passed'
        ? 'returncode=0 · 清除 failure state'
        : `执行验证 · hint=${input.repairHint?.slice(0, 60) || '—'}`,
    nodes: [
      intent,
      guard,
      node({
        id: 'execute',
        label: 'Tool Execute',
        kind: 'harness',
        status: input.phase === 'passed' ? 'done' : 'error',
        chip: input.phase === 'passed' ? 'exit 0' : 'exit ≠0',
        data: { result: input.executeResult || null },
        note: '完整结果进 tool_call_log；模型侧有界',
      }),
      node({
        id: 'observation',
        label: 'Observation',
        kind: 'harness',
        status: 'done',
        data: {
          repair_hint: input.repairHint || null,
          fingerprint_exposed_to_model: false,
          note: '指纹只在本地；模型只看 hint + 错误摘要',
        },
        note: 'verification_feedback 形态 observation',
      }),
    ],
  }
}

/** Map one event_log step's events into a glass pipeline. */
export function buildEventStepPipeline(
  step: number,
  events: EventLogEntry[],
  focusIndex: number,
): GlassPipeline {
  const nodes: GlassNode[] = []

  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const focused = i === focusIndex
    const status: NodeStatus = focused ? 'active' : 'done'
    switch (e.type) {
      case 'user_message':
        nodes.push(
          node({
            id: `e-${i}-user`,
            label: 'User',
            kind: 'model',
            status,
            chip: 'user',
            data: { content: e.content, step: e.step, timestamp: e.timestamp },
            note: '用户任务进入 run',
          }),
        )
        break
      case 'model_call':
        nodes.push(
          node({
            id: `e-${i}-model`,
            label: 'Model Call',
            kind: 'model',
            status,
            chip: 'llm',
            data: {
              step: e.step,
              response: e.response,
              messages_count: Array.isArray(e.messages) ? e.messages.length : undefined,
            },
            note: '模型响应快照（replay 不重调 API）',
          }),
        )
        break
      case 'approval':
        nodes.push(
          node({
            id: `e-${i}-approval`,
            label: 'Approval',
            kind: 'harness',
            status,
            chip: String((e.decision as { approved?: boolean } | undefined)?.approved ?? '?'),
            data: {
              name: e.name,
              arguments: e.arguments,
              decision: e.decision,
              preview: e.preview,
            },
            note: 'Harness 审批记录',
          }),
        )
        break
      case 'tool_call':
        nodes.push(
          node({
            id: `e-${i}-tool`,
            label: 'Tool Call',
            kind: 'harness',
            status,
            chip: e.name,
            data: {
              name: e.name,
              arguments: e.arguments,
              result: e.result,
            },
            note: '完整工具参数与结果（可观测事实源）',
          }),
        )
        break
      case 'final':
        nodes.push(
          node({
            id: `e-${i}-final`,
            label: 'Final',
            kind: 'harness',
            status,
            chip: 'final',
            data: { content: e.content, step: e.step },
            note: '终态输出 + completion evidence',
          }),
        )
        break
      default:
        nodes.push(
          node({
            id: `e-${i}-other`,
            label: e.type,
            kind: 'harness',
            status,
            data: { ...e },
            note: e.type,
          }),
        )
    }
  }

  const focus = events[focusIndex]
  return {
    title: `Step ${step} · event ${focusIndex + 1}/${events.length}`,
    branch: 'event_step',
    summary: focus
      ? `当前焦点: ${focus.type}${focus.name ? ` · ${focus.name}` : ''}（只读 replay）`
      : '无事件',
    nodes,
  }
}

export function emptyPipeline(hint: string): GlassPipeline {
  return {
    title: '透明管道',
    branch: 'idle',
    summary: hint,
    nodes: [],
  }
}

/**
 * ReAct / boundary teaching step: correct tool path, correct final, or wrong choice.
 * Used by levels 1.1 (sim) and 1.2 (decision scenes).
 */
export function buildAgentStepPipeline(input: {
  step: number
  situation: string
  choiceLabel: string
  choiceText: string
  correct: boolean
  feedback: string
  tool?: string | null
  toolArgs?: Record<string, unknown> | null
  toolResult?: string | null
  assistantText?: string | null
}): GlassPipeline {
  const {
    step,
    situation,
    choiceLabel,
    choiceText,
    correct,
    feedback,
    tool,
    toolArgs,
    toolResult,
    assistantText,
  } = input

  const context = node({
    id: 'context',
    label: 'Context',
    kind: 'harness',
    status: 'done',
    chip: 'build',
    data: {
      situation,
      step,
      note: 'Harness 组装 system contract + history + tools schema',
    },
    note: 'Harness：构造模型可见上下文',
  })

  const intent = node({
    id: 'intent',
    label: 'Model Decision',
    kind: 'model',
    status: correct ? 'done' : 'error',
    chip: choiceLabel,
    data: {
      choice: choiceText,
      correct,
      tool: tool || null,
      assistant: assistantText || null,
    },
    note: 'Model：选下一步 action（非确定性）',
  })

  if (!correct) {
    return {
      title: `Step ${step} · 错误决策`,
      branch: 'wrong_choice',
      stepIndex: step,
      summary: `❌ ${feedback}`,
      nodes: [
        context,
        intent,
        node({
          id: 'halt',
          label: 'No Progress',
          kind: 'harness',
          status: 'error',
          chip: 'blocked',
          data: {
            feedback,
            would_happen:
              '错误 final 会被 CompletionTracker 拒绝；盲目编辑会被 read_before_edit / policy 挡住',
          },
          note: '教学路径：展示为何此选择破坏闭环',
        }),
      ],
    }
  }

  if (tool) {
    const spec = TOOL_REGISTRY[tool]
    return {
      title: `Step ${step} · tool_call → ${tool}`,
      branch: 'react_step',
      stepIndex: step,
      summary: `✓ ${feedback}`,
      nodes: [
        context,
        intent,
        node({
          id: 'policy',
          label: 'RuntimePolicy',
          kind: 'harness',
          status: 'done',
          chip: 'ALLOW',
          data: {
            tool,
            ToolSpec: spec || null,
            outcome: 'allow',
            note: '教学场景：合法路径放行（深关 2.2 展开完整 deny/ask）',
          },
          note: 'Harness：确定性权限检查',
        }),
        node({
          id: 'execute',
          label: 'Tool Execute',
          kind: 'harness',
          status: 'done',
          chip: tool,
          data: {
            name: tool,
            arguments: toolArgs || {},
            result_preview: toolResult || 'OK',
          },
          note: 'Harness：执行 handler，模型不碰 OS',
        }),
        node({
          id: 'observation',
          label: 'Observation',
          kind: 'harness',
          status: 'done',
          chip: 'role=tool',
          data: {
            role: 'tool',
            content: toolResult || 'OK',
            note: '回传模型 → 下一轮 ReAct',
          },
          note: '结构化 observation 进入下一轮上下文',
        }),
      ],
    }
  }

  // correct final
  return {
    title: `Step ${step} · final`,
    branch: 'final_path',
    stepIndex: step,
    summary: `✓ ${feedback}`,
    nodes: [
      context,
      intent,
      node({
        id: 'plan_check',
        label: 'Plan Check',
        kind: 'harness',
        status: 'done',
        chip: 'ok',
        data: { check_final: true, goal_evidence: true },
        note: 'PlanController：目标是否有 evidence',
      }),
      node({
        id: 'policy_final',
        label: 'Policy Final',
        kind: 'harness',
        status: 'done',
        chip: 'ALLOW',
        data: {
          verification_required: false,
          code: 'final_allowed',
        },
        note: 'RuntimePolicy.check_final：未验证则 DENY',
      }),
      node({
        id: 'completion',
        label: 'Completion',
        kind: 'harness',
        status: 'done',
        chip: 'success',
        data: {
          status: 'success',
          reason_code: 'completed',
          final: assistantText || feedback,
        },
        note: 'CompletionTracker → RunResult.success',
      }),
    ],
  }
}

/** Boundary sim step from fixed script (list/read/run/final). */
export function buildSimScriptPipeline(input: {
  step: number
  user: string
  assistant: string
  tool: string | null
  toolArgs: string | null
  toolResult: string | null
}): GlassPipeline {
  let args: Record<string, unknown> = {}
  if (input.toolArgs) {
    try {
      args = JSON.parse(input.toolArgs) as Record<string, unknown>
    } catch {
      args = { raw: input.toolArgs }
    }
  }
  return buildAgentStepPipeline({
    step: input.step,
    situation: input.user,
    choiceLabel: input.tool ? 'tool' : 'final',
    choiceText: input.tool ? `call ${input.tool}` : 'final answer',
    correct: true,
    feedback: input.assistant,
    tool: input.tool,
    toolArgs: args,
    toolResult: input.toolResult,
    assistantText: input.assistant,
  })
}
