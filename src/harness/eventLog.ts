/**
 * Parse lab-style event_log.jsonl for observability replay (theme card 1.14).
 * Replay is read-only reconstruction — not re-calling the model.
 */

export interface EventLogEntry {
  type: string
  step?: number
  timestamp?: string
  run_id?: string
  name?: string
  content?: string
  arguments?: Record<string, unknown>
  decision?: Record<string, unknown>
  result?: unknown
  response?: string
  messages?: unknown[]
  preview?: unknown
  [key: string]: unknown
}

export function parseEventLogJsonl(text: string): EventLogEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as EventLogEntry)
}

export function summarizeEvent(entry: EventLogEntry): string {
  switch (entry.type) {
    case 'user_message':
      return `user: ${String(entry.content || '').slice(0, 120)}`
    case 'model_call':
      return `model_call step=${entry.step ?? '?'} response=${String(entry.response || '').slice(0, 80)}`
    case 'tool_call':
      return `tool_call ${entry.name} step=${entry.step ?? '?'}`
    case 'approval':
      return `approval ${entry.name} → ${JSON.stringify(entry.decision || {})}`
    case 'final':
      return `final: ${String(entry.content || '').slice(0, 120)}`
    default:
      return `${entry.type} step=${entry.step ?? '-'}`
  }
}

/** Group events by step for step-through UI. */
export function groupEventsByStep(events: EventLogEntry[]): Map<number, EventLogEntry[]> {
  const map = new Map<number, EventLogEntry[]>()
  for (const e of events) {
    const step = typeof e.step === 'number' ? e.step : 0
    if (!map.has(step)) map.set(step, [])
    map.get(step)!.push(e)
  }
  return map
}
