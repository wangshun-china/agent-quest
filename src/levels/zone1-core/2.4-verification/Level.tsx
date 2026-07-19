import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import TransparentPipeline from '../../../components/pipeline/TransparentPipeline'
import Button from '../../../components/ui/Button'
import { useProgressStore } from '../../../store/progressStore'
import { LEVEL_2_4_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_4_QUIZ } from '../../../data/quizQuestions'
import {
  RepairController,
  buildRepairPipeline,
  emptyPipeline,
  type GlassPipeline,
} from '../../../harness'

const VERIFY_ARGS = { program: 'python', args: ['-m', 'unittest', 'test_calc'] }
const FAIL_RESULT = {
  ok: true as const,
  result: {
    command: 'python -m unittest test_calc',
    returncode: 1,
    stdout: '',
    stderr: 'AssertionError: expected multiply(2,3)==6 got 5\n',
  },
}
const PASS_RESULT = {
  ok: true as const,
  result: {
    command: 'python -m unittest test_calc',
    returncode: 0,
    stdout: 'OK\n',
    stderr: '',
  },
}

type LogLine = { kind: 'ok' | 'block' | 'info'; text: string }

export default function Level() {
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const controller = useRef(new RepairController()).current
  const [, force] = useState(0)
  const [log, setLog] = useState<LogLine[]>([])
  const [sawBlock, setSawBlock] = useState(false)
  const [sawUnlock, setSawUnlock] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)
  const [lastHint, setLastHint] = useState('')
  const [glass, setGlass] = useState<GlassPipeline>(() =>
    emptyPipeline('先跑失败验证，再无进展重跑——右侧会显示 RepairController 如何截断管道'),
  )

  const tick = () => force((n) => n + 1)

  const snap = () => ({
    latest_failed_command: controller.latest_failed_command,
    latest_failure_fingerprint: controller.latest_failure_fingerprint
      ? `${controller.latest_failure_fingerprint.slice(0, 12)}…`
      : null,
    same_failure_count: controller.same_failure_count,
    new_evidence_since_failure: controller.new_evidence_since_failure,
    new_edit_since_failure: controller.new_edit_since_failure,
  })

  const append = (line: LogLine) => setLog((L) => [...L, line])

  const runVerify = (expectPass = false) => {
    const guard = controller.guardTool('run_command', VERIFY_ARGS)
    if (!guard.allowed) {
      setSawBlock(true)
      append({
        kind: 'block',
        text: `✕ guard_tool DENY code=${guard.code}\n${guard.reason}`,
      })
      setGlass(
        buildRepairPipeline({
          phase: 'guard',
          toolName: 'run_command',
          args: VERIFY_ARGS,
          guardAllowed: false,
          guardCode: guard.code,
          guardReason: guard.reason,
          controllerSnapshot: snap(),
        }),
      )
      tick()
      return
    }
    const msg = expectPass ? PASS_RESULT : FAIL_RESULT
    const obs = controller.recordToolResult('run_command', VERIFY_ARGS, msg)
    setLastHint(obs.repair_hint)
    if (expectPass) {
      append({ kind: 'ok', text: '✓ 验证通过 returncode=0 · 清除 failure state' })
      if (sawBlock) setSawUnlock(true)
      setGlass(
        buildRepairPipeline({
          phase: 'passed',
          toolName: 'run_command',
          args: VERIFY_ARGS,
          guardAllowed: true,
          guardCode: '',
          guardReason: '',
          controllerSnapshot: snap(),
          executeResult: msg.result,
        }),
      )
    } else {
      append({
        kind: 'info',
        text: `验证失败 returncode=1 · repair_hint（不暴露 fingerprint）:\n${obs.repair_hint}`,
      })
      setGlass(
        buildRepairPipeline({
          phase: 'failed',
          toolName: 'run_command',
          args: VERIFY_ARGS,
          guardAllowed: true,
          guardCode: '',
          guardReason: '',
          controllerSnapshot: snap(),
          repairHint: obs.repair_hint,
          executeResult: msg.result,
        }),
      )
    }
    tick()
  }

  const inspectProgress = () => {
    controller.recordToolResult(
      'read_file',
      { path: 'calc.py' },
      { ok: true, result: { path: 'calc.py' } },
    )
    append({
      kind: 'info',
      text: 'read_file 成功 → new_evidence_since_failure=true（inspect 可作进展）',
    })
    setGlass(
      buildRepairPipeline({
        phase: 'progress',
        toolName: 'read_file',
        args: { path: 'calc.py' },
        guardAllowed: true,
        guardCode: '',
        guardReason: '',
        controllerSnapshot: snap(),
      }),
    )
    tick()
  }

  const editProgress = () => {
    controller.recordToolResult(
      'replace_text',
      { path: 'calc.py', old: 'return a + b', new: 'return a * b' },
      { ok: true, result: { path: 'calc.py' } },
    )
    append({
      kind: 'info',
      text: 'replace_text 成功 → new_edit_since_failure=true',
    })
    setGlass(
      buildRepairPipeline({
        phase: 'progress',
        toolName: 'replace_text',
        args: { path: 'calc.py' },
        guardAllowed: true,
        guardCode: '',
        guardReason: '',
        controllerSnapshot: snap(),
      }),
    )
    tick()
  }

  const resetAll = () => {
    controller.latest_failure_fingerprint = null
    controller.latest_failed_command = null
    controller.same_failure_count = 0
    controller.new_evidence_since_failure = false
    controller.new_edit_since_failure = false
    setLog([])
    setSawBlock(false)
    setSawUnlock(false)
    setLastHint('')
    setGlass(emptyPipeline('控制器已重置'))
    setQuizOpen(false)
    setSelected(null)
    setPassed(false)
    tick()
  }

  const canPass = sawBlock && sawUnlock

  return (
    <LevelLayout
      title="验证反馈与自动修复"
      levelNumber="2.4"
      mode="replay"
      conceptCard={<ConceptCard {...LEVEL_2_4_CONCEPT} />}
      simulation={
        <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
            <h2 className="text-lg font-semibold mb-1">RepairController 闭环</h2>
            <p className="text-sm text-[#6B6B6B] mb-3">
              同一失败验证在无新证据、无新编辑时不能空转重跑 →{' '}
              <code className="text-xs">repair_requires_progress</code>。
              指纹只在本地；模型只看到 repair_hint。
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#F8F8F8] rounded-lg p-3 mb-4">
              <div>latest_failed_command</div>
              <div className="truncate">{controller.latest_failed_command || 'null'}</div>
              <div>same_failure_count</div>
              <div>{controller.same_failure_count}</div>
              <div>new_evidence</div>
              <div>{String(controller.new_evidence_since_failure)}</div>
              <div>new_edit</div>
              <div>{String(controller.new_edit_since_failure)}</div>
              <div>fingerprint</div>
              <div className="truncate">
                {controller.latest_failure_fingerprint
                  ? `${controller.latest_failure_fingerprint.slice(0, 12)}… (local only)`
                  : 'null'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <Button size="sm" onClick={() => runVerify(false)}>
                跑失败验证
              </Button>
              <Button size="sm" variant="secondary" onClick={() => runVerify(false)}>
                无进展再跑同一命令
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button size="sm" variant="secondary" onClick={inspectProgress}>
                inspect 进展 (read_file)
              </Button>
              <Button size="sm" variant="secondary" onClick={editProgress}>
                edit 进展 (replace_text)
              </Button>
              <Button size="sm" onClick={() => runVerify(true)}>
                有进展后验证通过
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={resetAll}>
              重置控制器
            </Button>
          </div>

          {lastHint && (
            <div className="bg-[#FFF8EB] border border-[#D48C20]/25 rounded-xl p-3 text-xs">
              <span className="font-semibold">repair_hint（给模型）: </span>
              {lastHint}
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
            <p className="text-xs text-[#9B9B9B] mb-2">
              过关：先触发 repair_requires_progress，再通过进展解锁并跑通
            </p>
            <div className="flex gap-3 text-sm mb-3">
              <span className={sawBlock ? 'text-[#CF222E]' : 'text-[#9B9B9B]'}>
                {sawBlock ? '✓' : '○'} 空转被拦
              </span>
              <span className={sawUnlock ? 'text-[#1A7F37]' : 'text-[#9B9B9B]'}>
                {sawUnlock ? '✓' : '○'} 进展后解锁
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {log.map((line, i) => (
                <div
                  key={i}
                  className={`text-xs rounded-lg p-2 whitespace-pre-wrap ${
                    line.kind === 'block'
                      ? 'bg-[#FEF2F2] text-[#CF222E]'
                      : line.kind === 'ok'
                        ? 'bg-[#F0F9F2] text-[#1A7F37]'
                        : 'bg-[#F8F8F8] text-[#6B6B6B]'
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>

          {canPass && !quizOpen && !passed && (
            <div className="bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4 flex justify-between">
              <span className="text-sm">修复闭环已验证</span>
              <Button size="sm" onClick={() => setQuizOpen(true)}>
                开始答题
              </Button>
            </div>
          )}

          {quizOpen && !passed && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
              <p className="text-sm mb-3">{LEVEL_2_4_QUIZ.question}</p>
              <div className="space-y-1.5 mb-3">
                {LEVEL_2_4_QUIZ.options.map((o, i) => (
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
                  if (selected === LEVEL_2_4_QUIZ.correctIndex) {
                    setPassed(true)
                    completeLevel('2.4-verification', 'replay')
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
                {LEVEL_2_4_QUIZ.explanation}
              </p>
              <Button size="sm" onClick={() => { window.location.href = '/' }}>
                返回地图
              </Button>
            </motion.div>
          )}
        </div>
      }
      pipeline={<TransparentPipeline pipeline={glass} preferExpandId="repair_guard" />}
    />
  )
}
