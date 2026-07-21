import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_PROFILE,
  READ_ONLY_PROFILE,
  checkTool,
  createWorkspace,
  emptyPolicyState,
  observeFile,
  openaiTools,
} from './index'

describe('live agent tool surface', () => {
  it('exposes registry tools to the model schema', () => {
    const tools = openaiTools()
    const names = tools.map((t) => t.function.name)
    expect(names).toContain('read_file')
    expect(names).toContain('run_command')
    expect(names).toContain('replace_text')
  })

  it('workspace seed has calc.py fingerprint for read-before-edit', () => {
    const ws = createWorkspace()
    expect(ws.files['calc.py']).toContain('def add')
    expect(ws.fingerprints['calc.py']?.path).toBe('calc.py')
  })

  it('live path: edit without read is denied; after observe becomes ask', () => {
    const ws = createWorkspace()
    const map = { 'calc.py': ws.fingerprints['calc.py'] }
    let state = emptyPolicyState({ inspected: true })
    const denied = checkTool(
      { name: 'replace_text', arguments: { path: 'calc.py', old: 'a', new: 'b' } },
      state,
      WORKSPACE_PROFILE,
      map,
    )
    expect(denied.code).toBe('read_before_edit_required')

    state = observeFile(state, ws.fingerprints['calc.py'])
    const ask = checkTool(
      { name: 'replace_text', arguments: { path: 'calc.py', old: 'a', new: 'b' } },
      state,
      WORKSPACE_PROFILE,
      map,
    )
    expect(ask.outcome).toBe('ask')
    expect(ask.code).toBe('workspace_write_requires_approval')
  })

  it('read-only profile denies write in live path', () => {
    const ws = createWorkspace()
    let state = emptyPolicyState({ inspected: true })
    state = observeFile(state, ws.fingerprints['calc.py'])
    const d = checkTool(
      { name: 'write_file', arguments: { path: 'calc.py', content: 'x' } },
      state,
      READ_ONLY_PROFILE,
      { 'calc.py': ws.fingerprints['calc.py'] },
    )
    expect(d.code).toBe('workspace_write_not_allowed')
  })
})
