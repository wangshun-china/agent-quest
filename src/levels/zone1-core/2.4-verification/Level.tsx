import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_2_4_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_4_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '2.4-verification',
  title: '验证反馈与自动修复',
  levelNumber: '2.4',
  concept: LEVEL_2_4_CONCEPT,
  quiz: LEVEL_2_4_QUIZ,
  focusTitle: 'repair_requires_progress',
  focusBody:
    '失败验证后若无 inspect/edit 进展就重跑同一命令，会被 RepairController 拦截。',
  suggestedPrompt:
    '添加 multiply 但先写错实现，跑测试失败；不要改代码直接重跑测试；再 read 并修好后验证',
})
