import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '5.5-capstone',
  zone: 5,
  order: 5,
  title: '毕业设计：完整 Agent 调试',
  description: '端到端 harness 验收',
  type: 'debug',
  component: lazy(() => import('./Level')),
  requiresLevels: ['5.4-java-spring'],
  references: [],
}
export default c
