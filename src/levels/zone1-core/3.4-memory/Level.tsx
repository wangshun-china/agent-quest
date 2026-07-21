import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_3_4_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_3_4_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '3.4-memory',
  title: 'Memory 记忆架构',
  levelNumber: '3.4',
  concept: LEVEL_3_4_CONCEPT,
  quiz: LEVEL_3_4_QUIZ,
  focusTitle: '记忆 vs 规则边界',
  focusBody: '多轮对话中观察哪些应是 session memory、哪些是 harness 硬规则。',
  suggestedPrompt: '记住偏好：优先 replace_text。然后给 calc.py 加一行注释',
})
