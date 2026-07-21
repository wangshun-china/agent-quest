import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_5_2_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_5_2_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '5.2-mcp',
  title: 'MCP 与工具生态',
  levelNumber: '5.2',
  concept: LEVEL_5_2_CONCEPT,
  quiz: LEVEL_5_2_QUIZ,
  focusTitle: '工具协议扩展面',
  focusBody: '本地 ToolRegistry 类比 MCP：任何远程工具也应变成 ToolSpec 再过 Policy。',
  suggestedPrompt: 'list_files 与 read_file，说明它们如何像 MCP tool 一样被模型调用',
})
