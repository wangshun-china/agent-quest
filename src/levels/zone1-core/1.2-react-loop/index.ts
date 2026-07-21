import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const config: LevelConfig = {
  id: '1.2-react-loop',
  zone: 1,
  order: 2,
  title: 'ReAct 最小循环',
  description: 'action → observation → next action',
  type: 'decision',
  component: lazy(() => import('./Level')),
  requiresLevels: ['1.1-boundary'],
  references: [
    { title: 'ReAct', url: 'https://arxiv.org/abs/2210.03629', source: 'NeurIPS 2023' },
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', source: 'Anthropic' },
  ],
}

export default config