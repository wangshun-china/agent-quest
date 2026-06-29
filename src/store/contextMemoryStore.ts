import { create } from 'zustand'

export interface ContextSnapshot {
  totalMessages: number;
  systemTokens: number;
  userTokens: number;
  assistantTokens: number;
  toolResultTokens: number;
  totalTokens: number;
  contextWindow: number;
  usagePercent: number;
  compacted: boolean;
}

export interface MemoryEntry {
  id: string;
  type: 'observation' | 'file_state' | 'repo_fact' | 'working';
  content: string;
  timestamp: number;
}

interface ContextMemoryState {
  // Context
  contextHistory: ContextSnapshot[];

  // Memory
  memoryEntries: MemoryEntry[];

  // Actions
  pushContext: (snap: ContextSnapshot) => void;
  pushMemory: (entry: MemoryEntry) => void;
  reset: () => void;
}

let _memId = 0

export const useContextMemoryStore = create<ContextMemoryState>()((set) => ({
  contextHistory: [],
  memoryEntries: [],

  pushContext: (snap) => set((s) => ({
    contextHistory: [...s.contextHistory, snap],
  })),

  pushMemory: (entry) => {
    entry.id = `mem-${++_memId}`
    entry.timestamp = Date.now()
    set((s) => ({
      memoryEntries: [...s.memoryEntries, entry],
    }))
  },

  reset: () => { _memId = 0; set({ contextHistory: [], memoryEntries: [] }) },
}))