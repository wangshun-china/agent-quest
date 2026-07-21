import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LevelLayout from '../layout/LevelLayout'
import ConceptCard from '../concept/ConceptCard'
import TransparentPipeline from '../pipeline/TransparentPipeline'
import Button from '../ui/Button'
import { useConfigStore } from '../../store/configStore'
import { useProgressStore } from '../../store/progressStore'
import {
  READ_ONLY_PROFILE,
  WORKSPACE_PROFILE,
  buildConnectingPipeline,
  createWorkspace,
  emptyPipeline,
  resolveApiBaseUrl,
  runLiveAgentTurn,
  type ChatTurn,
  type GlassPipeline,
  type LiveWorkspace,
  type PermissionProfile,
} from '../../harness'
import type { QuizQuestion } from '../../data/quizQuestions'
import { getLevelTestSpec } from '../../data/levelTestPrompts'
import { getLevelGuide } from '../../data/levelGuides'
import LevelGuidePanel from './LevelGuidePanel'

type UiMsg = {
  role: 'user' | 'assistant'
  content: string
  kind?: 'text' | 'tool' | 'deny' | 'ask' | 'error'
}

export interface LiveGlassLevelProps {
  levelId: string
  title: string
  levelNumber: string
  concept: React.ComponentProps<typeof ConceptCard>
  quiz: QuizQuestion
  focusTitle: string
  focusBody: string
  suggestedPrompt?: string
  profileDefault?: 'workspace' | 'read-only'
  labPanel?: React.ReactNode
  defaultMode?: 'live' | 'replay'
}

export default function LiveGlassLevel({
  levelId,
  title,
  levelNumber,
  concept,
  quiz,
  focusTitle,
  focusBody,
  suggestedPrompt = 'list_files 查看 workspace，再 read_file calc.py',
  profileDefault = 'workspace',
  labPanel,
  defaultMode = 'live',
}: LiveGlassLevelProps) {
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const apiKey = useConfigStore((s) => s.apiKey)
  const apiBaseUrl = useConfigStore((s) => s.apiBaseUrl)
  const model = useConfigStore((s) => s.model)

  const [mode, setMode] = useState<'live' | 'replay'>(defaultMode)
  const [profileName, setProfileName] = useState<'workspace' | 'read-only'>(profileDefault)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('空闲 — 先读新手引导，再点一键发送')
  const [msgs, setMsgs] = useState<UiMsg[]>([])
  const [glass, setGlass] = useState<GlassPipeline>(() =>
    emptyPipeline('点「一键发送测试命令」后，这里会实时显示：等待模型 → Policy → 执行/截断'),
  )
  const [glassHistory, setGlassHistory] = useState<GlassPipeline[]>([])
  const [pendingApproval, setPendingApproval] = useState<{
    toolName: string
    args: Record<string, unknown>
    code: string
    reason: string
    resolve: (ok: boolean) => void
  } | null>(null)
  const [runStats, setRunStats] = useState({
    pipes: 0,
    tools: 0,
    asks: 0,
    denials: 0,
    ok: false,
    elapsedMs: 0,
  })
  const [quizOpen, setQuizOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)

  const historyRef = useRef<ChatTurn[]>([])
  const wsRef = useRef<LiveWorkspace>(createWorkspace())
  const endRef = useRef<HTMLDivElement>(null)
  const profileNameRef = useRef(profileName)
  const loadingRef = useRef(false)
  const runStartedAtRef = useRef(0)

  useEffect(() => {
    profileNameRef.current = profileName
  }, [profileName])

  // Tick elapsed while a live run is in flight so "瞬间结束" is obvious if faked
  useEffect(() => {
    if (!loading) return
    const id = window.setInterval(() => {
      if (!runStartedAtRef.current) return
      setRunStats((s) => ({
        ...s,
        elapsedMs: Date.now() - runStartedAtRef.current,
      }))
    }, 200)
    return () => window.clearInterval(id)
  }, [loading])

  const testSpec = getLevelTestSpec(levelId)
  const guide = getLevelGuide(levelId)
  const effectivePrompt = testSpec?.prompt || suggestedPrompt
  const effectiveExpect = testSpec?.expect || '观察右侧透明管道：ALLOW / ASK / DENY 与 tool observation。'
  const recommendedProfile = testSpec?.profile

  const resolvedBase = resolveApiBaseUrl(apiBaseUrl)

  const pushGlass = (p: GlassPipeline) => {
    // flushSync: force the right rail to paint each pipeline frame mid-await
    flushSync(() => {
      setGlass(p)
      setGlassHistory((h) => {
        const next = [...h, p]
        return next.length > 24 ? next.slice(-24) : next
      })
      setRunStats((s) => ({
        ...s,
        pipes: s.pipes + 1,
        asks: s.asks + (p.branch === 'ask_gate' ? 1 : 0),
        denials:
          s.denials +
          (p.branch === 'deny_truncated' || p.branch === 'repair_block' ? 1 : 0),
        elapsedMs: runStartedAtRef.current
          ? Date.now() - runStartedAtRef.current
          : s.elapsedMs,
      }))
    })
  }

  const send = async (textOverride?: string, forceProfile?: 'workspace' | 'read-only') => {
    const text = (textOverride ?? input).trim()
    if (!text) {
      setStatus('请先填入任务或点一键发送')
      return
    }
    if (!apiKey) {
      setStatus('未配置 API Key — 点右上角配置')
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: '❌ 未配置 API Key，无法调用大模型。请点右上角「配置 API」。', kind: 'error' },
      ])
      return
    }
    if (loadingRef.current) return

    const profileToUse: PermissionProfile =
      (forceProfile || profileNameRef.current) === 'read-only'
        ? READ_ONLY_PROFILE
        : WORKSPACE_PROFILE

    if (forceProfile) setProfileName(forceProfile)

    loadingRef.current = true
    runStartedAtRef.current = Date.now()
    flushSync(() => {
      setLoading(true)
      setInput('')
      setRunStats({ pipes: 0, tools: 0, asks: 0, denials: 0, ok: false, elapsedMs: 0 })
      setMsgs((m) => [...m, { role: 'user', content: text }])
      setStatus(`真实调用 ${model} @ ${resolvedBase} …（计时开始）`)
      setGlass(buildConnectingPipeline(model || 'model', resolvedBase || apiBaseUrl))
      setGlassHistory([])
    })

    try {
      const result = await runLiveAgentTurn({
        userText: text,
        history: historyRef.current,
        config: { apiKey, apiBaseUrl, model },
        profile: profileToUse,
        workspace: wsRef.current,
        maxRounds: 8,
        hooks: {
          onPipeline: pushGlass,
          onStatus: (t) => {
            flushSync(() => setStatus(t))
          },
          onAssistant: (content, meta) => {
            flushSync(() => {
              if (meta?.kind === 'tool') {
                setRunStats((s) => ({ ...s, tools: s.tools + 1 }))
              }
              setMsgs((m) => [
                ...m,
                { role: 'assistant', content, kind: meta?.kind || 'text' },
              ])
            })
            requestAnimationFrame(() =>
              endRef.current?.scrollIntoView({ behavior: 'smooth' }),
            )
          },
          requestApproval: ({ toolName, args, decision }) =>
            new Promise<boolean>((resolve) => {
              flushSync(() => {
                setPendingApproval({
                  toolName,
                  args,
                  code: decision.code,
                  reason: decision.reason,
                  resolve: (ok) => {
                    setPendingApproval(null)
                    setStatus(ok ? `已批准 ${toolName}，继续执行…` : `已拒绝 ${toolName}`)
                    resolve(ok)
                  },
                })
              })
            }),
        },
      })
      historyRef.current = result.history
      wsRef.current = result.workspace
      const totalMs = Date.now() - runStartedAtRef.current
      const apiFailed = result.history.some((h) => h.content?.startsWith('❌'))
      const ok = !apiFailed && result.pipelineSteps > 0
      setRunStats((s) => ({
        ...s,
        ok,
        pipes: Math.max(s.pipes, result.pipelineSteps),
        elapsedMs: totalMs,
      }))
      setStatus(
        ok
          ? `本轮真实结束：${totalMs}ms · 管道 ${result.pipelineSteps} 帧 · 可继续发消息或答题`
          : `本轮异常结束（${totalMs}ms）— 看聊天里的错误；右侧应有失败管道节点`,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const totalMs = Date.now() - runStartedAtRef.current
      setStatus(`异常（${totalMs}ms）: ${msg}`)
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: `❌ ${msg}`, kind: 'error' },
      ])
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  const bubbleClass = (m: UiMsg) => {
    if (m.role === 'user') return 'bg-[#5E6AD2] text-white'
    if (m.kind === 'deny' || m.kind === 'error')
      return 'bg-[#FEF2F2] border border-[#D23B3B]/25 text-[#4A1D1D]'
    if (m.kind === 'ask') return 'bg-[#FFF8EB] border border-[#D48C20]/30 text-[#5C3D00]'
    if (m.kind === 'tool') return 'bg-[#F0F9F2] border border-[#2DA44E]/20 text-[#1A3A24]'
    return 'bg-white border border-[#E4E7F4] text-[#1A1A1A]'
  }

  const resetLive = () => {
    historyRef.current = []
    wsRef.current = createWorkspace()
    setMsgs([])
    setRunStats({ pipes: 0, tools: 0, asks: 0, denials: 0, ok: false, elapsedMs: 0 })
    setQuizOpen(false)
    setPassed(false)
    setSelected(null)
    setPendingApproval(null)
    setStatus('已重置')
    setGlassHistory([])
    setGlass(emptyPipeline('会话已重置。重新点「一键发送测试命令」。'))
  }

  const canQuiz = runStats.ok && runStats.pipes >= 2 && runStats.elapsedMs >= 500 && !loading

  return (
    <LevelLayout
      title={title}
      levelNumber={levelNumber}
      mode={mode}
      onModeChange={setMode}
      conceptCard={<ConceptCard {...concept} />}
      simulation={
        <div className="flex flex-col h-full min-h-0 gap-3">
          {mode === 'replay' && labPanel ? (
            <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">{labPanel}</div>
          ) : (
            <>
              <div className="rounded-2xl border border-[#5E6AD2]/20 bg-gradient-to-r from-[#EEF0FF] via-white to-[#F7F8FC] px-4 py-3 shrink-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : runStats.ok ? 'bg-emerald-500' : 'bg-[#5E6AD2]'}`}
                      />
                      <span className="text-sm font-semibold font-display text-[#14141f]">
                        {focusTitle}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0c0e18] text-[#C4CBFF]">
                        Live · {model || '未设 model'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6B6F85] mt-1 leading-relaxed">{focusBody}</p>
                    <p className="text-[11px] font-mono text-[#5E6AD2] mt-1.5 break-all">
                      API: {resolvedBase || '(empty)'}
                      {resolvedBase.startsWith('/llm-proxy') ? ' ← 开发代理(防 CORS)' : ''}
                    </p>
                    <p className="text-[12px] text-[#3A3A4A] mt-1 font-medium">{status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-[#F0F1F8] rounded-xl p-0.5 border border-[#E4E7F4]">
                      {(['workspace', 'read-only'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          disabled={loading}
                          onClick={() => setProfileName(p)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg ${
                            profileName === p
                              ? 'bg-white shadow-sm font-semibold'
                              : 'text-[#8B8FA3]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" variant="ghost" onClick={resetLive} disabled={loading}>
                      重置
                    </Button>
                  </div>
                </div>
                {!apiKey && (
                  <p className="text-[12px] text-[#D23B3B] mt-2">
                    ⚠ 右上角配置 API Key / Base URL / Model（建议 qwen3.6-27b）。
                    Base 可填 DashScope 完整 URL，dev 下会自动走代理。
                  </p>
                )}
                {(runStats.pipes > 0 || loading || runStats.elapsedMs > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-[#0c0e18] text-[#C4CBFF] font-mono">
                      耗时 {(runStats.elapsedMs / 1000).toFixed(1)}s
                      {loading ? ' …' : ''}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EEF0FF] text-[#5E6AD2]">
                      管道帧 {runStats.pipes}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F0F9F2] text-[#1A7F37]">
                      工具 {runStats.tools}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FFF8EB] text-[#9A6700]">
                      ASK {runStats.asks}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#CF222E]">
                      DENY {runStats.denials}
                    </span>
                  </div>
                )}
              </div>

              <LevelGuidePanel
                guide={guide}
                testPrompt={effectivePrompt}
                testExpect={effectiveExpect}
                modelHint={model || 'qwen3.6-27b'}
                canRun={!!apiKey && !loading}
                loading={loading}
                defaultOpen={msgs.length === 0}
                onRun={() => {
                  void send(effectivePrompt, recommendedProfile)
                }}
                onCopy={() => {
                  void navigator.clipboard?.writeText(effectivePrompt)
                  setInput(effectivePrompt)
                }}
              />

              <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll space-y-2.5">
                {msgs.length === 0 && !loading && (
                  <p className="text-[12px] text-[#8B8FA3] text-center py-3">
                    点「一键发送」后：耗时会计秒、右侧会出现「等模型 / Policy」节点；真实 LLM 通常 2–15 秒，秒完且无节点=有问题。
                  </p>
                )}
                {msgs.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed shadow-sm ${bubbleClass(m)}`}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#E4E7F4] rounded-2xl px-4 py-3 text-[12px] text-[#5E6AD2]">
                      ⏳ {status}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <AnimatePresence>
                {pendingApproval && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-[#D48C20] bg-[#FFF8EB] p-4 shrink-0 shadow-lg"
                  >
                    <div className="text-sm font-bold text-[#5C3D00] mb-1">
                      ✋ 需要你审批（不会自动过）· {pendingApproval.code}
                    </div>
                    <p className="text-[12px] text-[#7A5A20] mb-2">{pendingApproval.reason}</p>
                    <pre className="text-[11px] font-mono bg-white/90 rounded-xl p-2 mb-3 overflow-x-auto border border-[#D48C20]/20 max-h-28">
                      {pendingApproval.toolName}
                      {'\n'}
                      {JSON.stringify(pendingApproval.args, null, 2)}
                    </pre>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => pendingApproval.resolve(true)}>
                        批准并继续
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => pendingApproval.resolve(false)}
                      >
                        拒绝
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {canQuiz && !quizOpen && !passed && (
                <div className="rounded-xl bg-[#F0F9F2] border border-[#2DA44E]/25 px-3 py-2 flex items-center justify-between shrink-0">
                  <span className="text-[12px] text-[#1A7F37]">
                    本轮真实跑完 · {(runStats.elapsedMs / 1000).toFixed(1)}s · 管道{' '}
                    {runStats.pipes} 帧
                  </span>
                  <Button size="sm" onClick={() => setQuizOpen(true)}>
                    答题过关
                  </Button>
                </div>
              )}

              {quizOpen && !passed && (
                <div className="rounded-2xl bg-white border border-[#E4E7F4] p-4 shrink-0">
                  <p className="text-sm mb-3">{quiz.question}</p>
                  <div className="space-y-1.5 mb-3">
                    {quiz.options.map((o, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelected(i)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-sm ${
                          selected === i
                            ? 'border-[#5E6AD2] bg-[#5E6AD2]/5'
                            : 'border-[#E4E7F4]'
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
                      if (selected === quiz.correctIndex) {
                        setPassed(true)
                        completeLevel(levelId, 'live')
                      }
                    }}
                  >
                    提交
                  </Button>
                </div>
              )}

              {passed && (
                <div className="rounded-2xl border border-[#2DA44E]/30 bg-white p-5 text-center shrink-0">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-xs text-left bg-[#F0F9F2] rounded-xl p-3 mb-3">
                    {quiz.explanation}
                  </p>
                  <Button size="sm" onClick={() => { window.location.href = '/' }}>
                    返回地图
                  </Button>
                </div>
              )}

              {!passed && (
                <div className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void send()
                      }
                    }}
                    disabled={loading || !apiKey || !!pendingApproval}
                    placeholder={apiKey ? '描述任务…' : '请先配置 API'}
                    className="flex-1 px-4 py-2.5 text-sm border border-[#E4E7F4] rounded-xl focus:outline-none focus:border-[#5E6AD2] focus:ring-2 focus:ring-[#5E6AD2]/15 disabled:bg-[#F5F5F8]"
                  />
                  <Button
                    onClick={() => void send()}
                    disabled={loading || !apiKey || !input.trim() || !!pendingApproval}
                  >
                    {loading ? '请求中…' : '发送'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      }
      pipeline={
        <TransparentPipeline
          pipeline={glass}
          history={glassHistory}
          onSelectHistory={(i) => setGlass(glassHistory[i])}
          preferExpandId={
            glass.nodes.some((n) => n.id === 'policy')
              ? 'policy'
              : glass.nodes.some((n) => n.id === 'model')
                ? 'model'
                : undefined
          }
          animateReveal={false}
        />
      }
    />
  )
}
