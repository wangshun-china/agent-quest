import { create } from 'zustand'

export interface TraceEvent {
  id: string;
  timestamp: number;
  type: 'system_context' | 'user_message' | 'tools_schema' | 'model_request' | 'model_response' | 'policy_check' | 'tool_execute' | 'observation' | 'context_update' | 'completion' | 'error';
  label: string;
  data: Record<string, unknown>;
  detail?: string;
}

interface TraceState {
  events: TraceEvent[];
  replayMode: boolean;
  replaySteps: TraceEvent[][];
  addEvent: (event: TraceEvent) => void;
  clearEvents: () => void;
  startReplay: () => void;
  exitReplay: () => void;
  reset: () => void;
}

let _eventId = 0

export function createTraceEvent(
  type: TraceEvent['type'],
  label: string,
  data: Record<string, unknown>,
  detail?: string,
): TraceEvent {
  return {
    id: `evt-${++_eventId}`,
    timestamp: Date.now(),
    type,
    label,
    data,
    detail,
  }
}

export const useTraceStore = create<TraceState>()((set, get) => ({
  events: [],
  replayMode: false,
  replaySteps: [],

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

  clearEvents: () => { _eventId = 0; set({ events: [], replayMode: false, replaySteps: [] }) },

  startReplay: () => {
    const events = get().events
    // Group events into steps: each "user_message" starts a new step
    const steps: TraceEvent[][] = []
    let current: TraceEvent[] = []
    for (const evt of events) {
      if (evt.type === 'user_message' && current.length > 0) {
        steps.push(current)
        current = []
      }
      current.push(evt)
    }
    if (current.length > 0) steps.push(current)
    set({ replayMode: true, replaySteps: steps })
  },

  exitReplay: () => set({ replayMode: false }),

  reset: () => { _eventId = 0; set({ events: [], replayMode: false, replaySteps: [] }) },
}))