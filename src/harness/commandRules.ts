import type { CommandRuleViolation } from './types'

/** Mirrors labs/local-agent-python/command_registry.py COMMAND_REGISTRY */
const COMMAND_REGISTRY: Record<string, { inline_code_flags: Set<string> }> = {
  python: { inline_code_flags: new Set(['-c']) },
  node: { inline_code_flags: new Set(['-e', '--eval', '-p', '--print']) },
  npm: { inline_code_flags: new Set() },
}

export function allowedPrograms(): string[] {
  return Object.keys(COMMAND_REGISTRY)
}

/**
 * check_command_rules — lab program+args validation (shell=False boundary).
 * Returns null when OK.
 */
export function checkCommandRules(arguments_: Record<string, unknown>): CommandRuleViolation | null {
  const program = arguments_.program
  const args = arguments_.args
  const spec = typeof program === 'string' ? COMMAND_REGISTRY[program] : undefined
  if (spec === undefined) {
    return {
      code: 'program_not_allowed',
      reason: `Program is not allowed: ${program}`,
    }
  }
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string')) {
    return {
      code: 'invalid_command_arguments',
      reason: 'Command args must be an array of strings.',
    }
  }
  if (args.some((arg) => spec.inline_code_flags.has(arg as string))) {
    return {
      code: 'inline_code_not_allowed',
      reason: `Inline code execution is not allowed for ${program}. Use a workspace file or module.`,
    }
  }
  if ((args as string[]).some(hasUnsafePath)) {
    return {
      code: 'command_path_outside_workspace',
      reason: 'Command arguments must not contain absolute paths or parent-directory traversal.',
    }
  }
  if ((args as string[]).some((arg) => arg.includes('\0') || arg.includes('\n') || arg.includes('\r'))) {
    return {
      code: 'invalid_command_arguments',
      reason: 'Command arguments must not contain NUL or newline characters.',
    }
  }
  return null
}

export function renderCommand(program: string, args: string[]): string {
  return [program, ...args.map(quoteForDisplay)].join(' ').trim()
}

export function renderCommandArguments(arguments_: Record<string, unknown>): string {
  const program = arguments_.program
  const args = arguments_.args
  if (typeof program !== 'string' || !Array.isArray(args)) return ''
  if (args.some((a) => typeof a !== 'string')) return ''
  return renderCommand(program, args as string[])
}

function hasUnsafePath(argument: string): boolean {
  const candidate = argument.includes('=') ? argument.split('=').slice(1).join('=') : argument
  const normalized = candidate.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  if (segments.includes('..')) return true
  // Absolute POSIX or Windows paths
  if (candidate.startsWith('/') || /^[A-Za-z]:[\\/]/.test(candidate)) return true
  return false
}

function quoteForDisplay(arg: string): string {
  if (/[\s"]/.test(arg)) return `"${arg.replace(/"/g, '\\"')}"`
  return arg
}
