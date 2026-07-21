import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_5_3_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_5_3_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '5.3-routing',
  title: '模型抽象与路由',
  levelNumber: '5.3',
  concept: LEVEL_5_3_CONCEPT,
  quiz: LEVEL_5_3_QUIZ,
  focusTitle: 'ModelClient 边界',
  focusBody: '右上角可换 model；协议层不变，路由是客户端策略。',
  suggestedPrompt: '用当前模型 read calc.py 并解释 add 函数',
})
