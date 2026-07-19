import type { ToolSpecLite } from './types'

/**
 * Subset of labs/local-agent-python/tools.py TOOL_REGISTRY.
 * effects + risk mirror the lab ToolSpec used by RuntimePolicy.
 */
export const TOOL_REGISTRY: Record<string, ToolSpecLite> = {
  list_files: {
    name: 'list_files',
    risk: 'safe',
    effects: ['inspect'],
    description: 'List files under the workspace.',
  },
  read_file: {
    name: 'read_file',
    risk: 'safe',
    effects: ['inspect'],
    description: 'Read a UTF-8 text file under the workspace.',
  },
  find_files: {
    name: 'find_files',
    risk: 'safe',
    effects: ['inspect'],
    description: 'Find files by path substring.',
  },
  search_text: {
    name: 'search_text',
    risk: 'safe',
    effects: ['inspect'],
    description: 'Search file contents.',
  },
  inspect_repo: {
    name: 'inspect_repo',
    risk: 'safe',
    effects: ['inspect'],
    description: 'Build repo map.',
  },
  rank_repo_context: {
    name: 'rank_repo_context',
    risk: 'safe',
    effects: ['inspect'],
    description: 'Rank files for a task.',
  },
  write_file: {
    name: 'write_file',
    risk: 'medium',
    effects: ['edit'],
    description: 'Create or overwrite a file.',
  },
  replace_text: {
    name: 'replace_text',
    risk: 'medium',
    effects: ['edit'],
    description: 'Replace one unique text block.',
  },
  apply_patch: {
    name: 'apply_patch',
    risk: 'medium',
    effects: ['edit'],
    description: 'Apply unified diff patch.',
  },
  update_plan: {
    name: 'update_plan',
    risk: 'safe',
    effects: ['plan'],
    description: 'Update task plan.',
  },
  run_command: {
    name: 'run_command',
    risk: 'high',
    effects: ['execute'],
    description: 'Run program + args with shell=False.',
  },
  delegate_readonly_task: {
    name: 'delegate_readonly_task',
    risk: 'safe',
    effects: ['execute'],
    description: 'Delegate readonly sub-agent task.',
  },
}

export function requireTool(name: string): ToolSpecLite {
  const spec = TOOL_REGISTRY[name]
  if (!spec) {
    throw Object.assign(new Error(`Unknown tool: ${name}`), { code: 'unknown_tool' })
  }
  return spec
}

export function toolHasEffect(name: string, effect: string): boolean {
  const spec = TOOL_REGISTRY[name]
  return !!spec && (spec.effects as readonly string[]).includes(effect)
}

/** Extract edit target paths (write_file / replace_text path; apply_patch simplified). */
export function editTargetsForTool(
  name: string,
  args: Record<string, unknown>,
): { path: string }[] {
  if (name === 'write_file' || name === 'replace_text') {
    const path = args.path
    if (typeof path !== 'string' || !path) {
      throw Object.assign(new Error('path is required'), { code: 'invalid_arguments' })
    }
    return [{ path }]
  }
  if (name === 'apply_patch') {
    const patch = String(args.patch || '')
    const paths = new Set<string>()
    for (const line of patch.split('\n')) {
      const m = line.match(/^\+\+\+\s+(\S+)/) || line.match(/^---\s+(\S+)/)
      if (m && m[1] !== '/dev/null') {
        paths.add(m[1].replace(/^[ab]\//, ''))
      }
    }
    return Array.from(paths).map((path) => ({ path }))
  }
  return []
}
