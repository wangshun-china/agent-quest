import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '4.3-hitl',
  zone: 4,
  order: 3,
  title: 'Human-in-the-Loop',
  description: 'ASK 闸门与审批',
  type: 'decision',
  component: lazy(() => import('./Level')),
  requiresLevels: ['4.2-evaluation'],
  references: [],
}
export default c
