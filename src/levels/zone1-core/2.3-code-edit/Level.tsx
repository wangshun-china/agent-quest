import { useState } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import TransparentPipeline from '../../../components/pipeline/TransparentPipeline'
import Button from '../../../components/ui/Button'
import { useProgressStore } from '../../../store/progressStore'
import { LEVEL_2_3_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_3_QUIZ } from '../../../data/quizQuestions'
import {
  WORKSPACE_PROFILE,
  buildEditPipeline,
  checkTool,
  emptyPipeline,
  emptyPolicyState,
  makeFingerprint,
  observeFile,
  type FileFingerprint,
  type GlassPipeline,
  type PolicyAgentState,
  type PolicyDecision,
} from '../../../harness'

type LogItem = { action: string; decision: PolicyDecision | null; detail: string }

const INITIAL_CONTENT = 'def add(a, b):\n    return a + b\n'

export default function Level() {
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const [content, setContent] = useState(INITIAL_CONTENT)
  const [mtime, setMtime] = useState(1_000_000)
  // inspected=true but empty observedFiles: first edit on existing calc.py hits
  // path-level read_before_edit_required (not the coarser inspect_before_edit).
  // Lab: coding loop may already have inspected something else, yet still deny
  // edits until this path was observed.
  const [state, setState] = useState<PolicyAgentState>(() =>
    emptyPolicyState({ codingGuardsEnabled: true, inspected: true }),
  )
  const [log, setLog] = useState<LogItem[]>([])
  const [last, setLast] = useState<PolicyDecision | null>(null)
  const [glass, setGlass] = useState<GlassPipeline>(() =>
    emptyPipeline('按「1→2→3」操作：右侧透明管道会展示 fingerprint 对比与 Policy 截断/放行'),
  )
  const [sawReadBeforeEdit, setSawReadBeforeEdit] = useState(false)
  const [sawEditAsk, setSawEditAsk] = useState(false)
  const [sawChanged, setSawChanged] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)

  const currentFp = (): FileFingerprint =>
    makeFingerprint('calc.py', content, mtime)

  const workspace = () => ({ 'calc.py': currentFp() })

  const push = (
    action: string,
    decision: PolicyDecision | null,
    detail: string,
    glassPipe: GlassPipeline,
  ) => {
    if (decision) setLast(decision)
    setGlass(glassPipe)
    setLog((L) => [...L, { action, decision, detail }])
    if (decision?.code === 'read_before_edit_required') setSawReadBeforeEdit(true)
    if (decision?.code === 'workspace_write_requires_approval') setSawEditAsk(true)
    if (decision?.code === 'file_changed_since_read') setSawChanged(true)
  }

  const tryEdit = () => {
    const args = {
      path: 'calc.py',
      old: 'return a + b',
      new: 'return a * b',
    }
    const fp = currentFp()
    const decision = checkTool(
      { name: 'replace_text', arguments: args },
      state,
      WORKSPACE_PROFILE,
      workspace(),
    )
    const observed = state.observedFiles['calc.py'] || null
    push(
      'replace_text calc.py',
      decision,
      decision.reason,
      buildEditPipeline({
        action: 'replace_text',
        toolName: 'replace_text',
        args,
        profile: WORKSPACE_PROFILE,
        state,
        decision,
        currentFingerprint: fp,
        observedFingerprint: observed,
        detail: decision.reason,
      }),
    )
  }

  const doRead = () => {
    const fp = currentFp()
    const next = observeFile(state, fp)
    setState(next)
    const decision = checkTool(
      { name: 'read_file', arguments: { path: 'calc.py' } },
      next,
      WORKSPACE_PROFILE,
    )
    const detail = `观察到 fingerprint size=${fp.size} mtime_ns=${fp.mtime_ns} sha1=${fp.sha1.slice(0, 8)}…`
    push(
      'read_file calc.py',
      decision,
      detail,
      buildEditPipeline({
        action: 'read_file',
        toolName: 'read_file',
        args: { path: 'calc.py' },
        profile: WORKSPACE_PROFILE,
        state: next,
        decision,
        currentFingerprint: fp,
        observedFingerprint: fp,
        detail,
      }),
    )
  }

  const externalChange = () => {
    const nextContent = content + '# external change\n'
    setContent(nextContent)
    setMtime((m) => m + 1_000)
    const newFp = makeFingerprint('calc.py', nextContent, mtime + 1_000)
    const detail = 'size/mtime/sha1 变化。若仍用旧 observation 编辑 → file_changed_since_read'
    push(
      '外部改动 calc.py',
      null,
      detail,
      buildEditPipeline({
        action: 'external_mutate',
        toolName: 'replace_text',
        args: {},
        profile: WORKSPACE_PROFILE,
        state,
        decision: null,
        currentFingerprint: newFp,
        observedFingerprint: state.observedFiles['calc.py'] || null,
        detail,
      }),
    )
  }

  const tryWriteNew = () => {
    const args = { path: 'brand_new.py', content: 'x=1\n' }
    const st = { ...state, inspected: true }
    const decision = checkTool(
      { name: 'write_file', arguments: args },
      st,
      WORKSPACE_PROFILE,
      { 'brand_new.py': null },
    )
    push(
      'write_file brand_new.py (新建)',
      decision,
      decision.reason,
      buildEditPipeline({
        action: 'write_file_new',
        toolName: 'write_file',
        args,
        profile: WORKSPACE_PROFILE,
        state: st,
        decision,
        currentFingerprint: null,
        observedFingerprint: null,
        detail: decision.reason,
      }),
    )
  }

  const canPass = sawReadBeforeEdit && sawEditAsk

  return (
    <LevelLayout
      title="代码编辑与 Patch"
      levelNumber="2.3"
      mode="replay"
      conceptCard={<ConceptCard {...LEVEL_2_3_CONCEPT} />}
      simulation={
        <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
            <h2 className="text-lg font-semibold mb-1">read-before-edit 工作台</h2>
            <p className="text-sm text-[#6B6B6B] mb-3">
              初始：coding loop 已 inspect 过（inspected=true），但 <strong>calc.py 尚未 path 观察</strong>。
              对已有文件：未观察 → <code className="text-xs">read_before_edit_required</code>
              ；观察后文件变化 → <code className="text-xs">file_changed_since_read</code>
              ；新鲜观察一致 → 进入审批（ASK）。
            </p>

            <div className="bg-[#F8F8F8] rounded-lg p-3 font-mono text-xs mb-4 whitespace-pre">
              {content}
            </div>
            <div className="text-[11px] text-[#9B9B9B] mb-4 font-mono">
              observed paths: {Object.keys(state.observedFiles).join(', ') || '(none)'} · inspected=
              {String(state.inspected)}
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <Button size="sm" onClick={tryEdit}>
                1. 直接 replace_text（应失败）
              </Button>
              <Button size="sm" variant="secondary" onClick={doRead}>
                2. read_file 观察
              </Button>
              <Button size="sm" onClick={tryEdit}>
                3. 再次 replace_text（应 ASK）
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={externalChange}>
                模拟外部改文件
              </Button>
              <Button size="sm" variant="secondary" onClick={tryEdit}>
                用旧观察再编辑
              </Button>
              <Button size="sm" variant="ghost" onClick={tryWriteNew}>
                新建 brand_new.py
              </Button>
            </div>
          </div>

          {last && (
            <div
              className={`rounded-xl border p-4 text-sm font-mono ${
                last.outcome === 'deny'
                  ? 'bg-[#FEF2F2] border-[#D23B3B]/30'
                  : last.outcome === 'ask'
                    ? 'bg-[#FFF8EB] border-[#D48C20]/30'
                    : 'bg-[#F0F9F2] border-[#2DA44E]/30'
              }`}
            >
              <div>
                {last.outcome} / {last.code}
              </div>
              <div className="text-xs mt-1 opacity-90">{last.reason}</div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
            <p className="text-xs text-[#9B9B9B] mb-2">
              过关：触发 read_before_edit_required，再在新鲜观察后得到 workspace_write_requires_approval
            </p>
            <div className="flex gap-3 text-sm mb-2">
              <span className={sawReadBeforeEdit ? 'text-[#CF222E]' : 'text-[#9B9B9B]'}>
                {sawReadBeforeEdit ? '✓' : '○'} read_before_edit_required
              </span>
              <span className={sawEditAsk ? 'text-[#9A6700]' : 'text-[#9B9B9B]'}>
                {sawEditAsk ? '✓' : '○'} edit ASK
              </span>
              <span className={sawChanged ? 'text-[#6B6B6B]' : 'text-[#D0D0D0]'}>
                {sawChanged ? '✓' : '○'} file_changed（可选）
              </span>
            </div>
            <ul className="text-xs space-y-1 max-h-36 overflow-y-auto text-[#6B6B6B]">
              {log.map((item, i) => (
                <li key={i}>
                  <span className="font-medium text-[#1A1A1A]">{item.action}</span>
                  {item.decision && (
                    <span className="font-mono"> → {item.decision.code}</span>
                  )}
                  <span className="block text-[10px]">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {canPass && !quizOpen && !passed && (
            <div className="bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4 flex justify-between">
              <span className="text-sm">编辑安全路径已走通</span>
              <Button size="sm" onClick={() => setQuizOpen(true)}>
                开始答题
              </Button>
            </div>
          )}

          {quizOpen && !passed && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
              <p className="text-sm mb-3">{LEVEL_2_3_QUIZ.question}</p>
              <div className="space-y-1.5 mb-3">
                {LEVEL_2_3_QUIZ.options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                      selected === i ? 'border-[#5E6AD2] bg-[#5E6AD2]/5' : 'border-[#E5E5E5]'
                    }`}
                  >
                    {o.label}) {o.text}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                disabled={selected === null}
                onClick={() => {
                  if (selected === LEVEL_2_3_QUIZ.correctIndex) {
                    setPassed(true)
                    completeLevel('2.3-code-edit', 'replay')
                  }
                }}
              >
                提交
              </Button>
            </div>
          )}

          {passed && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl border border-[#2DA44E]/30 p-6 text-center"
            >
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-xs text-left bg-[#F0F9F2] rounded-lg p-3 mb-3">
                {LEVEL_2_3_QUIZ.explanation}
              </p>
              <Button size="sm" onClick={() => { window.location.href = '/' }}>
                返回地图
              </Button>
            </motion.div>
          )}
        </div>
      }
      pipeline={<TransparentPipeline pipeline={glass} preferExpandId="policy" />}
    />
  )
}
