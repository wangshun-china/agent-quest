import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LevelGuide } from '../../data/levelGuides'
import Button from '../ui/Button'

interface Props {
  guide: LevelGuide
  testPrompt: string
  testExpect: string
  modelHint?: string
  canRun: boolean
  loading?: boolean
  onRun: () => void
  onCopy: () => void
  /** 聊天已开始后默认折叠 */
  defaultOpen?: boolean
}

export default function LevelGuidePanel({
  guide,
  testPrompt,
  testExpect,
  modelHint = 'qwen3.6-27b',
  canRun,
  loading,
  onRun,
  onCopy,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-[#5E6AD2]/20 bg-white shadow-sm overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left bg-gradient-to-r from-[#EEF0FF] to-white hover:from-[#E8EBFF] transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5E6AD2] bg-[#5E6AD2]/10 px-2 py-0.5 rounded-full">
              新手引导
            </span>
            <span className="text-[13px] font-semibold text-[#14141f] font-display truncate">
              这一关怎么玩
            </span>
          </div>
          <p className="text-[12px] text-[#5A5E72] mt-1 leading-snug">{guide.goal}</p>
        </div>
        <span className="text-[#8B8FA3] text-sm shrink-0">{open ? '收起 ▴' : '展开 ▾'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[#EEF0F8] pt-3">
              {/* Steps */}
              <div>
                <h4 className="text-[11px] font-semibold text-[#8B8FA3] uppercase tracking-wide mb-2">
                  操作步骤
                </h4>
                <ol className="space-y-1.5">
                  {guide.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12px] text-[#2A2A3A] leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-md bg-[#5E6AD2] text-white text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Rule cards */}
              {guide.rules.map((block) => (
                <div
                  key={block.title}
                  className="rounded-xl border border-[#E4E7F4] bg-[#F8F9FC] p-3"
                >
                  <h4 className="text-[12px] font-semibold text-[#14141f] mb-2 flex items-center gap-1.5">
                    <span className="w-1 h-3 rounded-full bg-[#5E6AD2]" />
                    {block.title}
                  </h4>
                  <ul className="space-y-1">
                    {block.lines.map((line, i) => (
                      <li
                        key={i}
                        className="text-[11px] sm:text-[12px] font-mono text-[#3A3A4A] leading-relaxed pl-2 border-l-2 border-[#D8DCF0]"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Watch */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-[#8B8FA3] w-full mb-0.5">右侧管道请盯紧</span>
                {guide.watch.map((w) => (
                  <span
                    key={w}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-[#0c0e18] text-[#C4CBFF]"
                  >
                    {w}
                  </span>
                ))}
              </div>

              {guide.pitfalls && guide.pitfalls.length > 0 && (
                <div className="rounded-xl bg-[#FFF8EB] border border-[#D48C20]/25 p-3">
                  <h4 className="text-[11px] font-semibold text-[#9A6700] mb-1">注意</h4>
                  <ul className="space-y-1">
                    {guide.pitfalls.map((p, i) => (
                      <li key={i} className="text-[12px] text-[#5C3D00] leading-relaxed">
                        • {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Test command */}
              <div className="rounded-xl border border-[#5E6AD2]/30 bg-gradient-to-br from-[#EEF0FF] via-white to-[#F7F8FC] p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#5E6AD2]">
                    标准测试命令（复制即用）
                  </span>
                  <span className="text-[10px] text-[#8B8FA3] font-mono">model: {modelHint}</span>
                </div>
                <pre className="text-[11px] sm:text-[12px] font-mono whitespace-pre-wrap leading-relaxed bg-white border border-[#E4E7F4] rounded-lg p-2.5 mb-2 text-[#1A1A2E]">
                  {testPrompt}
                </pre>
                <p className="text-[12px] text-[#5A5E72] mb-3 leading-relaxed">
                  <span className="font-semibold text-[#2A2A3A]">成功时你应看到：</span>
                  {testExpect}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!canRun || loading} onClick={onRun}>
                    {loading ? '跑着…' : '一键发送测试命令'}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={loading} onClick={onCopy}>
                    填入输入框
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
