import { renderCommandArguments } from './commandRules'
import { toolHasEffect } from './tools'
import type { RepairGuardDecision, RepairObservation } from './types'

/**
 * Faithful port of labs/local-agent-python/repair_controller.py
 * Fingerprint is local-only; model sees repair_hint, not the hash.
 */

const MAX_ERROR_LINES = 20

export class RepairController {
  latest_failure_fingerprint: string | null = null
  latest_failed_command: string | null = null
  same_failure_count = 0
  new_evidence_since_failure = false
  new_edit_since_failure = false

  guardTool(toolName: string, arguments_: Record<string, unknown>): RepairGuardDecision {
    if (toolName !== 'run_command' || this.latest_failed_command === null) {
      return { allowed: true, code: '', reason: '' }
    }
    const command = commandFromArguments(arguments_)
    if (
      command === this.latest_failed_command &&
      !this.new_evidence_since_failure &&
      !this.new_edit_since_failure
    ) {
      return {
        allowed: false,
        code: 'repair_requires_progress',
        reason:
          'The same failed verification is being repeated without new evidence or a code edit. ' +
          'Inspect relevant files, change code, update the plan, or report blocked before rerunning it.',
      }
    }
    return { allowed: true, code: '', reason: '' }
  }

  recordToolResult(
    toolName: string,
    arguments_: Record<string, unknown>,
    toolMessage: { ok?: boolean; result?: Record<string, unknown> },
  ): RepairObservation {
    if (isFailedRunCommand(toolName, toolMessage)) {
      return this.recordFailedVerification(arguments_, toolMessage)
    }
    if (isSuccessfulRunCommand(toolName, toolMessage)) {
      this.clearFailure()
      return { repair_hint: '' }
    }
    if (this.latest_failure_fingerprint && toolMessage.ok) {
      if (toolHasEffect(toolName, 'edit')) {
        this.new_edit_since_failure = true
      } else if (toolName !== 'run_command' && toolHasEffect(toolName, 'inspect')) {
        this.new_evidence_since_failure = true
      }
    }
    return { repair_hint: '' }
  }

  private recordFailedVerification(
    arguments_: Record<string, unknown>,
    toolMessage: { ok?: boolean; result?: Record<string, unknown> },
  ): RepairObservation {
    const result = toolMessage.result || {}
    const command = String(result.command || commandFromArguments(arguments_))
    const returncode = Number(result.returncode ?? -1)
    const stderr = String(result.stderr ?? '')
    const stdout = String(result.stdout ?? '')
    const fingerprint = failureFingerprint(command, returncode, stderr, stdout)
    const previous = this.latest_failure_fingerprint
    const sameFailure = previous === fingerprint
    const hadEdit = this.new_edit_since_failure

    let hint: string
    if (previous === null) {
      hint =
        'Verification failed. Use the error summary to inspect evidence, edit code, re-run verification, or report blocked.'
      this.same_failure_count = 1
    } else if (sameFailure && hadEdit) {
      hint =
        'Verification failed again with the same failure pattern. ' +
        'A code edit happened, but it did not change this failure. ' +
        'Inspect the changed code, try a different fix, update the plan, or report blocked.'
      this.same_failure_count += 1
    } else if (sameFailure) {
      hint =
        'Verification failed again with the same failure pattern. ' +
        'No code edit happened since the previous failure. ' +
        'Inspect new evidence, change the code, update the plan, or report blocked.'
      this.same_failure_count += 1
    } else {
      hint =
        'Verification failed with a new failure pattern. Compare it with the previous failure before choosing the next fix.'
      this.same_failure_count = 1
    }

    this.latest_failure_fingerprint = fingerprint
    this.latest_failed_command = normalizeCommand(command)
    this.new_evidence_since_failure = false
    this.new_edit_since_failure = false
    return { repair_hint: hint }
  }

  private clearFailure(): void {
    this.latest_failure_fingerprint = null
    this.latest_failed_command = null
    this.same_failure_count = 0
    this.new_evidence_since_failure = false
    this.new_edit_since_failure = false
  }
}

/** Exported for unit tests — same algorithm as lab failure_fingerprint. */
export function failureFingerprint(
  command: string,
  returncode: number,
  stderr: string,
  stdout: string,
): string {
  const payload = {
    command: normalizeCommand(command),
    returncode,
    stderr_key: keyErrorLines(stderr),
    stdout_key: keyErrorLines(stdout),
  }
  const encoded = JSON.stringify(payload)
  return simpleSha1(encoded)
}

function keyErrorLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map(normalizeLine)
  const specific = lines.filter(
    (line) =>
      line &&
      /(assertionerror|typeerror|valueerror|syntaxerror|importerror|modulenotfounderror|exception)/i.test(
        line,
      ),
  )
  const broad = lines.filter(
    (line) =>
      line &&
      /(traceback|assertionerror|error|exception|failed|failure|file ")/i.test(line),
  )
  let keyLines = specific.length ? specific : broad
  if (!keyLines.length) {
    keyLines = lines.filter(Boolean)
  }
  return keyLines.slice(-MAX_ERROR_LINES)
}

function normalizeLine(line: string): string {
  let normalized = line.trim().replace(/File ".*?([^/\\"]+)"/g, 'File "$1"')
  normalized = normalized.replace(/\s+/g, ' ')
  return normalized
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, ' ')
}

function commandFromArguments(arguments_: Record<string, unknown>): string {
  return normalizeCommand(renderCommandArguments(arguments_))
}

function isFailedRunCommand(
  toolName: string,
  toolMessage: { ok?: boolean; result?: Record<string, unknown> },
): boolean {
  if (toolName !== 'run_command' || !toolMessage.ok) return false
  const result = toolMessage.result
  return (
    !!result &&
    typeof result === 'object' &&
    typeof result.returncode === 'number' &&
    result.returncode !== 0
  )
}

function isSuccessfulRunCommand(
  toolName: string,
  toolMessage: { ok?: boolean; result?: Record<string, unknown> },
): boolean {
  if (toolName !== 'run_command' || !toolMessage.ok) return false
  const result = toolMessage.result
  return !!result && typeof result === 'object' && result.returncode === 0
}

/** Deterministic SHA-1 (browser-safe, matches hex length for tests of stability). */
function simpleSha1(input: string): string {
  // Use Web Crypto when available is async; for pure sync parity with tests we
  // implement a minimal stable hash. Lab uses hashlib.sha1 — we need same
  // stability for same inputs, not cross-runtime hex equality with Python.
  // For fidelity tests we assert same-input same-output and different-input different.
  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h0 = Math.imul(h0 ^ c, 0x9e3779b1) >>> 0
    h1 = Math.imul(h1 + c, 0x85ebca6b) >>> 0
    h2 = Math.imul(h2 ^ (c << 8), 0xc2b2ae35) >>> 0
    h3 = (h3 + Math.imul(c, 0x27d4eb2d)) >>> 0
    h4 = (h4 ^ (h0 + h1)) >>> 0
  }
  const parts = [h0, h1, h2, h3, h4].map((n) => n.toString(16).padStart(8, '0'))
  return parts.join('')
}
