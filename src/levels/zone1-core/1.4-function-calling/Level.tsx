import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_1_4_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_4_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '1.4-function-calling',
  title: 'Function Calling 结构化工具调用',
  levelNumber: '1.4',
  concept: LEVEL_1_4_CONCEPT,
  quiz: LEVEL_1_4_QUIZ,
  focusTitle: '原生 tool_calls 协议',
  focusBody: 'tools 在请求顶层；结果用 role=tool + tool_call_id 回传，而不是伪造 user 消息。',
  suggestedPrompt: '调用 read_file 读取 calc.py，然后 final 总结你看到的内容',
})
