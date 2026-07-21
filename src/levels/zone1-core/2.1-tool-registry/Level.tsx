import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_2_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_1_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '2.1-tool-registry',
  title: 'Tool Registry 与 ACI',
  levelNumber: '2.1',
  concept: LEVEL_2_1_CONCEPT,
  quiz: LEVEL_2_1_QUIZ,
  focusTitle: 'ToolSpec 唯一来源',
  focusBody: '观察模型选工具时，右侧 Registry/Policy 如何解析 risk 与 effects。',
  suggestedPrompt: '列出 workspace 文件，再读取 calc.py',
})
