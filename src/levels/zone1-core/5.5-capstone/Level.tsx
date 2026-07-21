import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_5_5_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_5_5_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '5.5-capstone',
  title: '毕业设计：完整 Agent 调试',
  levelNumber: '5.5',
  concept: LEVEL_5_5_CONCEPT,
  quiz: LEVEL_5_5_QUIZ,
  focusTitle: '端到端闭环',
  focusBody: '完整跑通：探索→计划→编辑→验证→final。解释每次 allow/ask/deny。',
  suggestedPrompt:
    '为 calc.py 添加 multiply(a,b)=a*b，验证 multiply(3,4)==12，最后总结证据与 policy 路径',
})
