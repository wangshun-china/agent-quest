import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const c: LevelConfig = {
  id: '4.1-observability',
  zone: 4,
  order: 1,
  title: '可观测性 Trace 与 Replay',
  description: '只读步进 event_log.jsonl，定位决策',
  type: 'debug',
  component: lazy(() => import('./Level')),
  requiresLevels: ['3.5-completion'],
  references: [
    { title: 'OpenHands', url: 'https://arxiv.org/abs/2407.16741', source: 'arXiv 2024' },
  ],
}
export default c
