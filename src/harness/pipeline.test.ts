import { describe, expect, it } from 'vitest'
import {
  buildAgentStepPipeline,
  buildEditPipeline,
  buildEventStepPipeline,
  buildPolicyPipeline,
  buildRepairPipeline,
  buildSimScriptPipeline,
} from './pipeline'
import {
  READ_ONLY_PROFILE,
  WORKSPACE_PROFILE,
  checkTool,
  emptyPolicyState,
  makeFingerprint,
  observeFile,
} from './runtimePolicy'

describe('buildPolicyPipeline (transparent branches)', () => {
  it('truncates after DENY (design case C)', () => {
    const state = emptyPolicyState()
    const decision = checkTool(
      { name: 'run_command', arguments: { program: 'rm', args: ['-rf', '/'] } },
      state,
      WORKSPACE_PROFILE,
    )
    const pipe = buildPolicyPipeline({
      toolName: 'run_command',
      args: { program: 'rm', args: ['-rf', '/'] },
      profile: WORKSPACE_PROFILE,
      state,
      decision,
    })
    expect(pipe.branch).toBe('deny_truncated')
    expect(decision.code).toBe('program_not_allowed')
    const ids = pipe.nodes.map((n) => n.id)
    expect(ids).toContain('policy')
    expect(ids).toContain('truncated')
    expect(pipe.nodes.find((n) => n.id === 'policy')?.chip).toBe('DENY')
    expect(pipe.nodes.find((n) => n.id === 'truncated')?.status).toBe('skipped')
  })

  it('ASK gate for workspace write', () => {
    const fp = makeFingerprint('calc.py', 'x')
    let state = emptyPolicyState()
    state = observeFile(state, fp)
    const decision = checkTool(
      { name: 'write_file', arguments: { path: 'calc.py', content: 'y' } },
      state,
      WORKSPACE_PROFILE,
      { 'calc.py': fp },
    )
    const pipe = buildPolicyPipeline({
      toolName: 'write_file',
      args: { path: 'calc.py', content: 'y' },
      profile: WORKSPACE_PROFILE,
      state,
      decision,
    })
    expect(pipe.branch).toBe('ask_gate')
    expect(pipe.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(['intent', 'registry', 'policy', 'approval', 'execute']),
    )
  })

  it('ALLOW inspect under workspace', () => {
    const state = emptyPolicyState()
    const decision = checkTool(
      { name: 'list_files', arguments: { path: '.' } },
      state,
      WORKSPACE_PROFILE,
    )
    const pipe = buildPolicyPipeline({
      toolName: 'list_files',
      args: { path: '.' },
      profile: WORKSPACE_PROFILE,
      state,
      decision,
    })
    expect(pipe.branch).toBe('tool_path')
    expect(pipe.nodes.find((n) => n.id === 'policy')?.data).toMatchObject({
      decision: { code: 'read_allowed' },
    })
  })

  it('read-only profile write is deny_truncated with workspace_write_not_allowed', () => {
    const fp = makeFingerprint('calc.py', 'x')
    let state = emptyPolicyState()
    state = observeFile(state, fp)
    const decision = checkTool(
      { name: 'write_file', arguments: { path: 'calc.py', content: 'y' } },
      state,
      READ_ONLY_PROFILE,
      { 'calc.py': fp },
    )
    const pipe = buildPolicyPipeline({
      toolName: 'write_file',
      args: { path: 'calc.py', content: 'y' },
      profile: READ_ONLY_PROFILE,
      state,
      decision,
    })
    expect(pipe.branch).toBe('deny_truncated')
    expect(decision.code).toBe('workspace_write_not_allowed')
  })
})

describe('buildRepairPipeline', () => {
  it('repair block skips execute', () => {
    const pipe = buildRepairPipeline({
      phase: 'guard',
      toolName: 'run_command',
      args: { program: 'python', args: ['-m', 'unittest'] },
      guardAllowed: false,
      guardCode: 'repair_requires_progress',
      guardReason: 'no progress',
      controllerSnapshot: { latest_failed_command: 'python -m unittest' },
    })
    expect(pipe.branch).toBe('repair_block')
    expect(pipe.nodes.find((n) => n.id === 'execute')?.status).toBe('skipped')
  })
})

describe('buildEditPipeline', () => {
  it('embeds fingerprint compare in policy payload', () => {
    const fp = makeFingerprint('calc.py', 'v1')
    const state = emptyPolicyState({ inspected: true })
    const decision = checkTool(
      { name: 'replace_text', arguments: { path: 'calc.py', old: 'a', new: 'b' } },
      state,
      WORKSPACE_PROFILE,
      { 'calc.py': fp },
    )
    const pipe = buildEditPipeline({
      action: 'replace_text',
      toolName: 'replace_text',
      args: { path: 'calc.py' },
      profile: WORKSPACE_PROFILE,
      state,
      decision,
      currentFingerprint: fp,
      observedFingerprint: null,
      detail: decision.reason,
    })
    expect(decision.code).toBe('read_before_edit_required')
    const policyData = pipe.nodes.find((n) => n.id === 'policy')?.data as {
      workspaceSnapshot?: { current?: unknown; observed?: unknown }
    }
    expect(policyData.workspaceSnapshot?.current).toEqual(fp)
    expect(policyData.workspaceSnapshot?.observed).toBeNull()
  })
})

describe('buildEventStepPipeline', () => {
  it('maps event types to glass nodes', () => {
    const events = [
      { type: 'user_message', step: 0, content: 'hi' },
      { type: 'tool_call', step: 1, name: 'write_file', result: { ok: true } },
      { type: 'final', step: 2, content: 'done' },
    ]
    const pipe = buildEventStepPipeline(1, events, 1)
    expect(pipe.branch).toBe('event_step')
    expect(pipe.nodes.length).toBe(3)
    expect(pipe.nodes[1].label).toBe('Tool Call')
    expect(pipe.nodes[1].status).toBe('active')
  })
})

describe('buildAgentStepPipeline / buildSimScriptPipeline', () => {
  it('wrong choice truncates with wrong_choice branch', () => {
    const pipe = buildAgentStepPipeline({
      step: 1,
      situation: 'what next?',
      choiceLabel: 'A',
      choiceText: 'final without work',
      correct: false,
      feedback: 'must inspect first',
    })
    expect(pipe.branch).toBe('wrong_choice')
    expect(pipe.nodes.map((n) => n.id)).toEqual(['context', 'intent', 'halt'])
    expect(pipe.nodes.find((n) => n.id === 'intent')?.status).toBe('error')
  })

  it('correct tool builds react_step with observation', () => {
    const pipe = buildAgentStepPipeline({
      step: 2,
      situation: 'read file',
      choiceLabel: 'B',
      choiceText: 'read_file',
      correct: true,
      feedback: 'good',
      tool: 'read_file',
      toolArgs: { path: 'calc.py' },
      toolResult: '1: def add',
    })
    expect(pipe.branch).toBe('react_step')
    expect(pipe.nodes.map((n) => n.id)).toContain('observation')
  })

  it('correct final builds final_path', () => {
    const pipe = buildAgentStepPipeline({
      step: 4,
      situation: 'done?',
      choiceLabel: 'B',
      choiceText: 'final',
      correct: true,
      feedback: 'complete',
      tool: null,
      assistantText: 'done',
    })
    expect(pipe.branch).toBe('final_path')
    expect(pipe.nodes.map((n) => n.id)).toContain('completion')
  })

  it('sim script maps tool step', () => {
    const pipe = buildSimScriptPipeline({
      step: 1,
      user: 'list',
      assistant: 'looking',
      tool: 'list_files',
      toolArgs: '{"path":"."}',
      toolResult: 'calc.py',
    })
    expect(pipe.branch).toBe('react_step')
    expect(pipe.stepIndex).toBe(1)
  })
})
