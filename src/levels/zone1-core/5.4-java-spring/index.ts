import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '5.4-java-spring',
  zone: 5,
  order: 4,
  title: 'Java/Spring Agent 映射',
  description: 'Harness 思想跨栈映射',
  type: 'concept',
  component: lazy(() => import('./Level')),
  requiresLevels: ['5.3-routing'],
  references: [],
}
export default c
