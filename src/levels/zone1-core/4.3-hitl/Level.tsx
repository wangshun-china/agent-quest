import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_4_3_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_4_3_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '4.3-hitl',
  title: 'Human-in-the-Loop',
  levelNumber: '4.3',
  concept: LEVEL_4_3_CONCEPT,
  quiz: LEVEL_4_3_QUIZ,
  focusTitle: '只有 ASK 才审批',
  focusBody: '触发 write/run 时会出现 Approval 闸门；inspect 应直接放行。',
  suggestedPrompt: '读取 calc.py 后，用 replace_text 给文件加一行注释',
})
