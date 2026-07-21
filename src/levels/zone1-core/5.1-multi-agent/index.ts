import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '5.1-multi-agent',
  zone: 5,
  order: 1,
  title: 'Multi-Agent 编排',
  description: '受控子 Agent 委派',
  type: 'decision',
  component: lazy(() => import('./Level')),
  requiresLevels: ['4.4-sandbox'],
  references: [],
}
export default c
