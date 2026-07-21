import type { LevelConfig } from './types'
import l11 from './zone1-core/1.1-boundary/index'
import l12 from './zone1-core/1.2-react-loop/index'
import l13 from './zone1-core/1.3-model-client/index'
import l14 from './zone1-core/1.4-function-calling/index'
import l21 from './zone1-core/2.1-tool-registry/index'
import l22 from './zone1-core/2.2-runtime-policy/index'
import l23 from './zone1-core/2.3-code-edit/index'
import l24 from './zone1-core/2.4-verification/index'
import l31 from './zone1-core/3.1-context-engineering/index'
import l32 from './zone1-core/3.2-planning/index'
import l33 from './zone1-core/3.3-project-explore/index'
import l34 from './zone1-core/3.4-memory/index'
import l35 from './zone1-core/3.5-completion/index'
import l41 from './zone1-core/4.1-observability/index'
import l42 from './zone1-core/4.2-evaluation/index'
import l43 from './zone1-core/4.3-hitl/index'
import l44 from './zone1-core/4.4-sandbox/index'
import l51 from './zone1-core/5.1-multi-agent/index'
import l52 from './zone1-core/5.2-mcp/index'
import l53 from './zone1-core/5.3-routing/index'
import l54 from './zone1-core/5.4-java-spring/index'
import l55 from './zone1-core/5.5-capstone/index'

export const LEVEL_REGISTRY: LevelConfig[] = [
  l11, l12, l13, l14,
  l21, l22, l23, l24,
  l31, l32, l33, l34, l35,
  l41, l42, l43, l44,
  l51, l52, l53, l54, l55,
]
