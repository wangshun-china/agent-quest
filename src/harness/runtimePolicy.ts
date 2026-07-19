import { checkCommandRules } from './commandRules'
import { editTargetsForTool, requireTool } from './tools'
import type {
  FileFingerprint,
  PermissionProfile,
  PolicyAgentState,
  PolicyDecision,
  ToolCallLite,
  ToolEffect,
} from './types'

/** labs/local-agent-python/runtime_policy.py profiles */
export const READ_ONLY_PROFILE: PermissionProfile = {
  name: 'read-only',
  allow_read: true,
  allow_workspace_write: false,
  allow_command: false,
  allow_network: false,
}

export const WORKSPACE_PROFILE: PermissionProfile = {
  name: 'workspace',
  allow_read: true,
  allow_workspace_write: true,
  allow_command: true,
  allow_network: false,
}

function allow(code: string, reason: string, risk: string, capability: string): PolicyDecision {
  return { outcome: 'allow', code, reason, risk, capability }
}
function ask(code: string, reason: string, risk: string, capability: string): PolicyDecision {
  return { outcome: 'ask', code, reason, risk, capability }
}
function deny(code: string, reason: string, risk: string, capability: string): PolicyDecision {
  return { outcome: 'deny', code, reason, risk, capability }
}

function capabilityFromEffects(effects: readonly ToolEffect[]): string {
  if (effects.includes('plan')) return 'plan'
  if (effects.includes('execute')) return 'command'
  if (effects.includes('edit')) return 'workspace_write'
  if (effects.includes('mcp_config')) return 'mcp_config'
  if (effects.includes('inspect')) return 'read'
  if (effects.includes('external')) return 'external'
  return 'unknown'
}

function toolCallKey(call: ToolCallLite): string {
  return `${call.name}:${JSON.stringify(call.arguments ?? {})}`
}

/**
 * RuntimePolicy.check_tool — sole allow/ask/deny decider (lab 1.6).
 * Approval is NOT consulted here; only ASK is returned for reviewer.
 */
export function checkTool(
  call: ToolCallLite,
  state: PolicyAgentState,
  profile: PermissionProfile = WORKSPACE_PROFILE,
  /** optional workspace truth: path → current fingerprint (null = new/missing file) */
  workspaceFiles: Record<string, FileFingerprint | null> = {},
): PolicyDecision {
  let spec
  try {
    spec = requireTool(call.name)
  } catch (e) {
    const err = e as Error & { code?: string }
    return deny(err.code || 'unknown_tool', err.message, 'unknown', 'unknown')
  }

  const effects = spec.effects
  const cap = capabilityFromEffects(effects)
  const risk = spec.risk

  if (state.lastToolCallKey && state.lastToolCallKey === toolCallKey(call)) {
    return deny(
      'repeated_tool_call',
      `Repeated tool call: ${call.name} with the same arguments. Change strategy.`,
      risk,
      cap,
    )
  }

  if (effects.includes('plan')) {
    return allow(
      'plan_update_allowed',
      'Plan state updates are allowed within the Harness.',
      risk,
      'plan',
    )
  }

  if (effects.includes('execute')) {
    if (!profile.allow_command) {
      return deny(
        'command_not_allowed',
        `Permission profile ${profile.name} does not allow commands.`,
        risk,
        'command',
      )
    }
    // Only structured run_command args go through command registry (lab path).
    if (call.name === 'run_command') {
      const violation = checkCommandRules(call.arguments || {})
      if (violation) {
        return deny(violation.code, violation.reason, risk, 'command')
      }
    }
    return ask(
      'command_requires_approval',
      'Command execution requires approval.',
      risk,
      'command',
    )
  }

  if (effects.includes('edit')) {
    if (!profile.allow_workspace_write) {
      return deny(
        'workspace_write_not_allowed',
        `Permission profile ${profile.name} does not allow workspace writes.`,
        risk,
        'workspace_write',
      )
    }
    if (state.codingGuardsEnabled && !state.inspected) {
      return deny(
        'inspect_before_edit',
        'Coding loop violation: inspect files before editing.',
        risk,
        'workspace_write',
      )
    }
    const targetDecision = checkEditTargets(call, state, risk, workspaceFiles)
    if (targetDecision) return targetDecision
    return ask(
      'workspace_write_requires_approval',
      'Workspace write requires approval.',
      risk,
      'workspace_write',
    )
  }

  if (effects.includes('inspect')) {
    if (!profile.allow_read) {
      return deny(
        'read_not_allowed',
        `Permission profile ${profile.name} does not allow reads.`,
        risk,
        'read',
      )
    }
    return allow('read_allowed', 'Read-only tool is allowed.', risk, 'read')
  }

  return deny(
    'unsupported_tool_capability',
    `Tool has no supported policy capability: ${call.name}`,
    risk,
    'unknown',
  )
}

/**
 * Path-level read-before-edit (lab _check_edit_targets + theme card 1.10).
 * Existing file with no observation → read_before_edit_required
 * Observed fingerprint ≠ current → file_changed_since_read
 * Missing file (null current) → skip (create allowed into ask path)
 */
export function checkEditTargets(
  call: ToolCallLite,
  state: PolicyAgentState,
  risk: string,
  workspaceFiles: Record<string, FileFingerprint | null>,
): PolicyDecision | null {
  let targets: { path: string }[]
  try {
    targets = editTargetsForTool(call.name, call.arguments || {})
  } catch (e) {
    const err = e as Error & { code?: string }
    return deny(err.code || 'invalid_arguments', err.message, risk, 'workspace_write')
  }

  for (const target of targets) {
    const path = target.path
    // Prefer explicit workspace map; if path not listed, treat as existing only if observed map needed
    const hasWorkspaceEntry = Object.prototype.hasOwnProperty.call(workspaceFiles, path)
    const current = hasWorkspaceEntry
      ? workspaceFiles[path]
      : // default: existing file with unknown fingerprint only if we mark as present via content
        null

    if (current === null || current === undefined) {
      // New file (or not present) — lab continues without deny
      continue
    }

    const observed = state.observedFiles[current.path]
    if (observed === undefined) {
      return deny(
        'read_before_edit_required',
        `Read the current contents of ${current.path} before editing it.`,
        risk,
        'workspace_write',
      )
    }
    if (
      observed.size !== current.size ||
      observed.mtime_ns !== current.mtime_ns ||
      observed.sha1 !== current.sha1 ||
      observed.path !== current.path
    ) {
      return deny(
        'file_changed_since_read',
        `${current.path} changed after it was observed. Read it again before editing.`,
        risk,
        'workspace_write',
      )
    }
  }
  return null
}

export function emptyPolicyState(overrides: Partial<PolicyAgentState> = {}): PolicyAgentState {
  return {
    observedFiles: {},
    codingGuardsEnabled: true,
    inspected: false,
    lastToolCallKey: null,
    ...overrides,
  }
}

/** Helper: record a successful inspect observation of a file (path-level). */
export function observeFile(
  state: PolicyAgentState,
  fingerprint: FileFingerprint,
): PolicyAgentState {
  return {
    ...state,
    inspected: true,
    observedFiles: {
      ...state.observedFiles,
      [fingerprint.path]: { ...fingerprint },
    },
  }
}

export function makeFingerprint(
  path: string,
  content: string,
  mtime_ns = 1_000_000,
): FileFingerprint {
  // Simple deterministic sha1 stand-in for browser: FNV-1a hex (not crypto-identical, tests use explicit sha1)
  let h = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const sha1 = ('00000000' + (h >>> 0).toString(16)).slice(-8).padStart(40, '0')
  return {
    path,
    size: content.length,
    mtime_ns,
    sha1,
  }
}
