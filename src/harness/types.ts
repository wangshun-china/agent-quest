/** Faithful subset of lab ToolSpec / policy types (local-agent-python). */

export type ToolEffect = 'inspect' | 'edit' | 'execute' | 'plan' | 'mcp_config' | 'external'
export type ToolRisk = 'safe' | 'medium' | 'high' | 'none' | 'unknown'

export type PolicyOutcome = 'allow' | 'ask' | 'deny'

export interface PermissionProfile {
  name: string
  allow_read: boolean
  allow_workspace_write: boolean
  allow_command: boolean
  allow_network: boolean
}

export interface ToolSpecLite {
  name: string
  risk: ToolRisk
  effects: readonly ToolEffect[]
  description: string
}

export interface ToolCallLite {
  name: string
  arguments: Record<string, unknown>
}

/** path / size / mtime_ns / sha1 — matches tools.workspace_file_fingerprint */
export interface FileFingerprint {
  path: string
  size: number
  mtime_ns: number
  sha1: string
}

export interface PolicyAgentState {
  /** path → fingerprint of last successful inspect observation */
  observedFiles: Record<string, FileFingerprint>
  codingGuardsEnabled: boolean
  /** any successful inspect (lab: state.inspected) */
  inspected: boolean
  /** last tool call signature for repeated_tool_call */
  lastToolCallKey?: string | null
}

export interface PolicyDecision {
  outcome: PolicyOutcome
  code: string
  reason: string
  risk: string
  capability: string
}

export interface CommandRuleViolation {
  code: string
  reason: string
}

export interface RepairGuardDecision {
  allowed: boolean
  code: string
  reason: string
}

export interface RepairObservation {
  repair_hint: string
}
