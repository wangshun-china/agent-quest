import { create } from 'zustand'

export interface ContextSnap {
  step: number;
  totalMessages: number;
  messageBreakdown: { system: number; user: number; assistant: number; tool: number };
  inputTokens: number;
  outputTokens: number;
  usableTokens: number;
  contextWindow: number;
  usageRatio: number;
  compacted: boolean;
  omittedGroups: number;
  // Full message summary for this step
  messageSummary: string[];
}

export interface MemoryEntry {
  id: string;
  type: 'retrieval' | 'observation' | 'file_state' | 'working_update';
  content: string;
  timestamp: number;
}

interface CMState {
  contextSnaps: ContextSnap[];
  memoryEntries: MemoryEntry[];
  // Pre-run memory retrieval
  retrievedMemory: string | null;

  pushContext: (snap: ContextSnap) => void;
  pushMemory: (entry: MemoryEntry) => void;
  setRetrievedMemory: (content: string | null) => void;
  reset: () => void;
}

let _memId = 0

export const useContextMemoryStore = create<CMState>()((set) => ({
  contextSnaps: [],
  memoryEntries: [],
  retrievedMemory: null,

  pushContext: (snap) => set((s) => ({
    contextSnaps: [...s.contextSnaps, snap],
  })),

  pushMemory: (entry) => {
    entry.id = `mem-${++_memId}`
    entry.timestamp = Date.now()
    set((s) => ({ memoryEntries: [...s.memoryEntries, entry] }))
  },

  setRetrievedMemory: (content) => set({ retrievedMemory: content }),

  reset: () => { _memId = 0; set({ contextSnaps: [], memoryEntries: [], retrievedMemory: null }) },
}))