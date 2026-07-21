import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_4_4_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_4_4_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '4.4-sandbox',
  title: '生产级 Sandbox 隔离',
  levelNumber: '4.4',
  concept: LEVEL_4_4_CONCEPT,
  quiz: LEVEL_4_4_QUIZ,
  focusTitle: 'Policy 不是 Sandbox',
  focusBody: '切换 read-only profile，观察 command/write 被 DENY 的稳定 code。',
  suggestedPrompt: '在当前 profile 下尝试 list_files、write_file 与 run_command，对比 outcome',
  profileDefault: 'read-only',
})
