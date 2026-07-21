import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '5.2-mcp',
  zone: 5,
  order: 2,
  title: 'MCP 与工具生态',
  description: 'ToolSpec 适配远程工具',
  type: 'config',
  component: lazy(() => import('./Level')),
  requiresLevels: ['5.1-multi-agent'],
  references: [],
}
export default c
