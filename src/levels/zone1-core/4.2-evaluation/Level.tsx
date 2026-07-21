import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_4_2_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_4_2_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '4.2-evaluation',
  title: 'Evaluation 评测',
  levelNumber: '4.2',
  concept: LEVEL_4_2_CONCEPT,
  quiz: LEVEL_4_2_QUIZ,
  focusTitle: '可重复任务即 eval 种子',
  focusBody: '固定任务跑一遍，右侧管道与终态可当作一次 eval run 证据。',
  suggestedPrompt: '确认 calc.py 中 add(1,2)==3，给出简短证据',
})
