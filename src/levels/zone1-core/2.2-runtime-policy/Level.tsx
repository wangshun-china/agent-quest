import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_2_2_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_2_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '2.2-runtime-policy',
  title: 'Runtime Policy 权限审批',
  levelNumber: '2.2',
  concept: LEVEL_2_2_CONCEPT,
  quiz: LEVEL_2_2_QUIZ,
  focusTitle: '唯一 allow/ask/deny 决策器',
  focusBody:
    '切换 workspace / read-only。inspect 应 ALLOW；write/run 在 workspace 为 ASK（需你批准）；read-only 下 write/run 为 DENY。右侧管道看稳定 code。',
  suggestedPrompt:
    '先 list_files，再尝试 write_file 写 note.txt，再 run_command python 验证。观察 allow/ask/deny',
})
