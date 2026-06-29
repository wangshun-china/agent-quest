import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTraceStore, type TraceEvent } from '../../store/traceStore'
import { useContextMemoryStore } from '../../store/contextMemoryStore'

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

// ── Event card (full content on expand) ──
function EventRow({ event }: { event: TraceEvent }) {
  const meta = TYPE_META[event.type] || { icon: '•', bg: 'bg-white', border: 'border-[#E5E5E5]', label: event.type }
  const [expanded, setExpanded] = useState(false)
  const hasData = Object.keys(event.data).length > 0

  const kvPairs = Object.entries(event.data).map(([k, v]) => {
    return { key: k, value: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }
  })

  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} overflow-hidden text-xs`}>
      <button
        onClick={() => hasData && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${hasData ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        <span className="text-sm shrink-0">{meta.icon}</span>
        <span className="text-[#6B6B6B] text-[10px] font-medium uppercase shrink-0 w-14">{meta.label}</span>
        <span className="text-[#1A1A1A] truncate">{event.label}</span>
        {hasData && <span className="ml-auto text-[#9B9B9B] text-[10px] shrink-0">{expanded ? '▴' : '▾'}</span>}
      </button>

      {expanded && hasData && (
        <div className="px-3 pb-2.5 space-y-2 border-t border-[#00000008] pt-2">
          {event.detail && (
            <div className="text-[#6B6B6B] leading-relaxed text-[11px]">{event.detail}</div>
          )}
          {kvPairs.map(({ key, value }) => (
            <div key={key}>
              <div className="text-[#9B9B9B] font-medium text-[10px] mb-0.5">{key}</div>
              <pre className="text-[#1A1A1A] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all bg-[#00000004] rounded p-2 max-h-80 overflow-y-auto">
                {value}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Context & Memory Panel ──
function ContextMemoryPanel() {
  const { contextHistory, memoryEntries } = useContextMemoryStore()
  const latest = contextHistory[contextHistory.length - 1]
  const [tab, setTab] = useState<'context' | 'memory'>('context')
  const [collapsed, setCollapsed] = useState(false)

  if (contextHistory.length === 0) return null

  return (
    <div className="border border-[#E5E5E5] rounded-xl overflow-hidden mb-3 bg-white shrink-0">
      <div className="flex items-center border-b border-[#E5E5E5]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-[#FAFAFA] transition-colors"
        >
          <span className="text-xs">🧠</span>
          <span className="text-xs font-medium text-[#1A1A1A]">Context & Memory</span>
          {latest && (
            <span className="text-[10px] text-[#9B9B9B] ml-auto">
              {latest.totalMessages}msg · {latest.usagePercent}%
            </span>
          )}
          <span className="text-[10px] text-[#9B9B9B]">{collapsed ? '▸' : '▾'}</span>
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-[#E5E5E5]">
            <button
              onClick={() => setTab('context')}
              className={`flex-1 text-[11px] py-1.5 font-medium transition-colors ${tab === 'context' ? 'text-[#5E6AD2] border-b-2 border-[#5E6AD2]' : 'text-[#9B9B9B] hover:text-[#6B6B6B]'}`}
            >
              上下文
            </button>
            <button
              onClick={() => setTab('memory')}
              className={`flex-1 text-[11px] py-1.5 font-medium transition-colors ${tab === 'memory' ? 'text-[#5E6AD2] border-b-2 border-[#5E6AD2]' : 'text-[#9B9B9B] hover:text-[#6B6B6B]'}`}
            >
              记忆 ({memoryEntries.length})
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {tab === 'context' && (
              <div className="p-3 space-y-2">
                {latest ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-[#F8F8F8] rounded p-2">
                        <div className="text-[#9B9B9B]">Messages</div>
                        <div className="text-[#1A1A1A] font-mono font-medium mt-0.5">{latest.totalMessages}</div>
                      </div>
                      <div className="bg-[#F8F8F8] rounded p-2">
                        <div className="text-[#9B9B9B]">Total Tokens</div>
                        <div className="text-[#1A1A1A] font-mono font-medium mt-0.5">{latest.totalTokens}</div>
                      </div>
                      <div className="bg-[#F8F8F8] rounded p-2">
                        <div className="text-[#9B9B9B]">Context Window</div>
                        <div className="text-[#1A1A1A] font-mono font-medium mt-0.5">{latest.contextWindow}</div>
                      </div>
                      <div className="bg-[#F8F8F8] rounded p-2">
                        <div className="text-[#9B9B9B]">使用率</div>
                        <div className={`font-mono font-medium mt-0.5 ${latest.usagePercent > 80 ? 'text-[#D48C20]' : 'text-[#2DA44E]'}`}>{latest.usagePercent}%</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#9B9B9B] mb-0.5">
                        <span>0</span>
                        <span>{latest.contextWindow}</span>
                      </div>
                      <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${latest.usagePercent > 80 ? 'bg-[#D48C20]' : 'bg-[#5E6AD2]'}`}
                          style={{ width: `${Math.min(latest.usagePercent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] mt-0.5">
                        <span className="text-[#9B9B9B]">system: {latest.systemTokens}</span>
                        <span className="text-[#9B9B9B]">user: {latest.userTokens}</span>
                        <span className="text-[#9B9B9B]">assistant: {latest.assistantTokens}</span>
                        <span className="text-[#9B9B9B]">tool: {latest.toolResultTokens}</span>
                      </div>
                    </div>
                    {/* Context history list */}
                    {contextHistory.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
                        <div className="text-[10px] text-[#9B9B9B] mb-1">上下文演变</div>
                        {contextHistory.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                            <span className="text-[#9B9B9B] font-mono">R{i + 1}</span>
                            <span className="text-[#1A1A1A] font-mono">{c.totalMessages}msg</span>
                            <span className="text-[#1A1A1A] font-mono">{c.totalTokens}tok</span>
                            <span className={`font-mono ${c.usagePercent > 80 ? 'text-[#D48C20]' : 'text-[#9B9B9B]'}`}>{c.usagePercent}%</span>
                            {c.compacted && <span className="text-[#2DA44E] text-[9px]">compacted</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-[#9B9B9B] p-2">等待对话开始…</div>
                )}
              </div>
            )}

            {tab === 'memory' && (
              <div className="p-3 space-y-1.5">
                {memoryEntries.length === 0 ? (
                  <div className="text-xs text-[#9B9B9B] p-2">暂无记忆条目。每次 observation 会产生新的记忆。</div>
                ) : (
                  memoryEntries.map((entry) => (
                    <div key={entry.id} className="bg-[#F8F8F8] rounded-lg p-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] px-1 py-0 rounded font-medium ${
                          entry.type === 'observation' ? 'bg-[#2DA44E]/10 text-[#2DA44E]' :
                          entry.type === 'file_state' ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' :
                          entry.type === 'repo_fact' ? 'bg-[#D48C20]/10 text-[#D48C20]' :
                          'bg-[#9B9B9B]/10 text-[#9B9B9B]'
                        }`}>
                          {entry.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#1A1A1A] leading-relaxed">{entry.content}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Replay view ──
function ReplayView() {
  const { replaySteps, currentReplayStep, setReplayStep, exitReplay } = useTraceStore()
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)

  const keyPoints = replaySteps
    .map((step, i) => {
      const hasTool = step.some(e => e.type === 'model_response' && e.label.includes('tool_call'))
      const hasDeny = step.some(e => e.type === 'policy_check' && e.label.includes('DENY'))
      const hasCompletion = step.some(e => e.type === 'completion')
      return { index: i, hasTool, hasDeny, hasCompletion }
    })
    .filter(kp => kp.hasTool || kp.hasDeny || kp.hasCompletion)

  const play = () => {
    if (currentReplayStep >= replaySteps.length - 1) setReplayStep(0)
    setPlaying(true)
  }

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
          {playing
            ? <button onClick={() => setPlaying(false)} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">⏸</button>
            : <button onClick={play} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">▶</button>
          }
          <button onClick={exitReplay} className="text-[10px] px-2 py-0.5 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5]">← 实时</button>
        </div>
      </div>

      <div className="relative h-8 mb-3 shrink-0">
        <div className="absolute inset-x-0 top-3 h-1 bg-[#E5E5E5] rounded-full" />
        <div className="absolute top-3 h-1 bg-[#5E6AD2] rounded-full transition-all" style={{ width: `${((currentReplayStep + 1) / replaySteps.length) * 100}%` }} />
        {keyPoints.map(kp => (
          <div key={kp.index} className="absolute top-1.5 w-5 h-5 rounded-full bg-white border-2 transition-colors cursor-pointer"
            style={{ left: `${((kp.index + 0.5) / replaySteps.length) * 100}%`, transform: 'translateX(-50%)',
              borderColor: kp.hasCompletion ? '#2DA44E' : kp.hasDeny ? '#D23B3B' : '#5E6AD2',
              backgroundColor: currentReplayStep >= kp.index ? (kp.hasCompletion ? '#2DA44E' : kp.hasDeny ? '#D23B3B' : '#5E6AD2') : 'white' }}
            onClick={() => setReplayStep(kp.index)}
          >
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-[#9B9B9B] whitespace-nowrap">
              {kp.hasCompletion ? '✓' : kp.hasDeny ? '✕' : '🔧'}
            </div>
          </div>
        ))}
      </div>

      <ContextMemoryPanel />

      <div className="flex-1 overflow-y-auto space-y-3">
        {replaySteps.map((step, si) => (
          <div key={si} className={`rounded-xl border overflow-hidden transition-all ${si === currentReplayStep ? 'border-[#5E6AD2] shadow-sm' : 'border-[#E5E5E5] opacity-60'}`}>
            <button onClick={() => setReplayStep(si)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${si === currentReplayStep ? 'bg-[#5E6AD2]' : 'bg-[#D0D0D0]'}`}>{si + 1}</span>
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
        <p className="text-sm text-[#9B9B9B]">发送消息后实时展示</p>
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
          <button onClick={startReplay} className="text-[10px] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5] hover:border-[#5E6AD2] text-[#5E6AD2] font-medium transition-colors">▶ 回放</button>
          <button onClick={clearEvents} className="text-[10px] px-2 py-1 rounded border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#9B9B9B] transition-colors">清除</button>
        </div>
      </div>

      {/* Context & Memory panel — persists across the stream */}
      <ContextMemoryPanel />

      {/* Event stream */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {events.map(evt => <EventRow key={evt.id} event={evt} />)}
        <div ref={endRef} />
      </div>
    </div>
  )
}