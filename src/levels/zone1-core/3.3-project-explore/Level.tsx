import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_3_3_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_3_3_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '3.3-project-explore',
  title: 'Coding Agent 项目探索',
  levelNumber: '3.3',
  concept: LEVEL_3_3_CONCEPT,
  quiz: LEVEL_3_3_QUIZ,
  focusTitle: 'RepoMap / 排名探索',
  focusBody: '让模型用 inspect_repo / rank_repo_context / search_text 定位文件。',
  suggestedPrompt: '用 inspect_repo 和 rank_repo_context 找到与计算器相关的文件',
})
