import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_5_4_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_5_4_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '5.4-java-spring',
  title: 'Java/Spring Agent 映射',
  levelNumber: '5.4',
  concept: LEVEL_5_4_CONCEPT,
  quiz: LEVEL_5_4_QUIZ,
  focusTitle: '思想映射到 JVM',
  focusBody: '边跑 live 边对照：Policy≈拦截器，Trace≈可观测性。',
  suggestedPrompt: '完成小任务并指出哪一步对应 Policy / Tool / Observation',
})
