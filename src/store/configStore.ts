import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConfigState {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  defaultMode: 'live' | 'replay';
  setApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setDefaultMode: (mode: 'live' | 'replay') => void;
  isConfigured: () => boolean;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      // DashScope OpenAI-compatible; in `npm run dev` browser calls are rewritten to /llm-proxy/*
      apiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen3.6-27b',
      defaultMode: 'live',
      setApiKey: (apiKey) => set({ apiKey }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
      setModel: (model) => set({ model }),
      setDefaultMode: (defaultMode) => set({ defaultMode }),
      isConfigured: () => get().apiKey.length > 0,
    }),
    { name: 'agent-quest-config' }
  )
)