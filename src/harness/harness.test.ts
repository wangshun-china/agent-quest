import { describe, expect, it } from 'vitest'
import { checkCommandRules } from './commandRules'
import {
  RepairController,
  failureFingerprint,
} from './repairController'
import {
  READ_ONLY_PROFILE,
  WORKSPACE_PROFILE,
  checkTool,
  emptyPolicyState,
  makeFingerprint,
  observeFile,
} from './runtimePolicy'
import { parseEventLogJsonl, summarizeEvent } from './eventLog'

describe('RuntimePolicy.checkTool (lab runtime_policy.py)', () => {
  it('allows inspect under workspace profile with code read_allowed', () => {
    const d = checkTool(
      { name: 'list_files', arguments: { path: '.' } },
      emptyPolicyState(),
      WORKSPACE_PROFILE,
    )
    expect(d.outcome).toBe('allow')
    expect(d.code).toBe('read_allowed')
    expect(d.capability).toBe('read')
  })

  it('asks for edit under workspace after inspect + fresh observation', () => {
    const fp = makeFingerprint('calc.py', 'def add(a,b): return a+b\n')
    let state = emptyPolicyState()
    state = observeFile(state, fp)
    const d = checkTool(
      { name: 'replace_text', arguments: { path: 'calc.py', old: 'a', new: 'b' } },
      state,
      WORKSPACE_PROFILE,
      { 'calc.py': fp },
    )
    expect(d.outcome).toBe('ask')
    expect(d.code).toBe('workspace_write_requires_approval')
  })

  it('denies workspace write under read-only profile', () => {
    const fp = makeFingerprint('calc.py', 'x')
    let state = emptyPolicyState()
    state = observeFile(state, fp)
    const d = checkTool(
      { name: 'write_file', arguments: { path: 'calc.py', content: 'y' } },
      state,
      READ_ONLY_PROFILE,
      { 'calc.py': fp },
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('workspace_write_not_allowed')
  })

  it('denies commands under read-only with command_not_allowed', () => {
    const d = checkTool(
      { name: 'run_command', arguments: { program: 'python', args: ['-m', 'unittest'] } },
      emptyPolicyState(),
      READ_ONLY_PROFILE,
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('command_not_allowed')
  })

  it('asks for allowed program under workspace (command_requires_approval)', () => {
    const d = checkTool(
      { name: 'run_command', arguments: { program: 'python', args: ['-m', 'unittest'] } },
      emptyPolicyState(),
      WORKSPACE_PROFILE,
    )
    expect(d.outcome).toBe('ask')
    expect(d.code).toBe('command_requires_approval')
  })

  it('denies unknown program with program_not_allowed', () => {
    const d = checkTool(
      { name: 'run_command', arguments: { program: 'rm', args: ['-rf', '/'] } },
      emptyPolicyState(),
      WORKSPACE_PROFILE,
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('program_not_allowed')
  })

  it('denies python -c inline code with inline_code_not_allowed', () => {
    const d = checkTool(
      {
        name: 'run_command',
        arguments: { program: 'python', args: ['-c', 'print(1)'] },
      },
      emptyPolicyState(),
      WORKSPACE_PROFILE,
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('inline_code_not_allowed')
  })

  it('denies unknown tool with unknown_tool', () => {
    const d = checkTool(
      { name: 'not_a_tool', arguments: {} },
      emptyPolicyState(),
      WORKSPACE_PROFILE,
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('unknown_tool')
  })
})

describe('read-before-edit (lab _check_edit_targets / theme 1.10)', () => {
  it('denies edit of existing file without observation: read_before_edit_required', () => {
    const fp = makeFingerprint('calc.py', 'def add(a, b):\n    return a + b\n')
    const state = emptyPolicyState({ inspected: true, codingGuardsEnabled: true })
    const d = checkTool(
      {
        name: 'replace_text',
        arguments: { path: 'calc.py', old: 'return a + b', new: 'return a * b' },
      },
      state,
      WORKSPACE_PROFILE,
      { 'calc.py': fp },
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('read_before_edit_required')
  })

  /**
   * Mirrors level 2.3 UI state machine (initial inspected=true, empty observedFiles):
   * 1) replace_text → read_before_edit_required
   * 2) observeFile → replace_text → workspace_write_requires_approval
   * Proves the shipped checkTool path the Level calls is reachable for canPass.
   */
  it('level 2.3 flow: read_before_edit_required then ASK after observe', () => {
    const content = 'def add(a, b):\n    return a + b\n'
    const fp = makeFingerprint('calc.py', content)
    const editCall = {
      name: 'replace_text',
      arguments: { path: 'calc.py', old: 'return a + b', new: 'return a * b' },
    }
    // Same initial state as Level.tsx
    let state = emptyPolicyState({ codingGuardsEnabled: true, inspected: true })
    const workspace = { 'calc.py': fp }

    const fail = checkTool(editCall, state, WORKSPACE_PROFILE, workspace)
    expect(fail.outcome).toBe('deny')
    expect(fail.code).toBe('read_before_edit_required')

    state = observeFile(state, fp)
    const ok = checkTool(editCall, state, WORKSPACE_PROFILE, workspace)
    expect(ok.outcome).toBe('ask')
    expect(ok.code).toBe('workspace_write_requires_approval')
  })

  it('level 2.3 would miss path deny if inspected=false (documents the guard order)', () => {
    const fp = makeFingerprint('calc.py', 'x')
    const d = checkTool(
      { name: 'replace_text', arguments: { path: 'calc.py', old: 'a', new: 'b' } },
      emptyPolicyState({ codingGuardsEnabled: true, inspected: false }),
      WORKSPACE_PROFILE,
      { 'calc.py': fp },
    )
    expect(d.code).toBe('inspect_before_edit')
  })

  it('allows ask path after fresh observe of same fingerprint', () => {
    const fp = makeFingerprint('calc.py', 'def add(a, b):\n    return a + b\n')
    let state = emptyPolicyState()
    state = observeFile(state, fp)
    const d = checkTool(
      {
        name: 'replace_text',
        arguments: { path: 'calc.py', old: 'return a + b', new: 'return a * b' },
      },
      state,
      WORKSPACE_PROFILE,
      { 'calc.py': fp },
    )
    expect(d.outcome).toBe('ask')
    expect(d.code).toBe('workspace_write_requires_approval')
  })

  it('denies when file changed since read: file_changed_since_read', () => {
    const fp1 = makeFingerprint('calc.py', 'v1', 100)
    const fp2 = makeFingerprint('calc.py', 'v2-changed', 200)
    let state = emptyPolicyState()
    state = observeFile(state, fp1)
    const d = checkTool(
      { name: 'write_file', arguments: { path: 'calc.py', content: 'new' } },
      state,
      WORKSPACE_PROFILE,
      { 'calc.py': fp2 },
    )
    expect(d.outcome).toBe('deny')
    expect(d.code).toBe('file_changed_since_read')
  })

  it('skips path check for new files (current fingerprint null)', () => {
    const state = emptyPolicyState({ inspected: true })
    const d = checkTool(
      { name: 'write_file', arguments: { path: 'new_mod.py', content: 'x=1\n' } },
      state,
      WORKSPACE_PROFILE,
      { 'new_mod.py': null },
    )
    expect(d.outcome).toBe('ask')
    expect(d.code).toBe('workspace_write_requires_approval')
  })
})

describe('RepairController (lab repair_controller.py)', () => {
  const failArgs = { program: 'python', args: ['-m', 'unittest'] }
  const failMessage = {
    ok: true,
    result: {
      command: 'python -m unittest',
      returncode: 1,
      stdout: '',
      stderr: 'AssertionError: expected 5 got 4\n',
    },
  }

  it('allows first run_command, then blocks same failed command without progress', () => {
    const rc = new RepairController()
    expect(rc.guardTool('run_command', failArgs).allowed).toBe(true)

    const obs = rc.recordToolResult('run_command', failArgs, failMessage)
    expect(obs.repair_hint).toContain('Verification failed')
    expect(rc.latest_failure_fingerprint).toBeTruthy()

    const blocked = rc.guardTool('run_command', failArgs)
    expect(blocked.allowed).toBe(false)
    expect(blocked.code).toBe('repair_requires_progress')
  })

  it('unlocks after inspect progress (new evidence)', () => {
    const rc = new RepairController()
    rc.recordToolResult('run_command', failArgs, failMessage)
    expect(rc.guardTool('run_command', failArgs).code).toBe('repair_requires_progress')

    rc.recordToolResult('read_file', { path: 'calc.py' }, {
      ok: true,
      result: { path: 'calc.py', content: '...' },
    })
    expect(rc.new_evidence_since_failure).toBe(true)

    const after = rc.guardTool('run_command', failArgs)
    expect(after.allowed).toBe(true)
  })

  it('unlocks after successful edit progress', () => {
    const rc = new RepairController()
    rc.recordToolResult('run_command', failArgs, failMessage)
    rc.recordToolResult(
      'replace_text',
      { path: 'calc.py', old: 'a', new: 'b' },
      { ok: true, result: { path: 'calc.py' } },
    )
    expect(rc.new_edit_since_failure).toBe(true)
    expect(rc.guardTool('run_command', failArgs).allowed).toBe(true)
  })

  it('failureFingerprint is stable for same inputs and changes with stderr', () => {
    const a = failureFingerprint('python -m unittest', 1, 'AssertionError: x', '')
    const b = failureFingerprint('python -m unittest', 1, 'AssertionError: x', '')
    const c = failureFingerprint('python -m unittest', 1, 'TypeError: y', '')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('commandRules', () => {
  it('rejects absolute path args', () => {
    const v = checkCommandRules({ program: 'python', args: ['/etc/passwd'] })
    expect(v?.code).toBe('command_path_outside_workspace')
  })
})

describe('eventLog parse', () => {
  it('parses jsonl and summarizes', () => {
    const text = [
      JSON.stringify({ type: 'user_message', step: 0, content: 'hello task' }),
      JSON.stringify({ type: 'tool_call', step: 1, name: 'write_file', result: { ok: true } }),
    ].join('\n')
    const events = parseEventLogJsonl(text)
    expect(events).toHaveLength(2)
    expect(summarizeEvent(events[0])).toContain('user:')
    expect(summarizeEvent(events[1])).toContain('write_file')
  })
})
