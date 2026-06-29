import type { StepTrace, PipelineNodeData, Message, PolicyDecision, ToolResult } from '../types'

interface EventLogEntry {
  type: string;
  step: number;
  [key: string]: unknown;
}

interface ModelCallEntry {
  step: number;
  messages: Message[];
  response: string;
  metadata: {
    finish_reason: string;
    response_id: string;
    model: string;
    tool_calls?: {
      call_id: string;
      name: string;
      arguments: Record<string, unknown>;
    }[];
    usage?: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  };
}

const MAX_STEPS = 20

export async function loadTrace(tracePath: string): Promise<StepTrace[]> {
  const base = tracePath

  const [eventRes, modelRes] = await Promise.all([
    fetch(`${base}/event_log.jsonl`),
    fetch(`${base}/model_call_log.jsonl`),
  ])

  const eventText = await eventRes.text()
  const modelText = await modelRes.text()

  const events: EventLogEntry[] = eventText
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))

  const modelCalls: ModelCallEntry[] = modelText
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))

  const stepEvents = new Map<number, EventLogEntry[]>()
  for (const event of events) {
    const step = event.step || 0
    if (!stepEvents.has(step)) stepEvents.set(step, [])
    stepEvents.get(step)!.push(event)
  }

  const stepModels = new Map<number, ModelCallEntry>()
  for (const mc of modelCalls) {
    stepModels.set(mc.step, mc)
  }

  const traces: StepTrace[] = []
  const sortedSteps = Array.from(stepEvents.keys()).sort((a, b) => a - b)

  for (const step of sortedSteps) {
    const evts = stepEvents.get(step) || []
    const mc = stepModels.get(step)
    const trace = buildStepTrace(step, evts, mc)
    traces.push(trace)
  }

  return traces
}

function buildStepTrace(
  step: number,
  events: EventLogEntry[],
  modelCall?: ModelCallEntry
): StepTrace {
  const hasToolStart = events.some((e) => e.type === 'tool_start' || e.type === 'tool_call')
  const hasToolDone = events.some((e) => e.type === 'tool_done')
  const hasPolicyDeny = events.some(
    (e) => e.type === 'policy_decision' && e.outcome === 'deny'
  )
  const hasFinal = events.some((e) => e.type === 'final')

  let phase: StepTrace['phase'] = 'context'
  if (hasFinal) phase = 'final'
  else if (hasToolDone || hasPolicyDeny) phase = 'tool'
  else if (hasToolStart) phase = 'tool'
  else if (modelCall) phase = 'model'

  const pipeline: PipelineNodeData[] = []
  const hasDeny = hasPolicyDeny

  pipeline.push({ id: 'context', label: 'Context\nBuilder', type: 'harness', status: 'done' })
  pipeline.push({ id: 'model', label: 'Model\nRequest', type: 'model', status: 'done' })

  if (hasDeny) {
    pipeline.push({ id: 'policy', label: 'Policy\nCheck', type: 'harness', status: 'error' })
  } else if (phase === 'tool') {
    pipeline.push({ id: 'policy', label: 'Policy\nCheck', type: 'harness', status: 'done' })
    pipeline.push({ id: 'execute', label: 'Tool\nExecute', type: 'harness', status: 'done' })
    pipeline.push({ id: 'observation', label: 'Observation', type: 'harness', status: 'done' })
  } else if (phase === 'final') {
    pipeline.push({ id: 'completion', label: 'Completion', type: 'harness', status: 'done' })
  }

  if (pipeline.length > 0) {
    pipeline[pipeline.length - 1].status = 'active'
  }

  const policyEvent = events.find((e) => e.type === 'policy_decision')
  const policyDecision: PolicyDecision | undefined = policyEvent
    ? {
        outcome: (policyEvent.outcome as PolicyDecision['outcome']) || 'allow',
        code: (policyEvent.code as string) || '',
        reason: (policyEvent.reason as string) || '',
        risk: (policyEvent.risk as string) || 'unknown',
      }
    : undefined

  const toolDoneEvent = events.find((e) => e.type === 'tool_done')
  const toolResult: ToolResult | undefined = toolDoneEvent
    ? (toolDoneEvent.result as ToolResult)
    : undefined

  const finalEvent = events.find((e) => e.type === 'final')
  const finalCheck = finalEvent
    ? {
        status: 'success',
        reasonCode: 'completed',
        message: typeof finalEvent.content === 'string' ? finalEvent.content : '',
      }
    : undefined

  return {
    step,
    phase,
    pipeline,
    messagesBefore: modelCall?.messages,
    requestBody: modelCall
      ? {
          model: modelCall.metadata?.model || 'unknown',
          tool_choice: 'auto',
          message_count: modelCall.messages.length,
        }
      : undefined,
    responseContent: modelCall?.response,
    responseToolCalls: modelCall?.metadata?.tool_calls?.map((tc) => ({
      id: tc.call_id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    })),
    finishReason: modelCall?.metadata?.finish_reason,
    usageInput: modelCall?.metadata?.usage?.input_tokens,
    usageOutput: modelCall?.metadata?.usage?.output_tokens,
    policyDecision,
    toolResult,
    observationContent: toolResult ? JSON.stringify(toolResult) : undefined,
    finalCheck,
    timing: {
      total: events.reduce((sum, e) => sum + ((e.duration_ms as number) || 0), 0),
    },
    budget: {
      steps: step,
      max_steps: MAX_STEPS,
      model_calls: step,
      max_model_calls: MAX_STEPS + 1,
      tool_calls: phase === 'tool' ? step : Math.max(0, step - 1),
      max_tool_calls: MAX_STEPS * 2,
      input_tokens: modelCall?.metadata?.usage?.input_tokens || 0,
      output_tokens: modelCall?.metadata?.usage?.output_tokens || 0,
    },
  }
}