import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Reference {
  title: string;
  url: string;
  source: string;
}

interface ConceptCardProps {
  title: string;
  subtitle: string;
  sections: {
    heading: string;
    content: string;
    type?: 'text' | 'code' | 'table';
    rows?: { left: string; right: string; highlight?: 'model' | 'harness' }[];
  }[];
  conclusion: string;
  references: Reference[];
}

export default function ConceptCard({ title, subtitle, sections, conclusion, references }: ConceptCardProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="glass-panel rounded-2xl border border-white/80 shadow-[0_8px_30px_-16px_rgba(40,50,90,0.25)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 px-4 py-4 text-left hover:bg-white/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[#5E6AD2] bg-[#5E6AD2]/10 px-2 py-0.5 rounded-full">
              <span className="w-1 h-1 rounded-full bg-[#5E6AD2]" />
              核心概念
            </span>
          </div>
          <h2 className="text-[15px] font-semibold text-[#14141f] leading-snug font-display tracking-tight">
            {title}
          </h2>
          <p className="text-[12px] text-[#6B6F85] mt-1 leading-relaxed">{subtitle}</p>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="mt-1 shrink-0 w-7 h-7 rounded-lg bg-[#F0F1F8] text-[#6B6F85] flex items-center justify-center text-xs"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[#EEF0F8]">
              <div className="pt-3 space-y-4">
                {sections.map((s, i) => (
                  <div key={i} className="relative pl-3">
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gradient-to-b from-[#5E6AD2]/70 to-[#5E6AD2]/10" />
                    <h3 className="text-[12px] font-semibold text-[#2A2A3A] mb-2 tracking-tight">
                      {s.heading}
                    </h3>
                    {s.type === 'code' ? (
                      <pre className="bg-[#0F1117] text-[#D4D8E8] rounded-xl p-3 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap border border-white/5 shadow-inner leading-relaxed">
                        {s.content}
                      </pre>
                    ) : s.type === 'table' && s.rows ? (
                      <div className="border border-[#E8EAF5] rounded-xl overflow-hidden bg-white/70">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[#F6F7FC] border-b border-[#E8EAF5]">
                              <th className="text-left px-3 py-2 font-medium text-[#7A7F96]">问题</th>
                              <th className="text-left px-3 py-2 font-medium text-[#7A7F96]">责任方</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.rows.map((r, j) => (
                              <tr key={j} className="border-b border-[#F0F1F7] last:border-0">
                                <td className="px-3 py-2 text-[#2A2A3A]">{r.left}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                      r.highlight === 'model'
                                        ? 'bg-[#5E6AD2]/12 text-[#5E6AD2]'
                                        : 'bg-[#787F95]/12 text-[#5A6178]'
                                    }`}
                                  >
                                    {r.highlight === 'model' ? '🧠 ' : '⚙️ '}
                                    {r.right}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#4A4A5C] leading-relaxed whitespace-pre-wrap">
                        {s.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-gradient-to-br from-[#EEF0FF] to-[#F7F8FC] border border-[#5E6AD2]/15 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5E6AD2] mb-1">
                  结论
                </p>
                <p className="text-[12px] text-[#2A2A3A] leading-relaxed">{conclusion}</p>
              </div>

              {references.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9B9B] mb-2">
                    参考
                  </p>
                  <ul className="space-y-1.5">
                    {references.map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group text-[11px] text-[#5E6AD2] hover:text-[#4F5ABF] flex items-start gap-1.5"
                        >
                          <span className="mt-0.5 opacity-50 group-hover:opacity-100">↗</span>
                          <span>
                            <span className="underline-offset-2 group-hover:underline">{ref.title}</span>
                            <span className="text-[#9B9B9B]"> · {ref.source}</span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
