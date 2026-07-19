import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import TransparentPipeline from '../../../components/pipeline/TransparentPipeline'
import Button from '../../../components/ui/Button'
import { useProgressStore } from '../../../store/progressStore'
import { LEVEL_2_2_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_2_2_QUIZ } from '../../../data/quizQuestions'
import {
  READ_ONLY_PROFILE,
  WORKSPACE_PROFILE,
  buildPolicyPipeline,
  checkTool,
  emptyPipeline,
  emptyPolicyState,
  makeFingerprint,
  observeFile,
  type GlassPipeline,
  type PermissionProfile,
  type PolicyDecision,
  type PolicyAgentState,
} from '../../../harness'

type ScenarioId =
  | 'inspect'
  | 'write_existing'
  | 'run_python'
  | 'run_rm'
  | 'run_inline'
  | 'update_plan'

const SCENARIOS: {
  id: ScenarioId
  label: string
  tool: string
  args: Record<string, unknown>
  note: string
}[] = [
  {
    id: 'inspect',
    label: 'list_files (inspect)',
    tool: 'list_files',
    args: { path: '.' },
    note: 'effects=inspect → 读权限足够时 ALLOW',
  },
  {
    id: 'write_existing',
    label: 'replace_text 已有文件',
    tool: 'replace_text',
    args: { path: 'calc.py', old: 'a+b', new: 'a*b' },
    note: 'effects=edit → 写权限 + 读后编辑检查后 ASK',
  },
  {
    id: 'run_python',
    label: 'run_command python -m unittest',
    tool: 'run_command',
    args: { program: 'python', args: ['-m', 'unittest'] },
    note: 'effects=execute + 允许程序 → ASK（Approval 只处理 ask）',
  },
  {
    id: 'run_rm',
    label: 'run_command rm -rf /',
    tool: 'run_command',
    args: { program: 'rm', args: ['-rf', '/'] },
    note: 'program 不在 allowlist → DENY program_not_allowed',
  },
  {
    id: 'run_inline',
    label: 'run_command python -c ...',
    tool: 'run_command',
    args: { program: 'python', args: ['-c', 'print(1)'] },
    note: '内联代码被 command_registry 拒绝 → DENY inline_code_not_allowed',
  },
  {
    id: 'update_plan',
    label: 'update_plan',
    tool: 'update_plan',
    args: { goal: 'fix calc', steps: [] },
    note: 'effects=plan → ALLOW（不经 workspace 写审批）',
  },
]

const OUTCOME_STYLE: Record<string, string> = {
  allow: 'bg-[#F0F9F2] border-[#2DA44E]/30 text-[#1A7F37]',
  ask: 'bg-[#FFF8EB] border-[#D48C20]/30 text-[#9A6700]',
  deny: 'bg-[#FEF2F2] border-[#D23B3B]/30 text-[#CF222E]',
}

export default function Level() {
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const [profileName, setProfileName] = useState<'read-only' | 'workspace'>('workspace')
  const [scenarioId, setScenarioId] = useState<ScenarioId>('inspect')
  const [freshObserve, setFreshObserve] = useState(true)
  const [history, setHistory] = useState<{ label: string; decision: PolicyDecision }[]>([])
  const [last, setLast] = useState<PolicyDecision | null>(null)
  const [glass, setGlass] = useState<GlassPipeline>(() =>
    emptyPipeline('选择 Profile 与 tool call，点「执行」——右侧会出现透明管道，点节点看内部数据'),
  )
  const [quizOpen, setQuizOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)

  const profile: PermissionProfile =
    profileName === 'read-only' ? READ_ONLY_PROFILE : WORKSPACE_PROFILE

  const seen = useMemo(() => {
    const set = new Set(history.map((h) => h.decision.outcome))
    return {
      allow: set.has('allow'),
      ask: set.has('ask'),
      deny: set.has('deny'),
    }
  }, [history])

  const canPass = seen.allow && seen.ask && seen.deny

  const runCheck = () => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId)!
    const fp = makeFingerprint('calc.py', 'def add(a, b):\n    return a + b\n')
    let state: PolicyAgentState = emptyPolicyState({ codingGuardsEnabled: true })
    if (freshObserve) {
      state = observeFile(state, fp)
    } else {
      // still mark inspected for inspect_before_edit path only when needed
      state = { ...state, inspected: true }
    }
    const workspace =
      scenario.tool === 'write_file' || scenario.tool === 'replace_text'
        ? { 'calc.py': fp }
        : scenario.tool === 'write_file'
          ? { 'calc.py': fp }
          : { 'calc.py': fp }

    const decision = checkTool(
      { name: scenario.tool, arguments: scenario.args },
      state,
      profile,
      workspace,
    )
    setLast(decision)
    setGlass(
      buildPolicyPipeline({
        toolName: scenario.tool,
        args: scenario.args,
        profile,
        state,
        decision,
        workspaceSnapshot: workspace,
      }),
    )
    setHistory((h) => [
      ...h,
      {
        label: `${profile.name} · ${scenario.label}`,
        decision,
      },
    ])
  }

  return (
    <LevelLayout
      title="Runtime Policy 权限审批"
      levelNumber="2.2"
      mode="replay"
      conceptCard={<ConceptCard {...LEVEL_2_2_CONCEPT} />}
      simulation={
        <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">
              RuntimePolicy 实验台
            </h2>
            <p className="text-sm text-[#6B6B6B] mb-4">
              RuntimePolicy 是 <strong>allow / ask / deny</strong> 的唯一决策者。Approval 只处理 ask。
              切换 PermissionProfile 并触发不同 tool call，观察稳定 code。
            </p>

            <div className="mb-4">
              <p className="text-xs font-medium text-[#9B9B9B] mb-2">PermissionProfile</p>
              <div className="flex gap-2">
                {(['read-only', 'workspace'] as const).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setProfileName(name)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      profileName === name
                        ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 text-[#5E6AD2]'
                        : 'border-[#E5E5E5] text-[#6B6B6B]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <pre className="mt-2 text-[11px] bg-[#F8F8F8] rounded-lg p-3 font-mono text-[#6B6B6B]">
                {`read=${profile.allow_read} write=${profile.allow_workspace_write} command=${profile.allow_command} network=${profile.allow_network}`}
              </pre>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-[#9B9B9B] mb-2">模型意图（tool call）</p>
              <div className="grid grid-cols-1 gap-1.5">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScenarioId(s.id)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm ${
                      scenarioId === s.id
                        ? 'border-[#5E6AD2] bg-[#5E6AD2]/5'
                        : 'border-[#E5E5E5]'
                    }`}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="block text-[11px] text-[#9B9B9B] mt-0.5">{s.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#6B6B6B] mb-4">
              <input
                type="checkbox"
                checked={freshObserve}
                onChange={(e) => setFreshObserve(e.target.checked)}
              />
              已对 calc.py 做 path-level 新鲜观察（影响 edit 的 read_before_edit）
            </label>

            <Button onClick={runCheck}>执行 RuntimePolicy.check_tool()</Button>
          </div>

          {last && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-4 ${OUTCOME_STYLE[last.outcome]}`}
            >
              <div className="text-xs uppercase tracking-wide font-semibold mb-1">
                PolicyDecision
              </div>
              <div className="font-mono text-sm space-y-1">
                <div>
                  outcome: <strong>{last.outcome}</strong>
                </div>
                <div>code: {last.code}</div>
                <div>capability: {last.capability}</div>
                <div>risk: {last.risk}</div>
                <div className="text-xs mt-2 opacity-90">{last.reason}</div>
              </div>
            </motion.div>
          )}

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
            <p className="text-xs text-[#9B9B9B] mb-2">过关条件：至少各触发一次 allow / ask / deny</p>
            <div className="flex gap-3 text-sm mb-3">
              <span className={seen.allow ? 'text-[#1A7F37]' : 'text-[#9B9B9B]'}>
                {seen.allow ? '✓' : '○'} allow
              </span>
              <span className={seen.ask ? 'text-[#9A6700]' : 'text-[#9B9B9B]'}>
                {seen.ask ? '✓' : '○'} ask
              </span>
              <span className={seen.deny ? 'text-[#CF222E]' : 'text-[#9B9B9B]'}>
                {seen.deny ? '✓' : '○'} deny
              </span>
            </div>
            {history.length > 0 && (
              <ul className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto text-[#6B6B6B]">
                {history.map((h, i) => (
                  <li key={i}>
                    {h.label} → {h.decision.outcome}/{h.decision.code}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canPass && !quizOpen && !passed && (
            <div className="bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm">三种 outcome 均已观测</span>
              <Button size="sm" onClick={() => setQuizOpen(true)}>
                开始答题
              </Button>
            </div>
          )}

          {quizOpen && !passed && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
              <h3 className="text-sm font-semibold mb-3">过关测验</h3>
              <p className="text-sm mb-3">{LEVEL_2_2_QUIZ.question}</p>
              <div className="space-y-1.5 mb-3">
                {LEVEL_2_2_QUIZ.options.map((o, i) => (
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
                  if (selected === LEVEL_2_2_QUIZ.correctIndex) {
                    setPassed(true)
                    completeLevel('2.2-runtime-policy', 'replay')
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
              <h3 className="font-bold mb-2">过关</h3>
              <p className="text-xs text-left bg-[#F0F9F2] rounded-lg p-3 mb-3">
                {LEVEL_2_2_QUIZ.explanation}
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
