import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTraceStore, type TraceEvent, createTraceEvent } from '../../store/traceStore'

const TYPE_META: Record<string, { icon: string; bg: string; border: string; label: string }> = {
  system_context:  { icon: '📋', bg: 'bg-[#F2F3F8]', border: 'border-[#787F95]/20', label: 'System' },
  tools_schema:    { icon: '🔧', bg: 'bg-[#F8F8F8]',   border: 'border-[#D0D0D0]',   label: 'Tools' },
  user_message:    { icon: '👤', bg: 'bg-[#EEF0FF]',   border: 'border-[#5E6AD2]/20', label: 'User' },
  model_request:   { icon: '📤', bg: 'bg-white',        border: 'border-[#E5E5E5]',   label: 'Request' },
  model_response:  { icon: '📥', bg: 'bg-[#F7F8FF]',   border: 'border-[#5E6AD2]/20', label: 'Response' },
  policy_check:    { icon: '🛡', bg: 'bg-[#FFFBF0]',   border: 'border-[#D48C20]/20', label: 'Policy' },
  tool_execute:    { icon: '⚙', bg: 'bg-white',        border: 'border-[#E5E5E5]',   label: 'Execute' },
  observation:     { icon: '👁', bg: 'bg-[#F4FBF4]',   border: 'border-[#2DA44E]/15', label: 'Observe' },
  context_update:  { icon: '🔄', bg: 'bg-[#FAFAFA]',   border: 'border-[#E5E5E5]',   label: 'Context' },
  completion:      { icon: '✅', bg: 'bg-[#ECF8EE]',   border: 'border-[#2DA44E]/30', label: 'Done' },
  error:           { icon: '❌', bg: 'bg-[#FFF5F5]',   border: 'border-[#D23B3B]/20', label: 'Error' },
}

function EventRow({ event }: { event: TraceEvent }) {
  const meta = TYPE_META[event.type] || { icon: '•', bg: 'bg-white', border: 'border-[#E5E5E5]', label: event.type }
  const [expanded, setExpanded] = useState(false)
  const hasData = Object.keys(event.data).length > 0

  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} overflow-hidden text-xs`}>
      <button
        onClick={() => hasData && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${hasData ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        <span className="text-sm shrink-0">{meta.icon}</span>
        <span className="text-[#6B6B6B] text-[10px] font-medium uppercase shrink-0">{meta.label}</span>
        <span className="text-[#1A1A1A] truncate">{event.label}</span>
        {hasData && <span className="ml-auto text-[#9B9B9B] text-[10px]">{expanded ? '▴' : '▾'}</span>}
      </button>
      {(expanded || event.detail) && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {event.detail && <div className="text-[#6B6B6B] leading-relaxed">{event.detail}</div>}
          {expanded && hasData && Object.entries(event.data).map(([k, v]) => {
            const val = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
            const short = val.length > 150 ? val.slice(0, 150) + '…' : val
            return (
              <div key={k} className="flex gap-2">
                <span className="text-[#9B9B9B] shrink-0 font-medium min-w-[60px]">{k}</span>
                <span className="text-[#1A1A1A] font-mono leading-relaxed break-all whitespace-pre-wrap">{short}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Replay view ──
function ReplayView() {
  const { replaySteps, currentReplayStep, setReplayStep, exitReplay } = useTraceStore()
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Detect key steps: first tool call, first deny, completion
  const keyPoints = replaySteps
    .map((step, i) => {
      const hasTool = step.some(e => e.type === 'model_response' && e.label.includes('tool_call'))
      const hasDeny = step.some(e => e.type === 'policy_check' && e.label.includes('DENY'))
      const hasCompletion = step.some(e => e.type === 'completion')
      return { index: i, hasTool, hasDeny, hasCompletion }
    })
    .filter(kp => kp.hasTool || kp.hasDeny || kp.hasCompletion)

  const play = () => {
    if (currentReplayStep >= replaySteps.length - 1) {
      setReplayStep(0)
    }
    setPlaying(true)
  }
  const pause = () => { setPlaying(false) }

  useEffect(() => {
    if (playing && currentReplayStep < replaySteps.length - 1) {
      timerRef.current = window.setTimeout(() => {
        setReplayStep(currentReplayStep + 1)
      }, 800)
    } else if (currentReplayStep >= replaySteps.length - 1) {
      setPlaying(false)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, currentReplayStep, replaySteps.length])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-xs font-medium text-[#1A1A1A]">回放 · {replaySteps.length} 步</span>
        <div className="flex gap-1">
          {playing
            ? <button onClick={pause} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">⏸ 暂停</button>
            : <button onClick={play} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">▶ 播放</button>
          }
          <button onClick={exitReplay} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">← 实时</button>
        </div>
      </div>

      {/* Progress bar with key points */}
      <div className="relative h-6 mb-3 shrink-0">
        <div className="absolute inset-x-0 top-2.5 h-1 bg-[#E5E5E5] rounded-full" />
        <div
          className="absolute top-2.5 h-1 bg-[#5E6AD2] rounded-full transition-all duration-300"
          style={{ width: `${((currentReplayStep + 1) / replaySteps.length) * 100}%` }}
        />
        {keyPoints.map(kp => (
          <div
            key={kp.index}
            className="absolute top-1 w-4 h-4 rounded-full bg-white border-2 transition-colors cursor-pointer"
            style={{
              left: `${((kp.index + 0.5) / replaySteps.length) * 100}%`,
              transform: 'translateX(-50%)',
              borderColor: kp.hasCompletion ? '#2DA44E' : kp.hasDeny ? '#D23B3B' : '#5E6AD2',
              backgroundColor: currentReplayStep >= kp.index ? (kp.hasCompletion ? '#2DA44E' : kp.hasDeny ? '#D23B3B' : '#5E6AD2') : 'white',
            }}
            onClick={() => setReplayStep(kp.index)}
            title={`Step ${kp.index + 1}${kp.hasTool ? ' — 工具调用' : ''}${kp.hasDeny ? ' — 被拒绝' : ''}${kp.hasCompletion ? ' — 完成' : ''}`}
          >
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-[#9B9B9B] whitespace-nowrap">
              {kp.hasCompletion ? '✓完' : kp.hasDeny ? '✕拒' : '🔧'}
            </div>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {replaySteps.map((step, si) => (
          <div
            key={si}
            className={`rounded-xl border overflow-hidden transition-all ${si === currentReplayStep ? 'border-[#5E6AD2] shadow-sm' : 'border-[#E5E5E5] opacity-60'}`}
          >
            <button
              onClick={() => setReplayStep(si)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border-b border-[#E5E5E5]"
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${si === currentReplayStep ? 'bg-[#5E6AD2]' : 'bg-[#D0D0D0]'}`}>
                {si + 1}
              </span>
              <span className="text-xs font-medium text-[#1A1A1A]">Step {si + 1}</span>
              {step.some(e => e.type === 'completion') && <span className="ml-auto text-[10px] text-[#2DA44E] font-medium">完成</span>}
            </button>
            {si === currentReplayStep && (
              <div className="p-2 space-y-1.5">
                {step.map(evt => <EventRow key={evt.id} event={evt} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Live view ──
export default function TraceStream() {
  const { events, replayMode, startReplay, clearEvents } = useTraceStore()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!replayMode) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, replayMode])

  if (replayMode) return <ReplayView />

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <div className="text-3xl mb-3 opacity-20">🔍</div>
        <p className="text-sm text-[#9B9B9B] leading-relaxed">
          发送第一条消息后<br />这里实时展示 Agent 内部<br />所有数据流动
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D23B3B] animate-pulse" />
          <span className="text-xs font-medium text-[#1A1A1A]">实时 · {events.length} 事件</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={startReplay}
            className="text-[10px] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5] hover:border-[#5E6AD2] text-[#5E6AD2] font-medium transition-colors"
          >
            ▶ 回放
          </button>
          <button
            onClick={clearEvents}
            className="text-[10px] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#9B9B9B] transition-colors"
          >
            清除
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {events.map(evt => <EventRow key={evt.id} event={evt} />)}
        <div ref={endRef} />
      </div>
    </div>
  )
}