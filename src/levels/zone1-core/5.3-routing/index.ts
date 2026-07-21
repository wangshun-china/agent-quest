import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '5.3-routing',
  zone: 5,
  order: 3,
  title: '模型抽象与路由',
  description: '统一协议与路由策略',
  type: 'config',
  component: lazy(() => import('./Level')),
  requiresLevels: ['5.2-mcp'],
  references: [],
}
export default c
