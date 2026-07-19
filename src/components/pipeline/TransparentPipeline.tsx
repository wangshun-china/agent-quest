import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GlassNode, GlassPipeline } from '../../harness/pipeline'

interface Props {
  pipeline: GlassPipeline
  /** Auto-expand this node id when pipeline changes */
  preferExpandId?: string
  /** Previous steps for multi-step exploration feel */
  history?: GlassPipeline[]
  onSelectHistory?: (index: number) => void
  /** When true, nodes reveal one-by-one */
  animateReveal?: boolean
}

const statusRing: Record<string, string> = {
  idle: 'border-[#E5E5E5] bg-white',
  active: 'border-[#5E6AD2] bg-white ring-2 ring-[#5E6AD2]/25',
  done: 'border-[#2DA44E]/50 bg-[#F0F9F2]',
  error: 'border-[#D23B3B]/60 bg-[#FEF2F2]',
  skipped: 'border-dashed border-[#D0D0D0] bg-[#F8F8F8] opacity-70',
  blocked: 'border-[#D23B3B] bg-[#FEF2F2]',
}

const chipColor: Record<string, string> = {
  ALLOW: 'bg-[#2DA44E]/15 text-[#1A7F37]',
  DENY: 'bg-[#D23B3B]/15 text-[#CF222E]',
  ASK: 'bg-[#D48C20]/15 text-[#9A6700]',
  BLOCK: 'bg-[#D23B3B]/15 text-[#CF222E]',
  pass: 'bg-[#2DA44E]/15 text-[#1A7F37]',
  skipped: 'bg-[#E5E5E5] text-[#9B9B9B]',
  blocked: 'bg-[#D23B3B]/15 text-[#CF222E]',
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] font-mono bg-[#0F1117] text-[#E6E6E6] rounded-lg p-3 overflow-x-auto max-h-64 leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function GlassCard({
  n,
  expanded,
  onToggle,
  delay = 0,
}: {
  n: GlassNode
  expanded: boolean
  onToggle: () => void
  delay?: number
}) {
  const chipCls =
    chipColor[n.chip || ''] ||
    (n.kind === 'model' ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' : 'bg-[#787F95]/10 text-[#787F95]')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.22 }}
      className="flex flex-col items-stretch min-w-[112px] max-w-[140px]"
    >
      <button
        type="button"
        onClick={onToggle}
        className={`
          relative rounded-xl border-2 px-2.5 py-3 text-left transition-all
          backdrop-blur-sm shadow-sm hover:scale-[1.03] active:scale-[0.98]
          ${statusRing[n.status] || statusRing.idle}
          ${expanded ? 'shadow-md' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span
            className={`text-[9px] uppercase tracking-wider font-semibold ${
              n.kind === 'model' ? 'text-[#5E6AD2]' : 'text-[#787F95]'
            }`}
          >
            {n.kind === 'model' ? '🧠 Model' : '⚙️ Harness'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              n.status === 'active'
                ? 'bg-[#5E6AD2] animate-pulse'
                : n.status === 'done'
                  ? 'bg-[#2DA44E]'
                  : n.status === 'error' || n.status === 'blocked'
                    ? 'bg-[#D23B3B]'
                    : 'bg-[#D0D0D0]'
            }`}
          />
        </div>
        <div className="text-[11px] font-semibold text-[#1A1A1A] leading-tight">{n.label}</div>
        {n.chip && (
          <span className={`inline-block mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded ${chipCls}`}>
            {n.chip}
          </span>
        )}
        <div className="text-[9px] text-[#9B9B9B] mt-1.5">
          {expanded ? '收起 ▲' : '内部数据 ▼'}
        </div>
      </button>
    </motion.div>
  )
}

export default function TransparentPipeline({
  pipeline,
  preferExpandId,
  history = [],
  onSelectHistory,
  animateReveal = true,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(pipeline.nodes.length)
  const pipelineKey = `${pipeline.title}|${pipeline.branch}|${pipeline.nodes.map((n) => n.id).join(',')}`

  // Stagger node reveal when pipeline changes
  useEffect(() => {
    if (!animateReveal || pipeline.nodes.length === 0) {
      setVisibleCount(pipeline.nodes.length)
      return
    }
    setVisibleCount(0)
    setExpandedId(null)
    let i = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const tick = () => {
      i += 1
      setVisibleCount(i)
      if (i < pipeline.nodes.length) {
        timers.push(setTimeout(tick, 140))
      } else {
        // auto-expand key node after full reveal
        const auto =
          preferExpandId ||
          pipeline.nodes.find((n) => n.status === 'error' || n.status === 'active')?.id ||
          pipeline.nodes.find((n) => n.id === 'policy' || n.id === 'repair_guard' || n.id === 'observation')
            ?.id ||
          pipeline.nodes[pipeline.nodes.length - 1]?.id ||
          null
        if (auto) setExpandedId(auto)
      }
    }
    timers.push(setTimeout(tick, 80))
    return () => timers.forEach(clearTimeout)
  }, [pipelineKey, animateReveal, preferExpandId, pipeline.nodes])

  const shown = pipeline.nodes.slice(0, visibleCount)
  const openId =
    expandedId && shown.some((n) => n.id === expandedId) ? expandedId : null
  const openNode = shown.find((n) => n.id === openId)

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#16213E] rounded-xl p-4 text-white shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-widest text-[#8B9DC3]">Transparent</span>
          <span className="text-[10px] text-[#A8B4FF]">探索版</span>
          {visibleCount < pipeline.nodes.length && (
            <span className="text-[10px] text-[#5E6AD2] animate-pulse">revealing…</span>
          )}
        </div>
        <h3 className="text-sm font-semibold">{pipeline.title}</h3>
        <p className="text-[11px] text-[#B8C4CE] mt-1 leading-relaxed">{pipeline.summary}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[9px]">
          <span className="px-1.5 py-0.5 rounded bg-white/10">branch: {pipeline.branch}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#5E6AD2]/30">🧠 Model</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10">⚙️ Harness</span>
        </div>
      </div>

      {/* Step history strip */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] px-3 py-2 shrink-0">
          <div className="text-[10px] text-[#9B9B9B] mb-1.5">步骤历史（点选回看）</div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {history.map((h, i) => {
              const active = h.title === pipeline.title && h.summary === pipeline.summary
              return (
                <button
                  key={`${h.title}-${i}`}
                  type="button"
                  onClick={() => onSelectHistory?.(i)}
                  className={`shrink-0 text-[10px] px-2 py-1 rounded-lg border font-mono max-w-[140px] truncate ${
                    active
                      ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 text-[#5E6AD2]'
                      : 'border-[#E5E5E5] text-[#6B6B6B] hover:border-[#5E6AD2]/40'
                  }`}
                  title={h.summary}
                >
                  {h.stepIndex != null ? `S${h.stepIndex}` : i + 1}: {h.branch}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pipeline row */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 shrink-0">
        {pipeline.nodes.length === 0 ? (
          <p className="text-xs text-[#9B9B9B] text-center py-6 px-2">
            在中间操作后，数据流会在这里逐节点点亮。点击节点展开内部 JSON。
          </p>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 min-h-[96px]">
            {shown.map((n, i) => (
              <div key={n.id} className="flex items-center gap-1 shrink-0">
                <GlassCard
                  n={n}
                  expanded={openId === n.id}
                  onToggle={() => setExpandedId(openId === n.id ? null : n.id)}
                  delay={0}
                />
                {i < shown.length - 1 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-lg px-0.5 ${
                      n.status === 'error' || n.status === 'blocked'
                        ? 'text-[#D23B3B]'
                        : n.status === 'skipped'
                          ? 'text-[#D0D0D0]'
                          : 'text-[#C0C0C0]'
                    }`}
                  >
                    {n.status === 'error' || n.status === 'blocked' ? '⟂' : '→'}
                  </motion.span>
                )}
              </div>
            ))}
            {visibleCount < pipeline.nodes.length && (
              <span className="text-xs text-[#9B9B9B] ml-2 animate-pulse">···</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded internals */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {openNode ? (
            <motion.div
              key={openNode.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#1A1A1A]">{openNode.label}</div>
                  <div className="text-[10px] text-[#9B9B9B] mt-0.5">{openNode.note}</div>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    openNode.kind === 'model'
                      ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]'
                      : 'bg-[#787F95]/10 text-[#787F95]'
                  }`}
                >
                  {openNode.kind}
                </span>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-2">
                  内部数据（此刻快照）
                </div>
                <JsonBlock data={openNode.data} />
              </div>
            </motion.div>
          ) : (
            <div className="text-xs text-[#9B9B9B] text-center py-8">
              {visibleCount < pipeline.nodes.length ? '管道点亮中…' : '选择上方节点查看内部'}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
