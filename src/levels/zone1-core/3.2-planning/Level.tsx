import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_3_2_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_3_2_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '3.2-planning',
  title: 'Planning 与 Plan-Execute',
  levelNumber: '3.2',
  concept: LEVEL_3_2_CONCEPT,
  quiz: LEVEL_3_2_QUIZ,
  focusTitle: '计划与执行分离',
  focusBody: '鼓励模型先 update_plan 再编辑；plan 工具走 plan 能力而非 workspace 写。',
  suggestedPrompt: '先 update_plan 规划为 calc 添加 multiply，再实现并验证',
})
