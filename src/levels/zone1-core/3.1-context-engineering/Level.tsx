import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_3_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_3_1_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '3.1-context-engineering',
  title: 'Context Engineering',
  levelNumber: '3.1',
  concept: LEVEL_3_1_CONCEPT,
  quiz: LEVEL_3_1_QUIZ,
  focusTitle: '上下文是有预算的组装',
  focusBody: '多轮 tool 后体会 messages 增长；右侧看每步 Context/Policy 数据。',
  suggestedPrompt: '先 list_files，再 read_file calc.py，总结项目结构',
})
