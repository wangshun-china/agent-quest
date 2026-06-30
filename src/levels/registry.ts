import type { LevelConfig } from './types'
import level1_1 from './zone1-core/1.1-boundary/index'
import level1_2 from './zone1-core/1.2-react-loop/index'
import level1_3 from './zone1-core/1.3-model-client/index'
import level1_4 from './zone1-core/1.4-function-calling/index'

export const LEVEL_REGISTRY: LevelConfig[] = [
  level1_1,
  level1_2,
  level1_3,
  level1_4,
]