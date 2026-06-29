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

export default function WorldMap() {
  const navigate = useNavigate()
  const isCompleted = useProgressStore((s) => s.isCompleted)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto pt-16 pb-8 px-6 text-center">
        <h1 className="text-[28px] font-bold text-[#1A1A1A] mb-2">Agent Quest</h1>
        <p className="text-sm text-[#6B6B6B] max-w-md mx-auto">
          用关卡方式探索 Agent Harness 的内部工作原理。每个关卡展示 Agent 执行闭环中的一个核心概念。
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
                  const locked = level.requiresLevels.length > 0 &&
                    !level.requiresLevels.every((id) => isCompleted(id))

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
                      <span className={`inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded ${
                        level.type === 'concept' ? 'bg-[#F0F0F0] text-[#9B9B9B]' :
                        level.type === 'config' ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' :
                        level.type === 'decision' ? 'bg-[#D48C20]/10 text-[#D48C20]' :
                        'bg-[#D23B3B]/10 text-[#D23B3B]'
                      }`}>
                        {level.type === 'concept' ? '概念' :
                         level.type === 'config' ? '实验' :
                         level.type === 'decision' ? '决策' : '调试'}
                      </span>
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