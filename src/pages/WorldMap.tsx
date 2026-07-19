import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProgressStore } from '../store/progressStore'
import { LEVEL_REGISTRY } from '../levels/registry'

const ZONES = [
  { id: 1, name: '核心循环', subtitle: 'Core Loop', icon: '🏁' },
  { id: 2, name: '工具与安全', subtitle: 'Tools & Safety', icon: '🔧' },
  { id: 3, name: '上下文与记忆', subtitle: 'Context & Memory', icon: '🧠' },
  { id: 4, name: '观测与评测', subtitle: 'Observability', icon: '📊' },
  { id: 5, name: '进阶扩展', subtitle: 'Advanced', icon: '🚀' },
]

/** Levels with full transparent glass pipeline (recommended path) */
const GLASS_LEVELS = new Set([
  '1.1-boundary',
  '1.2-react-loop',
  '2.2-runtime-policy',
  '2.3-code-edit',
  '2.4-verification',
  '4.1-observability',
])

export default function WorldMap() {
  const navigate = useNavigate()
  const isCompleted = useProgressStore((s) => s.isCompleted)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto pt-16 pb-8 px-6 text-center">
        <h1 className="text-[28px] font-bold text-[#1A1A1A] mb-2">Agent Quest</h1>
        <p className="text-sm text-[#6B6B6B] max-w-lg mx-auto leading-relaxed">
          透明探索版：不只是读概念——右侧管道把 Model 意图与 Harness 硬边界拆开，
          点击节点看 Policy / 指纹 / Repair / Trace 的完整内部数据。
        </p>
        <p className="text-xs text-[#9B9B9B] mt-2">
          推荐路径：1.1 → 1.2 → 2.2 → 2.3 → 2.4 → 4.1（标「透明」的关卡右侧有可点开管道）
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16 space-y-10">
        {ZONES.map((zone, zi) => {
          const zoneLevels = LEVEL_REGISTRY.filter((l) => l.zone === zone.id).sort((a, b) => a.order - b.order)
          const completedCount = zoneLevels.filter((l) => isCompleted(l.id)).length

          if (zoneLevels.length === 0) return null

          return (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: zi * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{zone.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A]">{zone.name}</h2>
                  <p className="text-xs text-[#9B9B9B]">
                    {zone.subtitle} · {completedCount}/{zoneLevels.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {zoneLevels.map((level) => {
                  const completed = isCompleted(level.id)
                  const locked = false
                  const isGlass = GLASS_LEVELS.has(level.id)

                  return (
                    <motion.button
                      key={level.id}
                      onClick={() => !locked && navigate(`/play/zone${level.zone}/${level.id}`)}
                      whileHover={!locked ? { scale: 1.02 } : {}}
                      whileTap={!locked ? { scale: 0.98 } : {}}
                      className={`
                        text-left p-4 rounded-xl border transition-all duration-150
                        ${locked
                          ? 'bg-[#F5F5F5] border-[#E5E5E5] cursor-not-allowed opacity-60'
                          : completed
                            ? 'bg-white border-[#2DA44E]/30 hover:border-[#2DA44E]/60 cursor-pointer'
                            : isGlass
                              ? 'bg-white border-[#5E6AD2]/35 hover:border-[#5E6AD2]/70 cursor-pointer shadow-sm'
                              : 'bg-white border-[#E5E5E5] hover:border-[#5E6AD2]/40 cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-[#9B9B9B]">{level.id.split('-')[0]}</span>
                        {locked ? (
                          <span className="text-xs">🔒</span>
                        ) : completed ? (
                          <span className="text-xs">✅</span>
                        ) : (
                          <span className="text-xs text-[#9B9B9B]">○</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-0.5">{level.title}</h3>
                      <p className="text-xs text-[#9B9B9B]">{level.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${
                          level.type === 'concept' ? 'bg-[#F0F0F0] text-[#9B9B9B]' :
                          level.type === 'config' ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' :
                          level.type === 'decision' ? 'bg-[#D48C20]/10 text-[#D48C20]' :
                          'bg-[#D23B3B]/10 text-[#D23B3B]'
                        }`}>
                          {level.type === 'concept' ? '概念' :
                           level.type === 'config' ? '实验' :
                           level.type === 'decision' ? '决策' : '调试'}
                        </span>
                        {isGlass && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A2E] text-[#A8B4FF]">
                            透明
                          </span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}