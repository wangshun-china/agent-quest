import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTraceStore, type TraceEvent } from '../../store/traceStore'
import Button from '../ui/Button'

function EventCard({ event, isFirst }: { event: TraceEvent; isFirst: boolean }) {
  const typeStyles: Record<string, string> = {
    system_context: 'border-[#787F95]/30 bg-[#F5F5F8]',
    user_message: 'border-[#5E6AD2]/30 bg-[#F0F1FF]',
    tools_schema: 'border-[#787F95]/30 bg-[#F8F8F8]',
    model_request: 'border-[#5E6AD2]/20 bg-white',
    model_response: 'border-[#5E6AD2]/30 bg-[#F8F9FF]',
    policy_check: 'border-[#D48C20]/30 bg-[#FFFBF0]',
    tool_execute: 'border-[#787F95]/30 bg-white',
    observation: 'border-[#2DA44E]/20 bg-[#F8FFF8]',
    context_update: 'border-[#787F95]/20 bg-[#FAFAFA]',
    completion: 'border-[#2DA44E]/40 bg-[#F0F9F2]',
    error: 'border-[#D23B3B]/30 bg-[#FFF5F5]',
  }

  const typeIcons: Record<string, string> = {
    system_context: '📋',
    user_message: '👤',
    tools_schema: '🔧',
    model_request: '📤',
    model_response: '📥',
    policy_check: '🛡',
    tool_execute: '⚙',
    observation: '👁',
    context_update: '🧠',
    completion: '✅',
    error: '❌',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-lg border px-3 py-2.5 text-xs ${typeStyles[event.type] || 'border-[#E5E5E5] bg-white'}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span>{typeIcons[event.type] || '•'}</span>
        <span className="font-medium text-[#1A1A1A]">{event.label}</span>
      </div>
      {event.detail && (
        <div className="text-[#6B6B6B] leading-relaxed whitespace-pre-wrap">{event.detail}</div>
      )}
      {Object.keys(event.data).length > 0 && (
        <div className="mt-1.5 space-y-1">
          {Object.entries(event.data).map(([key, value]) => {
            const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
            const display = str.length > 200 ? str.slice(0, 200) + '…' : str
            return (
              <div key={key} className="flex gap-2">
                <span className="text-[#9B9B9B] shrink-0 font-medium">{key}</span>
                <span className="text-[#1A1A1A] font-mono leading-relaxed break-all">{display}</span>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default function TraceStream() {
  const { events, replayMode, replaySteps, startReplay, exitReplay, clearEvents } = useTraceStore()
  const endRef = useRef<HTMLDivElement>(null)
  const hasEvents = events.length > 0

  useEffect(() => {
    if (!replayMode) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, replayMode])

  if (!hasEvents) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <div className="text-3xl mb-3 opacity-30">🔍</div>
        <p className="text-sm text-[#9B9B9B] leading-relaxed">
          发送第一条消息后，<br />
          这里会实时展示 Agent 内部<br />
          所有的数据流动
        </p>
        <p className="text-xs text-[#D0D0D0] mt-2">
          System Prompt · Messages · Tools<br />
          Policy · Execution · Observation<br />
          Context · Memory · Completion
        </p>
      </div>
    )
  }

  if (replayMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-xs font-medium text-[#1A1A1A]">
            回放模式 · {replaySteps.length} 步
          </span>
          <Button size="sm" variant="ghost" onClick={exitReplay}>← 实时视图</Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          {replaySteps.map((step, si) => (
            <div key={si} className="border border-[#E5E5E5] rounded-xl overflow-hidden">
              <div className="bg-[#FAFAFA] px-3 py-2 border-b border-[#E5E5E5] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5E6AD2] text-white text-xs flex items-center justify-center font-medium">
                  {si + 1}
                </span>
                <span className="text-xs font-medium text-[#1A1A1A]">Step {si + 1}</span>
              </div>
              <div className="p-2 space-y-1.5">
                {step.map((evt) => (
                  <EventCard key={evt.id} event={evt} isFirst={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs font-medium text-[#1A1A1A]">
          🔴 实时追踪 · {events.length} 事件
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={startReplay} disabled={events.length < 2}>
            ▶ 回放
          </Button>
          <Button size="sm" variant="ghost" onClick={clearEvents}>
            清除
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {events.map((evt) => (
          <EventCard key={evt.id} event={evt} isFirst={false} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}