import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const config: LevelConfig = {
  id: '1.3-model-client',
  zone: 1,
  order: 3,
  title: 'ModelClient 消息协议',
  description: 'SSE Streaming、规范化响应、错误重试',
  type: 'config',
  component: lazy(() => import('./Level')),
  requiresLevels: ['1.2-react-loop'],
  references: [
    { title: 'OpenAI Streaming', url: 'https://platform.openai.com/docs/api-reference/streaming', source: 'OpenAI' },
    { title: 'MCP Architecture', url: 'https://modelcontextprotocol.io/docs/learn/architecture', source: 'MCP' },
  ],
}

export default config