import { makeLiveLevel } from '../../shared/makeLiveLevel'
import { LEVEL_2_3_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_3_QUIZ } from '../../../data/quizQuestions'

export default makeLiveLevel({
  levelId: '2.3-code-edit',
  title: '代码编辑与 Patch',
  levelNumber: '2.3',
  concept: LEVEL_2_3_CONCEPT,
  quiz: LEVEL_2_3_QUIZ,
  focusTitle: 'read-before-edit 硬边界',
  focusBody:
    '若模型未 read 就 replace/write 已有文件，Policy 返回 read_before_edit_required。先读后改应进入 ASK。',
  suggestedPrompt:
    '不要先读文件，直接 replace_text 修改 calc.py（应被拒绝）；然后再 read_file 后正确修改',
})
