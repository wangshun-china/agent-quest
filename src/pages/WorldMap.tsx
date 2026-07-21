import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProgressStore } from '../store/progressStore'
import { LEVEL_REGISTRY } from '../levels/registry'

const ZONES = [
  { id: 1, name: '核心循环', subtitle: 'Core Loop', icon: '🏁', accent: '#5E6AD2' },
  { id: 2, name: '工具与安全', subtitle: 'Tools & Safety', icon: '🔧', accent: '#D48C20' },
  { id: 3, name: '上下文与记忆', subtitle: 'Context & Memory', icon: '🧠', accent: '#8B5CF6' },
  { id: 4, name: '观测与评测', subtitle: 'Observability', icon: '📊', accent: '#2DA44E' },
  { id: 5, name: '进阶扩展', subtitle: 'Advanced', icon: '🚀', accent: '#0EA5E9' },
]

/** All 22 design levels now on glass/live path (or dedicated glass labs) */
const GLASS_LEVELS = new Set(
  [
    '1.1-boundary',
    '1.2-react-loop',
    '1.3-model-client',
    '1.4-function-calling',
    '2.1-tool-registry',
    '2.2-runtime-policy',
    '2.3-code-edit',
    '2.4-verification',
    '3.1-context-engineering',
    '3.2-planning',
    '3.3-project-explore',
    '3.4-memory',
    '3.5-completion',
    '4.1-observability',
    '4.2-evaluation',
    '4.3-hitl',
    '4.4-sandbox',
    '5.1-multi-agent',
    '5.2-mcp',
    '5.3-routing',
    '5.4-java-spring',
    '5.5-capstone',
  ],
)

const RECOMMENDED = [
  { id: '1.1-boundary', label: '边界', icon: '🧩' },
  { id: '1.2-react-loop', label: 'ReAct', icon: '🔄' },
  { id: '2.2-runtime-policy', label: 'Policy', icon: '🛡' },
  { id: '2.3-code-edit', label: 'Edit', icon: '✏️' },
  { id: '2.4-verification', label: 'Repair', icon: '🔁' },
  { id: '4.1-observability', label: 'Trace', icon: '🎞' },
  { id: '4.3-hitl', label: '审批', icon: '✋' },
  { id: '5.5-capstone', label: '毕业', icon: '🎓' },
]

function MiniPipelinePreview() {
  const nodes = [
    { icon: '🧠', label: 'Model', color: '#7B85E0' },
    { icon: '🛡', label: 'Policy', color: '#9CA3AF' },
    { icon: '⚡', label: 'Tool', color: '#F0B429' },
    { icon: '👁', label: 'Observe', color: '#4ADE80' },
  ]
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-4">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex items-center gap-1 sm:gap-2">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.09, type: 'spring', stiffness: 320, damping: 22 }}
            className="relative w-[3.6rem] h-[3.6rem] sm:w-[4.25rem] sm:h-[4.25rem] rounded-2xl flex flex-col items-center justify-center float-soft border border-white/15"
            style={{
              animationDelay: `${i * 0.28}s`,
              background: `linear-gradient(155deg, ${n.color}28, rgba(255,255,255,0.06))`,
              boxShadow: `0 12px 32px -12px ${n.color}99, inset 0 1px 0 rgba(255,255,255,0.15)`,
            }}
          >
            <span className="text-xl sm:text-2xl leading-none drop-shadow-sm">{n.icon}</span>
            <span className="text-[9px] mt-1 font-semibold tracking-wide" style={{ color: n.color }}>
              {n.label}
            </span>
          </motion.div>
          {i < nodes.length - 1 && (
            <svg width="32" height="18" className="hidden sm:block opacity-80">
              <defs>
                <linearGradient id={`flow-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={n.color} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={nodes[i + 1].color} stopOpacity="0.85" />
                </linearGradient>
              </defs>
              <line
                x1="2"
                y1="9"
                x2="22"
                y2="9"
                stroke={`url(#flow-${i})`}
                strokeWidth="2.2"
                className="flow-line"
                strokeDasharray="5 5"
                strokeLinecap="round"
              />
              <polygon
                points="22,5 30,9 22,13"
                fill={nodes[i + 1].color}
                opacity="0.85"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

export default function WorldMap() {
  const navigate = useNavigate()
  const isCompleted = useProgressStore((s) => s.isCompleted)
  const glassDone = RECOMMENDED.filter((r) => isCompleted(r.id)).length

  return (
    <div className="min-h-screen mesh-bg">
      {/* Hero */}
      <div className="relative overflow-hidden noise-overlay">
        <div className="absolute inset-0 mesh-dark" />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black, transparent)',
          }}
        />
        {/* soft orbs */}
        <div className="absolute top-10 left-1/4 w-64 h-64 rounded-full bg-[#5E6AD2]/25 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-72 h-48 rounded-full bg-violet-500/15 blur-[90px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto pt-16 pb-12 px-6 text-center text-white z-[2]">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#B4BFFF] mb-5 px-3.5 py-1.5 rounded-full border border-white/12 bg-white/[0.06] shadow-[0_0_24px_rgba(94,106,210,0.2)]"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#818CF8] opacity-70" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#A5B4FC]" />
            </span>
            Transparent Exploration
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-[2.15rem] sm:text-5xl font-bold tracking-tight mb-4 text-gradient"
          >
            Agent Quest
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm sm:text-[15px] text-[#A8B0C8] max-w-xl mx-auto leading-relaxed"
          >
            拆开一部透明机芯：左侧读概念，中间拧旋钮，右侧看
            <span className="text-[#C4CBFF] font-medium"> 大脑决策 </span>
            与
            <span className="text-[#D1D5DB] font-medium"> 身体约束 </span>
            如何交接——失败路径同样清晰可见。
          </motion.p>

          <div className="mt-7">
            <MiniPipelinePreview />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            {RECOMMENDED.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  const level = LEVEL_REGISTRY.find((l) => l.id === r.id)
                  if (level) navigate(`/play/zone${level.zone}/${level.id}`)
                }}
                className="group text-[11px] pl-2 pr-2.5 py-1.5 rounded-xl border border-white/12 bg-white/[0.05] hover:bg-white/[0.12] text-[#D4DAF0] transition-all hover:-translate-y-0.5 hover:border-white/25"
              >
                <span className="opacity-70 mr-1">{i + 1}</span>
                <span className="mr-1">{r.icon}</span>
                {r.label}
                {isCompleted(r.id) ? (
                  <span className="ml-1 text-emerald-400">✓</span>
                ) : null}
              </button>
            ))}
          </motion.div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="h-1 w-28 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(glassDone / RECOMMENDED.length) * 100}%` }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="h-full rounded-full bg-gradient-to-r from-[#5E6AD2] via-[#818CF8] to-[#34D399]"
              />
            </div>
            <p className="text-[11px] text-[#7A8499] tabular-nums">
              透明路径 {glassDone}/{RECOMMENDED.length}
            </p>
          </div>
        </div>
      </div>

      {/* Zones */}
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-12 space-y-11">
        {ZONES.map((zone, zi) => {
          const zoneLevels = LEVEL_REGISTRY.filter((l) => l.zone === zone.id).sort(
            (a, b) => a.order - b.order,
          )
          const completedCount = zoneLevels.filter((l) => isCompleted(l.id)).length
          if (zoneLevels.length === 0) return null
          const pct = zoneLevels.length ? (completedCount / zoneLevels.length) * 100 : 0

          return (
            <motion.section
              key={zone.id}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + zi * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl glass-panel border border-white flex items-center justify-center text-xl shadow-sm"
                  style={{
                    boxShadow: `0 10px 28px -14px ${zone.accent}88`,
                  }}
                >
                  {zone.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-[#14141f] font-display tracking-tight">
                    {zone.name}
                  </h2>
                  <p className="text-xs text-[#8B8FA3]">
                    {zone.subtitle} · {completedCount}/{zoneLevels.length}
                  </p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 w-28">
                  <span className="text-[10px] text-[#9B9B9B] tabular-nums">{Math.round(pct)}%</span>
                  <div className="w-full h-1.5 rounded-full bg-[#E6E8F2] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${zone.accent}, #34D399)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {zoneLevels.map((level, li) => {
                  const completed = isCompleted(level.id)
                  const isGlass = GLASS_LEVELS.has(level.id)

                  return (
                    <motion.button
                      key={level.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + zi * 0.04 + li * 0.025 }}
                      onClick={() => navigate(`/play/zone${level.zone}/${level.id}`)}
                      whileTap={{ scale: 0.985 }}
                      className={`
                        card-lift text-left p-4 rounded-2xl border
                        glass-panel group relative overflow-hidden
                        ${completed
                          ? 'border-emerald-400/35 shadow-[0_12px_32px_-16px_rgba(45,164,78,0.45)]'
                          : isGlass
                            ? 'border-[#5E6AD2]/28 shadow-[0_14px_36px_-16px_rgba(94,106,210,0.5)]'
                            : 'border-[#E4E7F4] hover:border-[#C5CAE8]'
                        }
                      `}
                    >
                      {isGlass && (
                        <div
                          className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-40 blur-2xl pointer-events-none group-hover:opacity-70 transition-opacity"
                          style={{ background: zone.accent }}
                        />
                      )}
                      <div className="relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono text-[#8B8FA3] tracking-wide">
                            {level.id.split('-')[0]}
                          </span>
                          <span className="text-xs">
                            {completed ? '✅' : isGlass ? '✦' : '○'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-[#14141f] mb-1 leading-snug font-display">
                          {level.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#7A7F96] leading-relaxed line-clamp-2">
                          {level.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              level.type === 'concept'
                                ? 'bg-[#F0F0F5] text-[#8B8FA3]'
                                : level.type === 'config'
                                  ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]'
                                  : level.type === 'decision'
                                    ? 'bg-[#D48C20]/12 text-[#B87800]'
                                    : 'bg-[#D23B3B]/10 text-[#D23B3B]'
                            }`}
                          >
                            {level.type === 'concept'
                              ? '概念'
                              : level.type === 'config'
                                ? '实验'
                                : level.type === 'decision'
                                  ? '决策'
                                  : '调试'}
                          </span>
                          {isGlass && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#0c0e18] text-[#C4CBFF] font-medium">
                              <span className="w-1 h-1 rounded-full bg-[#818CF8]" />
                              透明机芯
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.section>
          )
        })}

        <p className="text-center text-[11px] text-[#A0A4B8] pb-10 tracking-wide">
          大脑决策 · 身体约束 · 点开零件看内部
        </p>
      </div>
    </div>
  )
}
