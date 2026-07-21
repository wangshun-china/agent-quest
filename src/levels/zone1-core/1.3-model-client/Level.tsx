import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_1_3_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_3_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '1.3-model-client',
  title: 'ModelClient 消息协议',
  levelNumber: '1.3',
  concept: LEVEL_1_3_CONCEPT,
  quiz: LEVEL_1_3_QUIZ,
  focusTitle: '请求边界与消息快照',
  focusBody: '每次发送都会构造 messages + tools。观察 assistant tool_calls 与 role=tool 回传。',
  suggestedPrompt: '读取 calc.py 并说明协议里 tool 消息如何关联 call_id',
})
