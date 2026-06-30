import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const config: LevelConfig = {
  id: '1.4-function-calling',
  zone: 1,
  order: 4,
  title: 'Function Calling 结构化工具调用',
  description: 'ToolSpec → schema → tool_calls → role=tool',
  type: 'config',
  component: lazy(() => import('./FunctionCallingLevel')),
  requiresLevels: ['1.3-model-client'],
  references: [
    { title: 'OpenAI Function Calling', url: 'https://platform.openai.com/docs/guides/function-calling', source: 'OpenAI' },
    { title: 'MCP Architecture', url: 'https://modelcontextprotocol.io/docs/learn/architecture', source: 'MCP' },
  ],
}

export default config