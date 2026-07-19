import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import TransparentPipeline from '../../../components/pipeline/TransparentPipeline'
import Button from '../../../components/ui/Button'
import { useProgressStore } from '../../../store/progressStore'
import { LEVEL_4_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_4_1_QUIZ } from '../../../data/quizQuestions'
import {
  buildEventStepPipeline,
  emptyPipeline,
  groupEventsByStep,
  parseEventLogJsonl,
  summarizeEvent,
  type EventLogEntry,
  type GlassPipeline,
} from '../../../harness'

const TRACE_URL = '/traces/1.1-create-calc/event_log.jsonl'

const TYPE_COLOR: Record<string, string> = {
  user_message: 'bg-[#EEF0FF] text-[#5E6AD2]',
  model_call: 'bg-[#F0F0F0] text-[#6B6B6B]',
  approval: 'bg-[#FFF8EB] text-[#9A6700]',
  tool_call: 'bg-[#F0F9F2] text-[#1A7F37]',
  final: 'bg-[#E8F5E9] text-[#1A7F37]',
}

export default function Level() {
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const [events, setEvents] = useState<EventLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(0)
  const [inspectedTypes, setInspectedTypes] = useState<Set<string>>(new Set())
  const [quizOpen, setQuizOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [passed, setPassed] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(TRACE_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (cancelled) return
        const parsed = parseEventLogJsonl(text)
        setEvents(parsed)
        setCursor(0)
      } catch (e) {
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const byStep = useMemo(() => groupEventsByStep(events), [events])
  const current = events[cursor]

  const glass: GlassPipeline = useMemo(() => {
    if (!events.length || !current) {
      return emptyPipeline('加载 event_log 后步进——右侧把本 step 画成透明管道')
    }
    const step = typeof current.step === 'number' ? current.step : 0
    const stepEvents = byStep.get(step) || [current]
    const focusInStep = Math.max(
      0,
      stepEvents.findIndex(
        (e) => e === current || (e.type === current.type && e.timestamp === current.timestamp),
      ),
    )
    // Prefer global timeline as nodes when step has few events
    if (stepEvents.length >= 2) {
      return buildEventStepPipeline(step, stepEvents, focusInStep >= 0 ? focusInStep : 0)
    }
    // Fall back: window of nearby events as pipeline
    const start = Math.max(0, cursor - 2)
    const window = events.slice(start, Math.min(events.length, cursor + 3))
    const fi = cursor - start
    return buildEventStepPipeline(step, window, fi)
  }, [events, current, cursor, byStep])

  useEffect(() => {
    if (!current) return
    setInspectedTypes((prev) => new Set(prev).add(current.type))
  }, [current])

  const canPass =
    inspectedTypes.has('user_message') &&
    inspectedTypes.has('tool_call') &&
    (inspectedTypes.has('model_call') || inspectedTypes.has('final'))

  const go = (delta: number) => {
    setCursor((c) => Math.max(0, Math.min(events.length - 1, c + delta)))
  }

  // Auto-play replay (transparent exploration playback)
  useEffect(() => {
    if (!playing || events.length === 0) return
    if (cursor >= events.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => {
      setCursor((c) => Math.min(events.length - 1, c + 1))
    }, 900)
    return () => clearTimeout(t)
  }, [playing, cursor, events.length])

  return (
    <LevelLayout
      title="可观测性 Trace 与 Replay"
      levelNumber="4.1"
      mode="replay"
      conceptCard={<ConceptCard {...LEVEL_4_1_CONCEPT} />}
      simulation={
        <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-1">
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
            <h2 className="text-lg font-semibold mb-1">只读 Replay：event_log.jsonl</h2>
            <p className="text-sm text-[#6B6B6B] mb-3">
              Replay <strong>不重新调用 LLM</strong>——消费已记录的事件时间线，解释关键决策。
              数据源：<code className="text-xs">{TRACE_URL}</code>
            </p>

            {loading && <p className="text-sm text-[#9B9B9B]">加载 trace…</p>}
            {error && (
              <p className="text-sm text-[#D23B3B]">加载失败: {error}</p>
            )}

            {!loading && !error && events.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => go(-1)} disabled={cursor === 0 || playing}>
                    ← 上一条
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => go(1)}
                    disabled={cursor >= events.length - 1 || playing}
                  >
                    下一条 →
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (playing) setPlaying(false)
                      else {
                        if (cursor >= events.length - 1) setCursor(0)
                        setPlaying(true)
                      }
                    }}
                  >
                    {playing ? '⏸ 暂停回放' : '▶ 自动回放'}
                  </Button>
                  <span className="text-xs text-[#9B9B9B] font-mono ml-1">
                    event {cursor + 1}/{events.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {events.map((e, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCursor(i)}
                      className={`w-2.5 h-2.5 rounded-full ${
                        i === cursor ? 'ring-2 ring-[#5E6AD2] ring-offset-1' : ''
                      } ${
                        e.type === 'tool_call'
                          ? 'bg-[#2DA44E]'
                          : e.type === 'approval'
                            ? 'bg-[#D48C20]'
                            : e.type === 'final'
                              ? 'bg-[#5E6AD2]'
                              : 'bg-[#D0D0D0]'
                      }`}
                      title={`${i}: ${e.type}`}
                    />
                  ))}
                </div>

                {current && (
                  <motion.div
                    key={cursor}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[#E5E5E5] rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5E5] bg-[#FAFAFA]">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          TYPE_COLOR[current.type] || 'bg-[#F0F0F0]'
                        }`}
                      >
                        {current.type}
                      </span>
                      <span className="text-[11px] font-mono text-[#9B9B9B]">
                        step={current.step ?? '-'} · {current.timestamp || ''}
                      </span>
                    </div>
                    <div className="p-4 text-sm">
                      <p className="text-xs text-[#9B9B9B] mb-2">{summarizeEvent(current)}</p>
                      {current.name && (
                        <p className="font-mono text-xs mb-1">name: {current.name}</p>
                      )}
                      {current.arguments && (
                        <pre className="text-[11px] bg-[#F8F8F8] rounded-lg p-2 overflow-x-auto mb-2">
                          {JSON.stringify(current.arguments, null, 2)}
                        </pre>
                      )}
                      {current.decision && (
                        <pre className="text-[11px] bg-[#FFF8EB] rounded-lg p-2 overflow-x-auto mb-2">
                          {JSON.stringify(current.decision, null, 2)}
                        </pre>
                      )}
                      {current.result !== undefined && (
                        <pre className="text-[11px] bg-[#F0F9F2] rounded-lg p-2 overflow-x-auto mb-2 max-h-40">
                          {JSON.stringify(current.result, null, 2)}
                        </pre>
                      )}
                      {current.response && (
                        <pre className="text-[11px] bg-[#F8F8F8] rounded-lg p-2 overflow-x-auto max-h-32">
                          {String(current.response).slice(0, 800)}
                        </pre>
                      )}
                      {current.content && current.type !== 'model_call' && (
                        <pre className="text-[11px] bg-[#F8F8F8] rounded-lg p-2 overflow-x-auto max-h-40 whitespace-pre-wrap">
                          {String(current.content).slice(0, 1000)}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
            <p className="text-xs text-[#9B9B9B] mb-2">
              过关：步进查看 user_message、tool_call，以及 model_call 或 final
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {['user_message', 'model_call', 'tool_call', 'approval', 'final'].map((t) => (
                <span
                  key={t}
                  className={inspectedTypes.has(t) ? 'text-[#1A7F37]' : 'text-[#9B9B9B]'}
                >
                  {inspectedTypes.has(t) ? '✓' : '○'} {t}
                </span>
              ))}
            </div>
          </div>

          {canPass && !quizOpen && !passed && (
            <div className="bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4 flex justify-between">
              <span className="text-sm">关键事件类型已检视</span>
              <Button size="sm" onClick={() => setQuizOpen(true)}>
                开始答题
              </Button>
            </div>
          )}

          {quizOpen && !passed && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
              <p className="text-sm mb-3">{LEVEL_4_1_QUIZ.question}</p>
              <div className="space-y-1.5 mb-3">
                {LEVEL_4_1_QUIZ.options.map((o, i) => (
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
                  if (selected === LEVEL_4_1_QUIZ.correctIndex) {
                    setPassed(true)
                    completeLevel('4.1-observability', 'replay')
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
                {LEVEL_4_1_QUIZ.explanation}
              </p>
              <Button size="sm" onClick={() => { window.location.href = '/' }}>
                返回地图
              </Button>
            </motion.div>
          )}
        </div>
      }
      pipeline={<TransparentPipeline pipeline={glass} />}
    />
  )
}
