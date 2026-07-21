import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_3_5_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_3_5_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '3.5-completion',
  title: '完成条件与停止策略',
  levelNumber: '3.5',
  concept: LEVEL_3_5_CONCEPT,
  quiz: LEVEL_3_5_QUIZ,
  focusTitle: '何时允许 final',
  focusBody: '完成编辑后应验证；观察模型是否过早 final。',
  suggestedPrompt: '为 calc 添加 multiply(a,b)，运行验证后再说明完成',
})
