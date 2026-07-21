import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GlassNode, GlassPipeline } from '../../harness/pipeline'

interface Props {
  pipeline: GlassPipeline
  preferExpandId?: string
  history?: GlassPipeline[]
  onSelectHistory?: (index: number) => void
  animateReveal?: boolean
}

/** Node id / label → vivid icon + accent */
function nodeVisual(n: GlassNode): { icon: string; accent: string; subtitle: string } {
  const id = n.id.toLowerCase()
  const label = n.label.toLowerCase()
  if (id.includes('context') || label.includes('context'))
    return { icon: '📦', accent: '#5E6AD2', subtitle: '组装上下文' }
  if (id.includes('intent') || id.includes('model') || label.includes('decision') || label.includes('model'))
    return { icon: '🧠', accent: '#5E6AD2', subtitle: '模型意图' }
  if (id.includes('registry') || label.includes('registry'))
    return { icon: '📇', accent: '#787F95', subtitle: '工具注册表' }
  if (id.includes('policy') || label.includes('policy'))
    return { icon: '🛡', accent: '#787F95', subtitle: '权限裁决' }
  if (id.includes('approval') || label.includes('approval'))
    return { icon: '✋', accent: '#D48C20', subtitle: '人工审批' }
  if (id.includes('repair') || label.includes('repair'))
    return { icon: '🔁', accent: '#D48C20', subtitle: '修复守卫' }
  if (id.includes('execute') || label.includes('execute') || label.includes('tool'))
    return { icon: '⚡', accent: '#787F95', subtitle: '执行器' }
  if (id.includes('observation') || label.includes('observation'))
    return { icon: '👁', accent: '#5E6AD2', subtitle: '回传观察' }
  if (id.includes('plan') || label.includes('plan'))
    return { icon: '🗺', accent: '#787F95', subtitle: '计划检查' }
  if (id.includes('completion') || id.includes('final') || label.includes('completion') || label.includes('final'))
    return { icon: '🏁', accent: '#2DA44E', subtitle: '完成判定' }
  if (id.includes('halt') || id.includes('truncat') || n.status === 'error')
    return { icon: '🛑', accent: '#D23B3B', subtitle: '路径截断' }
  if (id.includes('progress'))
    return { icon: '📈', accent: '#2DA44E', subtitle: '进展标记' }
  if (id.includes('user'))
    return { icon: '👤', accent: '#5E6AD2', subtitle: '用户' }
  if (id.includes('workspace'))
    return { icon: '📁', accent: '#787F95', subtitle: '工作区' }
  return n.kind === 'model'
    ? { icon: '🧠', accent: '#5E6AD2', subtitle: 'Model' }
    : { icon: '⚙️', accent: '#787F95', subtitle: 'Harness' }
}

function branchMeta(branch: string): { label: string; color: string; blurb: string } {
  switch (branch) {
    case 'deny_truncated':
      return { label: '截断', color: '#D23B3B', blurb: 'Policy 拒绝 · 不执行工具' }
    case 'ask_gate':
      return { label: '审批闸', color: '#D48C20', blurb: '需要 Approval 才能继续' }
    case 'repair_block':
      return { label: '防空转', color: '#D23B3B', blurb: '无进展重复验证被拦截' }
    case 'wrong_choice':
      return { label: '错误路径', color: '#D23B3B', blurb: '教学：展示为何走不通' }
    case 'final_path':
      return { label: '收尾', color: '#2DA44E', blurb: 'Plan + Policy + Completion' }
    case 'tool_path':
    case 'react_step':
      return { label: '执行链', color: '#2DA44E', blurb: 'Intent → Policy → Tool → Observe' }
    case 'event_step':
      return { label: '回放', color: '#5E6AD2', blurb: '只读消费 event_log' }
    case 'model_wait':
      return { label: '等模型', color: '#D48C20', blurb: '真实 HTTP 请求进行中 · 通常需数秒' }
    default:
      return { label: '待命', color: '#9B9B9B', blurb: '等待你的操作' }
  }
}

function FlowConnector({ broken, skipped }: { broken?: boolean; skipped?: boolean }) {
  const stroke = broken ? '#D23B3B' : skipped ? '#D0D0D0' : '#5E6AD2'
  return (
    <div className="relative w-10 h-16 flex items-center justify-center shrink-0">
      <svg width="40" height="24" viewBox="0 0 40 24" className="overflow-visible">
        <defs>
          <linearGradient id={`g-${broken ? 'e' : skipped ? 's' : 'ok'}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
            <stop offset="50%" stopColor={stroke} stopOpacity="0.9" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <line
          x1="2"
          y1="12"
          x2="30"
          y2="12"
          stroke={`url(#g-${broken ? 'e' : skipped ? 's' : 'ok'})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          className={broken || skipped ? '' : 'flow-line'}
          strokeDasharray={broken ? '4 4' : skipped ? '2 4' : '6 6'}
        />
        {broken ? (
          <text x="32" y="16" fontSize="12" fill="#D23B3B">
            ⟂
          </text>
        ) : (
          <polygon points="30,7 38,12 30,17" fill={stroke} opacity={skipped ? 0.35 : 0.85} />
        )}
      </svg>
    </div>
  )
}

function GlassCard({
  n,
  expanded,
  onToggle,
}: {
  n: GlassNode
  expanded: boolean
  onToggle: () => void
}) {
  const v = nodeVisual(n)
  const isError = n.status === 'error' || n.status === 'blocked'
  const isDone = n.status === 'done'
  const isActive = n.status === 'active'
  const isSkipped = n.status === 'skipped'

  const glow = isError
    ? 'glow-error'
    : isDone
      ? 'glow-success'
      : n.kind === 'model'
        ? 'glow-model'
        : 'glow-harness'

  return (
    <motion.div
      // Avoid opacity:0 initial — live mode updates fast and cards were staying "blank"
      initial={false}
      animate={{ opacity: isSkipped ? 0.55 : 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className="relative flex flex-col items-stretch min-w-[128px] max-w-[148px]"
    >
      {isActive && (
        <span
          className="absolute inset-0 rounded-2xl pulse-ring pointer-events-none"
          style={{ borderColor: v.accent }}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        className={`
          relative rounded-2xl border text-left transition-all duration-200
          glass-panel overflow-hidden
          ${expanded ? 'ring-2 ring-offset-1' : ''}
          ${isError ? 'border-[#D23B3B]/50' : isDone ? 'border-[#2DA44E]/40' : 'border-white/80'}
          ${isSkipped ? 'border-dashed border-[#D0D0D0]' : glow}
          hover:-translate-y-0.5
        `}
        style={
          expanded
            ? ({ ['--tw-ring-color' as string]: v.accent } as React.CSSProperties)
            : undefined
        }
      >
        {/* top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${v.accent}, transparent)`,
          }}
        />
        <div className="px-3 pt-2.5 pb-3">
          <div className="flex items-start justify-between gap-1 mb-2">
            <span
              className="text-2xl leading-none select-none"
              style={{ filter: isSkipped ? 'grayscale(1)' : undefined }}
            >
              {v.icon}
            </span>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                n.kind === 'model'
                  ? 'bg-[#5E6AD2]/12 text-[#5E6AD2]'
                  : 'bg-[#787F95]/12 text-[#5A6178]'
              }`}
            >
              {n.kind === 'model' ? '大脑' : '身体'}
            </span>
          </div>
          <div className="text-[12px] font-semibold text-[#1A1A1A] leading-snug">{n.label}</div>
          <div className="text-[10px] text-[#9B9B9B] mt-0.5">{v.subtitle}</div>
          {n.chip && (
            <span
              className="inline-block mt-2 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full"
              style={{
                background: `${v.accent}18`,
                color: isError ? '#CF222E' : v.accent,
              }}
            >
              {n.chip}
            </span>
          )}
          <div className="text-[9px] text-[#B0B0B0] mt-2 flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive
                  ? 'bg-[#5E6AD2]'
                  : isDone
                    ? 'bg-[#2DA44E]'
                    : isError
                      ? 'bg-[#D23B3B]'
                      : 'bg-[#D0D0D0]'
              }`}
            />
            {expanded ? '点击收起' : '点击看内部'}
          </div>
        </div>
      </button>
    </motion.div>
  )
}

function JsonBlock({ data }: { data: unknown }) {
  const text = JSON.stringify(data, null, 2)
  // lightweight highlight: keys vs values via simple split is fragile; show as pretty block
  return (
    <pre className="text-[11px] font-mono leading-relaxed rounded-xl p-3 overflow-x-auto max-h-64 bg-gradient-to-br from-[#0F1117] to-[#1A1A2E] text-[#D4D8E8] border border-white/5">
      {text.split('\n').map((line, i) => {
        const keyMatch = line.match(/^(\s*)("(?:\\.|[^"\\])*")(\s*:)(.*)$/)
        if (keyMatch) {
          return (
            <div key={i}>
              <span>{keyMatch[1]}</span>
              <span className="text-[#A8B4FF]">{keyMatch[2]}</span>
              <span className="text-[#6B7280]">{keyMatch[3]}</span>
              <span className="text-[#7EE787]">{keyMatch[4]}</span>
            </div>
          )
        }
        return <div key={i}>{line}</div>
      })}
    </pre>
  )
}

function EmptyPipelineArt() {
  return (
    <div className="relative py-8 px-4 text-center overflow-hidden rounded-2xl mesh-bg border border-[#E8EAF5]">
      <div className="flex items-center justify-center gap-2 mb-4 opacity-90">
        {['🧠', '🛡', '⚡', '👁'].map((ic, i) => (
          <div key={ic} className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded-2xl glass-panel border border-white shadow-sm flex items-center justify-center text-xl float-soft"
              style={{ animationDelay: `${i * 0.25}s` }}
            >
              {ic}
            </div>
            {i < 3 && (
              <span className="text-[#C5CAE8] text-sm">→</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-[#3D3D4A]">透明管道待命中</p>
      <p className="text-xs text-[#8B8B9A] mt-1 max-w-[220px] mx-auto leading-relaxed">
        在中间操作一步，数据会从「大脑」流进「身体」——点亮每个零件
      </p>
    </div>
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
  // Animated reveal uses a counter; live mode passes animateReveal=false and must
  // show ALL nodes on the same render (effect-lag left the rail blank before).
  const [revealCount, setRevealCount] = useState(() =>
    animateReveal ? 0 : Math.max(pipeline.nodes.length, 0),
  )
  const pipelineKey = `${pipeline.title}|${pipeline.branch}|${pipeline.nodes.map((n) => `${n.id}:${n.status}:${n.chip || ''}`).join(',')}`
  const meta = branchMeta(pipeline.branch)

  useEffect(() => {
    if (!animateReveal) {
      setRevealCount(pipeline.nodes.length)
      const auto =
        preferExpandId ||
        pipeline.nodes.find((n) => n.status === 'error' || n.status === 'active')?.id ||
        pipeline.nodes.find((n) =>
          ['policy', 'repair_guard', 'observation', 'model', 'halt'].includes(n.id),
        )?.id ||
        pipeline.nodes[pipeline.nodes.length - 1]?.id ||
        null
      if (auto) setExpandedId(auto)
      return
    }
    setRevealCount(0)
    setExpandedId(null)
    let i = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const tick = () => {
      i += 1
      setRevealCount(i)
      if (i < pipeline.nodes.length) {
        timers.push(setTimeout(tick, 160))
      } else {
        const auto =
          preferExpandId ||
          pipeline.nodes.find((n) => n.status === 'error' || n.status === 'active')?.id ||
          pipeline.nodes.find((n) =>
            ['policy', 'repair_guard', 'observation', 'halt'].includes(n.id),
          )?.id ||
          pipeline.nodes[pipeline.nodes.length - 1]?.id ||
          null
        if (auto) setExpandedId(auto)
      }
    }
    timers.push(setTimeout(tick, 60))
    return () => timers.forEach(clearTimeout)
  }, [pipelineKey, animateReveal, preferExpandId, pipeline.nodes])

  // Critical: when not animating, never slice to a stale 0 — always show full rail.
  const visibleCount = animateReveal ? revealCount : pipeline.nodes.length
  const shown = pipeline.nodes.slice(0, visibleCount)
  const openId = expandedId && shown.some((n) => n.id === expandedId) ? expandedId : null
  const openNode = shown.find((n) => n.id === openId)
  const modelCount = pipeline.nodes.filter((n) => n.kind === 'model').length
  const harnessCount = pipeline.nodes.filter((n) => n.kind === 'harness').length

  return (
    <div className="h-full flex flex-col gap-3 min-h-0 pretty-scroll">
      {/* Hero header */}
      <div className="mesh-dark rounded-2xl p-4 text-white shrink-0 relative overflow-hidden border border-white/10 shadow-[0_16px_40px_-20px_rgba(20,20,50,0.55)]">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-[#5E6AD2]/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full bg-violet-500/15 blur-2xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#A8B4FF] font-medium">
                Glass Pipeline
              </span>
              {visibleCount < pipeline.nodes.length && (
                <span className="text-[10px] text-[#C4CBFF] animate-pulse">点亮中…</span>
              )}
            </div>
            <h3 className="text-[15px] font-semibold tracking-tight font-display">{pipeline.title}</h3>
            <p className="text-[11px] text-[#B0B8D0] mt-1.5 leading-relaxed max-w-sm">
              {pipeline.summary}
            </p>
          </div>
          <div
            className="shrink-0 text-center rounded-xl px-2.5 py-2 border border-white/12 bg-white/[0.06] min-w-[68px] backdrop-blur-sm"
            style={{ boxShadow: `inset 0 0 0 1px ${meta.color}40, 0 0 20px ${meta.color}22` }}
          >
            <div className="text-[9px] text-[#8B93A8] uppercase tracking-wide">分支</div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: meta.color }}>
              {meta.label}
            </div>
          </div>
        </div>

        {/* Brain vs Body metaphor bar */}
        <div className="relative mt-3 flex items-center gap-2 text-[10px]">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-[#5E6AD2] to-[#7B85E0] transition-all duration-500"
              style={{
                width: `${Math.max(12, (modelCount / Math.max(1, modelCount + harnessCount)) * 100)}%`,
              }}
            />
            <div
              className="h-full bg-gradient-to-r from-[#6B7280] to-[#9CA3AF] transition-all duration-500"
              style={{
                width: `${Math.max(12, (harnessCount / Math.max(1, modelCount + harnessCount)) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-[#9B9B9B]">
          <span>🧠 大脑 Model ×{modelCount}</span>
          <span>⚙️ 身体 Harness ×{harnessCount}</span>
        </div>
        <p className="text-[10px] text-[#7A8499] mt-2">{meta.blurb}</p>
      </div>

      {/* History as film strip */}
      {history.length > 0 && (
        <div className="glass-panel rounded-2xl border border-[#E5E5E5] px-3 py-2.5 shrink-0">
          <div className="text-[10px] text-[#9B9B9B] mb-2 flex items-center gap-1.5">
            <span>🎞</span> 步骤胶片
          </div>
          <div className="flex gap-2 overflow-x-auto pretty-scroll pb-0.5">
            {history.map((h, i) => {
              const active = h.title === pipeline.title && h.summary === pipeline.summary
              const bm = branchMeta(h.branch)
              return (
                <button
                  key={`${h.title}-${i}`}
                  type="button"
                  onClick={() => onSelectHistory?.(i)}
                  className={`shrink-0 w-[88px] rounded-xl border p-2 text-left transition-all ${
                    active
                      ? 'border-[#5E6AD2] bg-[#5E6AD2]/8 shadow-sm'
                      : 'border-[#EBEBEB] hover:border-[#C5CAE8] bg-white/60'
                  }`}
                  title={h.summary}
                >
                  <div
                    className="text-[9px] font-semibold mb-0.5"
                    style={{ color: bm.color }}
                  >
                    {h.stepIndex != null ? `Step ${h.stepIndex}` : `#${i + 1}`}
                  </div>
                  <div className="text-[10px] text-[#6B6B6B] truncate">{bm.label}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pipeline rail */}
      <div className="glass-panel rounded-2xl border border-[#E8EAF5] p-3 shrink-0 shadow-sm">
        {pipeline.nodes.length === 0 ? (
          // Should be rare after emptyPipeline skeleton; keep fallback art
          <EmptyPipelineArt />
        ) : (
          <div className="flex items-center gap-0 overflow-x-auto pretty-scroll pb-1 min-h-[132px] px-1">
            {shown.map((n, i) => (
              <div key={n.id} className="flex items-center shrink-0">
                <GlassCard
                  n={n}
                  expanded={openId === n.id}
                  onToggle={() => setExpandedId(openId === n.id ? null : n.id)}
                />
                {i < shown.length - 1 && (
                  <FlowConnector
                    broken={n.status === 'error' || n.status === 'blocked'}
                    skipped={n.status === 'skipped'}
                  />
                )}
              </div>
            ))}
            {visibleCount < pipeline.nodes.length && (
              <div className="ml-3 flex items-center gap-1 text-[#9B9B9B]">
                <span className="w-2 h-2 rounded-full bg-[#5E6AD2] animate-pulse" />
                <span className="text-[10px]">流入下一站…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded internals */}
      <div className="flex-1 min-h-0 overflow-y-auto pretty-scroll">
        <AnimatePresence mode="wait">
          {openNode ? (
            <motion.div
              key={openNode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="rounded-2xl border border-[#E8EAF5] overflow-hidden bg-white shadow-sm"
            >
              <div
                className="px-4 py-3 flex items-center justify-between border-b border-[#F0F0F5]"
                style={{
                  background: `linear-gradient(90deg, ${nodeVisual(openNode).accent}14, transparent)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{nodeVisual(openNode).icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-[#1A1A1A]">{openNode.label}</div>
                    <div className="text-[11px] text-[#8B8B9A] mt-0.5">{openNode.note}</div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                    openNode.kind === 'model'
                      ? 'bg-[#5E6AD2]/12 text-[#5E6AD2]'
                      : 'bg-[#787F95]/12 text-[#5A6178]'
                  }`}
                >
                  {openNode.kind === 'model' ? '🧠 大脑层' : '⚙️ 身体层'}
                </span>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3 rounded-full bg-[#5E6AD2]" />
                  此刻内部快照
                </div>
                <JsonBlock data={openNode.data} />
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-10 text-xs text-[#9B9B9B]">
              {visibleCount < pipeline.nodes.length
                ? '零件正在装配…'
                : pipeline.nodes.length
                  ? '点选上方玻璃节点，拆开看内部'
                  : ''}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
