import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_1_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_1_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '1.1-boundary',
  title: 'Agent vs Harness 边界',
  levelNumber: '1.1',
  concept: LEVEL_1_1_CONCEPT,
  quiz: LEVEL_1_1_QUIZ,
  focusTitle: '大脑决策 vs 身体硬边界',
  focusBody:
    '模型选工具，Harness 做 Policy。用下方标准测试命令观察 ALLOW 的 inspect 路径。',
})
