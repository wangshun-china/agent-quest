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

export const LEVEL_REGISTRY: LevelConfig[] = [
  l11, l12, l13, l14,
  l21, l22, l23, l24,
  l31, l32,
]