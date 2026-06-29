import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTraceStore, type TraceEvent } from '../../store/traceStore'
import { useContextMemoryStore, type ContextSnap } from '../../store/contextMemoryStore'

const TYPE_META: Record<string, { icon: string; label: string }> = {
  system_context: { icon: '📋', label: 'System' },
  tools_schema:   { icon: '🔧', label: 'Tools' },
  user_message:   { icon: '👤', label: 'User' },
  model_request:  { icon: '📤', label: 'Request' },
  model_response: { icon: '📥', label: 'Response' },
  policy_check:   { icon: '🛡', label: 'Policy' },
  tool_execute:   { icon: '⚙', label: 'Execute' },
  observation:    { icon: '👁', label: 'Observe' },
  context_update: { icon: '🔄', label: 'Context' },
  completion:     { icon: '✅', label: 'Done' },
  error:          { icon: '❌', label: 'Error' },
}

// ─── Overlay popup ───
function Overlay({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-black/30 flex items-start justify-center pt-12"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: -10 }}
        className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-[95%] max-h-[80%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5E5] shrink-0">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">{title}</h3>
          <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1A1A1A] text-lg leading-none px-1">✕</button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}

// ─── Context popup content ───
function ContextPopup({ snap, onClose }: { snap: ContextSnap; onClose: () => void }) {
  return (
    <Overlay title="📊 Context 上下文状态" onClose={onClose}>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          ['Messages', snap.totalMessages],
          ['Tokens', snap.inputTokens + snap.outputTokens],
          ['Usable', snap.usableTokens],
          ['Window', snap.contextWindow],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#F8F8F8] rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#9B9B9B]">{label}</div>
            <div className="text-sm font-mono font-semibold text-[#1A1A1A]">{value}</div>
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-[#9B9B9B] mb-1">
          <span>Token 使用率: {snap.usageRatio}%</span>
          <span>{snap.inputTokens + snap.outputTokens} / {snap.contextWindow}</span>
        </div>
        <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${snap.usageRatio > 80 ? 'bg-[#D48C20]' : 'bg-[#5E6AD2]'}`}
            style={{ width: `${Math.min(snap.usageRatio, 100)}%` }} />
        </div>
        <div className="flex justify-between text-[9px] mt-1 text-[#9B9B9B]">
          <span>system: {snap.messageBreakdown.system}</span>
          <span>user: {snap.messageBreakdown.user}</span>
          <span>assistant: {snap.messageBreakdown.assistant}</span>
          <span>tool: {snap.messageBreakdown.tool}</span>
        </div>
      </div>
      {snap.compacted && (
        <div className="bg-[#D48C20]/10 border border-[#D48C20]/20 rounded-lg p-3 mb-4 text-xs text-[#D48C20]">
          ⚠ auto-compacted: {snap.omittedGroups} groups omitted
        </div>
      )}
      {/* Messages content */}
      <div>
        <div className="text-xs font-semibold text-[#1A1A1A] mb-2">Messages 内容</div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {snap.messageSummary.map((msg, i) => {
            const [role, ...rest] = msg.split(': ')
            const content = rest.join(': ')
            const roleColors: Record<string, string> = {
              system: 'border-[#787F95] bg-[#F2F3F8]',
              user: 'border-[#5E6AD2] bg-[#EEF0FF]',
              assistant: 'border-[#5E6AD2]/30 bg-[#F7F8FF]',
              tool: 'border-[#2DA44E]/20 bg-[#F4FBF4]',
            }
            return (
              <div key={i} className={`rounded-lg border p-3 text-xs ${roleColors[role] || 'border-[#E5E5E5] bg-white'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase text-[#9B9B9B]">{role}</span>
                  <span className="text-[10px] text-[#9B9B9B] font-mono">#{i}</span>
                  {role === 'tool' && <span className="text-[10px] text-[#2DA44E]">← call_id 关联</span>}
                </div>
                <div className="text-[#1A1A1A] leading-relaxed whitespace-pre-wrap font-mono text-[11px] break-all max-h-32 overflow-y-auto">
                  {content || '(tool_calls / 无文本内容)'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Overlay>
  )
}

// ─── Memory popup content ───
function MemoryPopup({ mode, onClose }: { mode: 'retrieve' | 'update'; onClose: () => void }) {
  const { retrievedMemory, memoryEntries } = useContextMemoryStore()
  return (
    <Overlay title={`📝 Memory ${mode === 'retrieve' ? '检索' : '更新'}`} onClose={onClose}>
      {mode === 'retrieve' && (
        <div>
          <div className="text-xs font-semibold text-[#1A1A1A] mb-2">检索结果</div>
          <pre className="text-xs font-mono text-[#1A1A1A] leading-relaxed whitespace-pre-wrap bg-[#F8F8F8] rounded-lg p-4 max-h-80 overflow-y-auto">
            {retrievedMemory || '无历史记忆'}
          </pre>
          <div className="text-[10px] text-[#9B9B9B] mt-2">
            MemoryRetriever.search(structured_memory_path) + search_relevant_memory(session) → 注入 ContextItem(kind="relevant_memory")
          </div>
        </div>
      )}
      {mode === 'update' && (
        <div>
          <div className="text-xs font-semibold text-[#1A1A1A] mb-2">
            本次新增: {memoryEntries.filter(m => m.type !== 'retrieval').length} 条
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {memoryEntries.filter(m => m.type !== 'retrieval').map(m => (
              <div key={m.id} className="bg-[#F8F8F8] rounded-lg p-3 text-xs">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  m.type === 'observation' ? 'bg-[#2DA44E]/10 text-[#2DA44E]' :
                  m.type === 'file_state' ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' :
                  'bg-[#9B9B9B]/10 text-[#9B9B9B]'
                }`}>{m.type}</span>
                <div className="mt-1.5 text-[#1A1A1A] leading-relaxed">{m.content}</div>
              </div>
            ))}
            {memoryEntries.filter(m => m.type !== 'retrieval').length === 0 && (
              <div className="text-[#9B9B9B]">暂无新记忆</div>
            )}
          </div>
          <div className="text-[10px] text-[#9B9B9B] mt-3">
            run 结束时: update_working_memory(run_dir, memory_path) + write_run_memories(run_dir, structured_memory_path)
          </div>
        </div>
      )}
    </Overlay>
  )
}

// ─── Event row ───
function EventRow({ event, contextSnap, memoryBadge }: {
  event: TraceEvent; contextSnap?: ContextSnap; memoryBadge?: 'retrieve' | 'update';
}) {
  const meta = TYPE_META[event.type] || { icon: '•', label: event.type }
  const [expanded, setExpanded] = useState(false)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [memOpen, setMemOpen] = useState(false)
  const hasData = Object.keys(event.data).length > 0

  const kvPairs = Object.entries(event.data).map(([k, v]) => ({
    key: k, value: typeof v === 'string' ? v : JSON.stringify(v, null, 2),
  }))

  return (
    <div className={`rounded-lg border border-[#E5E5E5] bg-white overflow-hidden text-xs relative`}>
      <div className="flex items-center">
        <button
          onClick={() => hasData && setExpanded(!expanded)}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 text-left min-w-0 ${hasData ? 'cursor-pointer hover:bg-[#FAFAFA]' : ''}`}
        >
          <span className="text-base shrink-0">{meta.icon}</span>
          <span className="text-[#6B6B6B] text-[10px] font-bold uppercase shrink-0 w-16">{meta.label}</span>
          <span className="text-[#1A1A1A] truncate text-[12px]">{event.label}</span>
          {hasData && (
            <span className="ml-auto text-base text-[#9B9B9B] shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-[#00000008]">
              {expanded ? '▴' : '▾'}
            </span>
          )}
        </button>

        {/* Context badge */}
        {contextSnap && (
          <button
            onClick={() => setCtxOpen(true)}
            className="shrink-0 px-2.5 py-1.5 mr-1 rounded-md text-[11px] bg-[#5E6AD2]/8 text-[#5E6AD2] font-semibold hover:bg-[#5E6AD2]/15 transition-colors"
          >
            📊 {contextSnap.totalMessages}msg
          </button>
        )}

        {/* Memory badge */}
        {memoryBadge && (
          <button
            onClick={() => setMemOpen(true)}
            className={`shrink-0 px-2.5 py-1.5 mr-1 rounded-md text-[11px] font-semibold transition-colors ${
              memoryBadge === 'retrieve'
                ? 'bg-[#D48C20]/8 text-[#D48C20] hover:bg-[#D48C20]/15'
                : 'bg-[#2DA44E]/8 text-[#2DA44E] hover:bg-[#2DA44E]/15'
            }`}
          >
            📝 {memoryBadge === 'retrieve' ? '检索' : '更新'}
          </button>
        )}
      </div>

      {/* Event data */}
      {expanded && hasData && (
        <div className="px-3 pb-2.5 space-y-2 border-t border-[#00000006] pt-2">
          {event.detail && <div className="text-[11px] text-[#6B6B6B] leading-relaxed">{event.detail}</div>}
          {kvPairs.map(({ key, value }) => (
            <div key={key}>
              <div className="text-[#9B9B9B] font-semibold text-[10px] mb-0.5 uppercase">{key}</div>
              <pre className="text-[#1A1A1A] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-[#00000003] rounded p-2 max-h-80 overflow-y-auto">
                {value}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Context overlay */}
      {ctxOpen && contextSnap && <ContextPopup snap={contextSnap} onClose={() => setCtxOpen(false)} />}
      {/* Memory overlay */}
      {memOpen && memoryBadge && <MemoryPopup mode={memoryBadge} onClose={() => setMemOpen(false)} />}
    </div>
  )
}

// ─── Replay ───
function ReplayView() {
  const { replaySteps, currentReplayStep, setReplayStep, exitReplay } = useTraceStore()
  const { contextSnaps } = useContextMemoryStore()
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)

  const keyPoints = replaySteps.map((step, i) => {
    const hasTool = step.some(e => e.type === 'model_response' && e.label.includes('tool_call'))
    const hasCompletion = step.some(e => e.type === 'completion')
    return { index: i, hasTool, hasCompletion }
  }).filter(kp => kp.hasTool || kp.hasCompletion)

  const play = () => { if (currentReplayStep >= replaySteps.length - 1) setReplayStep(0); setPlaying(true) }

  useEffect(() => {
    if (playing && currentReplayStep < replaySteps.length - 1) {
      timerRef.current = window.setTimeout(() => setReplayStep(currentReplayStep + 1), 800)
    } else if (currentReplayStep >= replaySteps.length - 1) setPlaying(false)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, currentReplayStep])

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-xs font-medium">回放 · {replaySteps.length} 步</span>
        <div className="flex gap-1">
          {playing ? <button onClick={() => setPlaying(false)} className="text-[10px] px-2 py-0.5 rounded border hover:bg-[#F5F5F5]">⏸</button>
            : <button onClick={play} className="text-[10px] px-2 py-0.5 rounded border hover:bg-[#F5F5F5]">▶</button>}
          <button onClick={exitReplay} className="text-[10px] px-2 py-0.5 rounded border hover:bg-[#F5F5F5]">← 实时</button>
        </div>
      </div>

      <div className="relative h-8 mb-3 shrink-0">
        <div className="absolute inset-x-0 top-3 h-1 bg-[#E5E5E5] rounded-full" />
        <div className="absolute top-3 h-1 bg-[#5E6AD2] rounded-full transition-all" style={{ width: `${((currentReplayStep + 1) / replaySteps.length) * 100}%` }} />
        {keyPoints.map(kp => (
          <div key={kp.index} className="absolute top-1.5 w-5 h-5 rounded-full bg-white border-2 cursor-pointer"
            style={{ left: `${((kp.index + 0.5) / replaySteps.length) * 100}%`, transform: 'translateX(-50%)',
              borderColor: kp.hasCompletion ? '#2DA44E' : '#5E6AD2',
              backgroundColor: currentReplayStep >= kp.index ? (kp.hasCompletion ? '#2DA44E' : '#5E6AD2') : 'white' }}
            onClick={() => setReplayStep(kp.index)}>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-[#9B9B9B] whitespace-nowrap">{kp.hasCompletion ? '✓' : '🔧'}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {replaySteps.map((step, si) => {
          const ctxSnap = contextSnaps[si]
          return (
            <div key={si} className={`rounded-xl border overflow-hidden ${si === currentReplayStep ? 'border-[#5E6AD2] shadow-sm' : 'border-[#E5E5E5] opacity-60'}`}>
              <button onClick={() => setReplayStep(si)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${si === currentReplayStep ? 'bg-[#5E6AD2]' : 'bg-[#D0D0D0]'}`}>{si + 1}</span>
                <span className="text-xs font-medium">Step {si + 1}</span>
                {ctxSnap && <span className="text-[10px] text-[#9B9B9B] font-mono ml-auto">{ctxSnap.totalMessages}msg</span>}
              </button>
              {si === currentReplayStep && (
                <div className="p-2 space-y-1.5">
                  {step.map(evt => <EventRow key={evt.id} event={evt} contextSnap={evt.type === 'model_request' ? ctxSnap : undefined} />)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Live view ───
export default function TraceStream() {
  const { events, replayMode, startReplay, clearEvents } = useTraceStore()
  const { contextSnaps, retrievedMemory } = useContextMemoryStore()
  const endRef = useRef<HTMLDivElement>(null)
  const [memOpen, setMemOpen] = useState(false)

  useEffect(() => {
    if (!replayMode) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, replayMode])

  if (replayMode) return <ReplayView />

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <div className="text-3xl mb-3 opacity-20">🔍</div>
        <p className="text-sm text-[#9B9B9B]">发送消息后实时展示</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs font-medium text-[#1A1A1A]">🔴 实时 · {events.length} 事件</span>
        <div className="flex gap-1">
          <button onClick={startReplay} className="text-[10px] px-2 py-1 rounded border hover:bg-[#F5F5F5] hover:border-[#5E6AD2] text-[#5E6AD2] font-medium">▶ 回放</button>
          <button onClick={clearEvents} className="text-[10px] px-2 py-1 rounded border hover:bg-[#F5F5F5] text-[#9B9B9B]">清除</button>
        </div>
      </div>

      {/* Pre-run memory retrieval header */}
      {retrievedMemory && (
        <button
          onClick={() => setMemOpen(true)}
          className="mb-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D48C20]/20 bg-[#D48C20]/[0.03] hover:bg-[#D48C20]/[0.06] transition-colors text-left"
        >
          <span className="text-sm">📝</span>
          <span className="text-xs font-semibold text-[#1A1A1A]">Memory 检索</span>
          <span className="text-[10px] text-[#9B9B9B] ml-auto">run 开始前</span>
        </button>
      )}
      {memOpen && <MemoryPopup mode="retrieve" onClose={() => setMemOpen(false)} />}

      {/* Event stream */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {events.map(evt => {
          const reqEvts = events.filter(e => e.type === 'model_request')
          const reqIdx = reqEvts.indexOf(evt)
          const ctxSnap = evt.type === 'model_request' && reqIdx >= 0 ? contextSnaps[reqIdx] : undefined
          const userEvts = events.filter(e => e.type === 'user_message')
          const isFirstUser = evt.type === 'user_message' && userEvts.indexOf(evt) === 0
          const isCompletion = evt.type === 'completion'

          return (
            <EventRow
              key={evt.id}
              event={evt}
              contextSnap={ctxSnap}
              memoryBadge={isFirstUser ? 'retrieve' : isCompletion ? 'update' : undefined}
            />
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}