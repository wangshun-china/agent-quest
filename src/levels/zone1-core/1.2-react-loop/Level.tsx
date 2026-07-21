import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_1_2_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_2_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '1.2-react-loop',
  title: 'ReAct 最小循环',
  levelNumber: '1.2',
  concept: LEVEL_1_2_CONCEPT,
  quiz: LEVEL_1_2_QUIZ,
  focusTitle: 'ReAct 循环 — 大模型驱动',
  focusBody:
    '观察 action → observation → next action。点「一键发送测试命令」跑标准多步任务；写/执行会弹审批，点批准继续。',
})
