import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_5_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_5_1_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '5.1-multi-agent',
  title: 'Multi-Agent 编排',
  levelNumber: '5.1',
  concept: LEVEL_5_1_CONCEPT,
  quiz: LEVEL_5_1_QUIZ,
  focusTitle: '受控委派',
  focusBody: '可让模型调用 delegate_readonly_task；子任务结果作为 observation 回到主循环。',
  suggestedPrompt: 'delegate_readonly_task 探索 workspace，再基于结果总结',
})
