import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '4.4-sandbox',
  zone: 4,
  order: 4,
  title: '生产级 Sandbox 隔离',
  description: 'Policy ≠ OS 隔离',
  type: 'concept',
  component: lazy(() => import('./Level')),
  requiresLevels: ['4.3-hitl'],
  references: [],
}
export default c
