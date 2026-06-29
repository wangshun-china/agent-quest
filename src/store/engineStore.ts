import { create } from 'zustand'
import type { StepTrace } from '../types'

type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';
type RunMode = 'live' | 'replay';

interface EngineState {
  mode: RunMode;
  status: RunStatus;
  steps: StepTrace[];
  currentStepIndex: number;
  playbackSpeed: number;
  expandedNodeId: string | null;

  setMode: (mode: RunMode) => void;
  setStatus: (status: RunStatus) => void;
  loadSteps: (steps: StepTrace[]) => void;
  setCurrentStepIndex: (index: number) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  setPlaybackSpeed: (speed: number) => void;
  expandNode: (nodeId: string | null) => void;
  reset: () => void;
}

export const useEngineStore = create<EngineState>()((set, get) => ({
  mode: 'replay',
  status: 'idle',
  steps: [],
  currentStepIndex: 0,
  playbackSpeed: 1,
  expandedNodeId: null,

  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  loadSteps: (steps) => set({ steps, currentStepIndex: 0, status: 'paused' }),
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
  goToNextStep: () => {
    const { currentStepIndex, steps } = get()
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    } else {
      set({ status: 'completed' })
    }
  },
  goToPrevStep: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  expandNode: (nodeId) => set({ expandedNodeId: nodeId }),
  reset: () => set({
    status: 'idle',
    steps: [],
    currentStepIndex: 0,
    expandedNodeId: null,
  }),
}))