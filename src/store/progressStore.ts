import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LevelResult {
  completedAt: number;
  mode: string;
  attempts: number;
}

interface ProgressState {
  completedLevels: string[];
  levelResults: Record<string, LevelResult>;
  completeLevel: (levelId: string, mode: string) => void;
  isCompleted: (levelId: string) => boolean;
  reset: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedLevels: [],
      levelResults: {},
      completeLevel: (levelId, mode) => {
        const prev = get().levelResults[levelId];
        set((s) => ({
          completedLevels: s.completedLevels.includes(levelId)
            ? s.completedLevels
            : [...s.completedLevels, levelId],
          levelResults: {
            ...s.levelResults,
            [levelId]: {
              completedAt: Date.now(),
              mode,
              attempts: prev ? prev.attempts + 1 : 1,
            },
          },
        }));
      },
      isCompleted: (levelId) => get().completedLevels.includes(levelId),
      reset: () => set({ completedLevels: [], levelResults: {} }),
    }),
    { name: 'agent-quest-progress' }
  )
)