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
  currentReplayStep: number;

  addEvent: (event: TraceEvent) => void;
  clearEvents: () => void;
  startReplay: () => void;
  exitReplay: () => void;
  setReplayStep: (i: number) => void;
}

let _eventId = 0

export function createTraceEvent(
  type: TraceEvent['type'],
  label: string,
  data: Record<string, unknown>,
  detail?: string,
): TraceEvent {
  return { id: `evt-${++_eventId}`, timestamp: Date.now(), type, label, data, detail }
}

export const useTraceStore = create<TraceState>()((set, get) => ({
  events: [],
  replayMode: false,
  replaySteps: [],
  currentReplayStep: 0,

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

  clearEvents: () => { _eventId = 0; set({ events: [], replayMode: false, replaySteps: [], currentReplayStep: 0 }) },

  startReplay: () => {
    const events = get().events
    const steps: TraceEvent[][] = []
    let current: TraceEvent[] = []
    for (const evt of events) {
      if ((evt.type === 'user_message' || evt.type === 'model_request') && current.length > 0 && evt.label.includes('Round 1')) {
        // New round-based grouping: model_request with "Round 1" starts a step
        // But for simplicity, group by user_message
      }
      // Group: each model_request starts a new step (except when it's context/system events at start)
      if (evt.type === 'model_request' && current.length > 0 && current.some(e => e.type === 'model_response')) {
        steps.push(current)
        current = []
      }
      current.push(evt)
    }
    if (current.length > 0) steps.push(current)
    set({ replayMode: true, replaySteps: steps, currentReplayStep: 0 })
  },

  exitReplay: () => set({ replayMode: false }),

  setReplayStep: (i) => set({ currentReplayStep: i }),
}))