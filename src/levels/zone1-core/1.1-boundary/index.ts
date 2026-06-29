import { lazy } from 'react'
import type { LevelConfig } from '../../types'

const config: LevelConfig = {
  id: '1.1-boundary',
  zone: 1,
  order: 1,
  title: 'Agent vs Harness 边界',
  description: '理解大脑与身体的分工',
  type: 'concept',
  component: lazy(() => import('./BoundaryLevel')),
  requiresLevels: [],
  references: [
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', source: 'Anthropic' },
    { title: 'SWE-agent: ACI', url: 'https://arxiv.org/abs/2405.15793', source: 'NeurIPS 2024' },
    { title: 'OpenHands', url: 'https://arxiv.org/abs/2407.16741', source: 'arXiv 2024' },
    { title: 'Codex security', url: 'https://developers.openai.com/codex/agent-approvals-security', source: 'OpenAI' },
  ],
  tracePath: '/traces/1.1-create-calc',
}

export default config