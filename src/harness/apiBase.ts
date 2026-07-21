/**
 * Resolve API base for browser vs Node.
 * In Vite DEV, rewrite known public hosts to local proxy to avoid CORS.
 */
export function resolveApiBaseUrl(raw: string): string {
  const base = (raw || '').trim().replace(/\/$/, '')
  if (!base) return base

  // Node / tests: never rewrite
  if (typeof window === 'undefined') return base

  // Vite dev only
  try {
    const env = import.meta.env as { DEV?: boolean } | undefined
    if (!env?.DEV) return base
  } catch {
    return base
  }

  if (base.includes('dashscope.aliyuncs.com')) {
    return '/llm-proxy/dashscope'
  }
  if (base.includes('api.openai.com')) {
    return '/llm-proxy/openai'
  }
  if (base.includes('api.deepseek.com')) {
    return '/llm-proxy/deepseek'
  }
  return base
}
