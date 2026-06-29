import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTraceStore, type TraceEvent } from '../../store/traceStore'
import { useContextMemoryStore, type ContextSnap, type MemoryEntry } from '../../store/contextMemoryStore'

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

function EventRow({ event, contextSnap, memoryBadge }: { event: TraceEvent; contextSnap?: ContextSnap; memoryBadge?: 'retrieve' | 'update' }) {
  const meta = TYPE_META[event.type] || { icon: '•', bg: 'bg-white', border: 'border-[#E5E5E5]', label: event.type }
  const [expanded, setExpanded] = useState(false)
  const [showCtx, setShowCtx] = useState(false)
  const [showMem, setShowMem] = useState(false)
  const { contextSnaps, memoryEntries, retrievedMemory } = useContextMemoryStore()
  const hasData = Object.keys(event.data).length > 0

  const kvPairs = Object.entries(event.data).map(([k, v]) => ({
    key: k, value: typeof v === 'string' ? v : JSON.stringify(v, null, 2),
  }))

  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} overflow-hidden text-xs`}>
      <div className="flex items-center">
        <button
          onClick={() => hasData && setExpanded(!expanded)}
          className={`flex-1 flex items-center gap-2 px-3 py-2 text-left min-w-0 ${hasData ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          <span className="text-sm shrink-0">{meta.icon}</span>
          <span className="text-[#6B6B6B] text-[10px] font-medium uppercase shrink-0 w-14">{meta.label}</span>
          <span className="text-[#1A1A1A] truncate">{event.label}</span>
          {hasData && <span className="ml-auto text-[#9B9B9B] text-[10px] shrink-0">{expanded ? '▴' : '▾'}</span>}
        </button>

        {/* Context badge */}
        {contextSnap && (
          <button
            onClick={() => setShowCtx(!showCtx)}
            className="shrink-0 px-2 py-1 mr-1 rounded text-[10px] bg-[#5E6AD2]/8 text-[#5E6AD2] font-medium hover:bg-[#5E6AD2]/15 transition-colors"
          >
            📊 {contextSnap.totalMessages}msg/{contextSnap.usageRatio}%
          </button>
        )}

        {/* Memory badge */}
        {memoryBadge && (
          <button
            onClick={() => setShowMem(!showMem)}
            className={`shrink-0 px-2 py-1 mr-1 rounded text-[10px] font-medium transition-colors ${
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
        <div className="px-3 pb-2.5 space-y-2 border-t border-[#00000008] pt-2">
          {event.detail && <div className="text-[#6B6B6B] text-[11px]">{event.detail}</div>}
          {kvPairs.map(({ key, value }) => (
            <div key={key}>
              <div className="text-[#9B9B9B] font-medium text-[10px] mb-0.5">{key}</div>
              <pre className="text-[#1A1A1A] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-[#00000004] rounded p-2 max-h-80 overflow-y-auto">{value}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Context popup */}
      <AnimatePresence>
        {showCtx && contextSnap && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#5E6AD2]/15">
            <div className="px-3 py-2.5 space-y-2 bg-[#5E6AD2]/[0.03]">
              <div className="text-[10px] font-semibold text-[#5E6AD2] uppercase">Context 上下文状态</div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="bg-white rounded p-1.5"><span className="text-[#9B9B9B]">Messages</span><div className="font-mono font-medium">{contextSnap.totalMessages}</div></div>
                <div className="bg-white rounded p-1.5"><span className="text-[#9B9B9B]">Total Tokens</span><div className="font-mono font-medium">{contextSnap.inputTokens + contextSnap.outputTokens}</div></div>
                <div className="bg-white rounded p-1.5"><span className="text-[#9B9B9B]">Usable</span><div className="font-mono font-medium">{contextSnap.usableTokens}</div></div>
                <div className="bg-white rounded p-1.5"><span className="text-[#9B9B9B]">Window</span><div className="font-mono font-medium">{contextSnap.contextWindow}</div></div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] text-[#9B9B9B] mb-0.5"><span>0</span><span>{contextSnap.contextWindow}</span></div>
                <div className="h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${contextSnap.usageRatio > 80 ? 'bg-[#D48C20]' : 'bg-[#5E6AD2]'}`}
                    style={{ width: `${Math.min(contextSnap.usageRatio, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[9px] mt-0.5 text-[#9B9B9B]">
                  <span>sys:{contextSnap.messageBreakdown.system}</span><span>usr:{contextSnap.messageBreakdown.user}</span><span>asst:{contextSnap.messageBreakdown.assistant}</span><span>tool:{contextSnap.messageBreakdown.tool}</span>
                </div>
              </div>
              {contextSnap.compacted && <div className="text-[10px] text-[#D48C20] bg-[#D48C20]/10 rounded px-2 py-1">⚠ auto-compacted: {contextSnap.omittedGroups} groups omitted</div>}
              <div className="text-[10px] text-[#9B9B9B]">每次 model request 前 ContextBuilder 按优先级组装 messages，超出 CONTEXT_WARNING_RATIO=0.8 时自动 compact</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory popup */}
      <AnimatePresence>
        {showMem && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#D48C20]/15">
            <div className="px-3 py-2.5 space-y-2 bg-[#D48C20]/[0.03]">
              {memoryBadge === 'retrieve' && retrievedMemory && (
                <>
                  <div className="text-[10px] font-semibold text-[#D48C20] uppercase">Memory 检索结果（对话前）</div>
                  <pre className="text-[11px] text-[#1A1A1A] font-mono leading-relaxed whitespace-pre-wrap bg-white rounded p-2 max-h-60 overflow-y-auto">{retrievedMemory}</pre>
                  <div className="text-[10px] text-[#9B9B9B]">执行前检索 working_memory + structured memory (MemoryRetriever.search)</div>
                </>
              )}
              {memoryBadge === 'update' && (
                <>
                  <div className="text-[10px] font-semibold text-[#2DA44E] uppercase">Memory 更新（对话后）</div>
                  <div className="text-[10px] font-medium text-[#1A1A1A]">本次新增: {memoryEntries.filter(m => m.type !== 'retrieval').length} 条</div>
                  {memoryEntries.filter(m => m.type !== 'retrieval').map(m => (
                    <div key={m.id} className="bg-white rounded p-1.5">
                      <span className="text-[9px] px-1 rounded font-medium bg-[#2DA44E]/10 text-[#2DA44E]">{m.type}</span>
                      <div className="text-[11px] mt-0.5">{m.content}</div>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#9B9B9B]">update_working_memory() + write_run_memories() 在每次 run 结束时写入</div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Replay ──
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-xs font-medium text-[#1A1A1A]">回放 · {replaySteps.length} 步</span>
        <div className="flex gap-1">
          {playing ? <button onClick={() => setPlaying(false)} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">⏸</button>
            : <button onClick={play} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">▶</button>}
          <button onClick={exitReplay} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">← 实时</button>
        </div>
      </div>

      <div className="relative h-8 mb-3 shrink-0">
        <div className="absolute inset-x-0 top-3 h-1 bg-[#E5E5E5] rounded-full" />
        <div className="absolute top-3 h-1 bg-[#5E6AD2] rounded-full transition-all" style={{ width: `${((currentReplayStep + 1) / replaySteps.length) * 100}%` }} />
        {keyPoints.map(kp => (
          <div key={kp.index} className="absolute top-1.5 w-5 h-5 rounded-full bg-white border-2 transition-colors cursor-pointer"
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
            <div key={si} className={`rounded-xl border overflow-hidden transition-all ${si === currentReplayStep ? 'border-[#5E6AD2] shadow-sm' : 'border-[#E5E5E5] opacity-60'}`}>
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

// ── Live view ──
export default function TraceStream() {
  const { events, replayMode, startReplay, clearEvents } = useTraceStore()
  const { contextSnaps, memoryEntries, retrievedMemory } = useContextMemoryStore()
  const endRef = useRef<HTMLDivElement>(null)
  const [showStartMem, setShowStartMem] = useState(false)

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs font-medium text-[#1A1A1A]">🔴 实时 · {events.length} 事件</span>
        <div className="flex gap-1">
          <button onClick={startReplay} className="text-[10px] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5] hover:border-[#5E6AD2] text-[#5E6AD2] font-medium">▶ 回放</button>
          <button onClick={clearEvents} className="text-[10px] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#9B9B9B]">清除</button>
        </div>
      </div>

      {/* Pre-run memory retrieval badge */}
      {retrievedMemory && (
        <div className="mb-2 p-2 rounded-lg border border-[#D48C20]/20 bg-[#D48C20]/[0.03]">
          <button onClick={() => setShowStartMem(!showStartMem)} className="w-full flex items-center gap-2 text-left">
            <span className="text-xs">📝</span>
            <span className="text-xs font-medium text-[#1A1A1A]">Memory 检索</span>
            <span className="text-[10px] text-[#9B9B9B] ml-auto">run 开始前</span>
            <span className="text-[10px]">{showStartMem ? '▴' : '▾'}</span>
          </button>
          <AnimatePresence>
            {showStartMem && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <pre className="text-[11px] text-[#1A1A1A] font-mono leading-relaxed whitespace-pre-wrap bg-white rounded p-2 mt-2 max-h-40 overflow-y-auto">{retrievedMemory}</pre>
                <div className="text-[10px] text-[#9B9B9B] mt-1">search_relevant_memory() + MemoryRetriever.search() 在每次 run 开始前检索 session working_memory 和 structured memory</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Event stream with inline context/memory badges */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {events.map((evt, i) => {
          const ctxIdx = contextSnaps.findIndex(c => events.indexOf(evt) >= events.findIndex(e => e.type === 'model_request' && e.label.includes(`Round ${c.step}`)))
          const ctxSnap = evt.type === 'model_request'
            ? contextSnaps.find(c => {
                const reqIdx = events.indexOf(evt)
                // Find context snap whose step matches the event position
                const matchEvt = events.find(e => e.type === 'model_request' && e.label.includes(`Round ${c.step}`))
                return matchEvt === evt
              })
            : undefined

          // Simpler approach: just pick context snap by index
          const reqEvts = events.filter(e => e.type === 'model_request')
          const reqIdx = reqEvts.indexOf(evt)
          const contextForThis = evt.type === 'model_request' && reqIdx >= 0 ? contextSnaps[reqIdx] : undefined

          // Memory: check for "retrieve" badge on first user_message, "update" on completion
          const isFirstUser = evt.type === 'user_message' && events.filter(e => e.type === 'user_message').indexOf(evt) === 0
          const isCompletion = evt.type === 'completion'

          return (
            <EventRow
              key={evt.id}
              event={evt}
              contextSnap={contextForThis}
              memoryBadge={isFirstUser ? 'retrieve' : isCompletion ? 'update' : undefined}
            />
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}