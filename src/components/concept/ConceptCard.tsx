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
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] transition-colors"
      >
        <div>
          <p className="text-xs text-[#9B9B9B] uppercase tracking-wider font-medium">核心概念</p>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mt-0.5">{title}</h2>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{subtitle}</p>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-[#9B9B9B] text-lg"
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {sections.map((s, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">{s.heading}</h3>
                  {s.type === 'code' ? (
                    <pre className="bg-[#F8F8F8] rounded-lg p-3 text-xs font-mono text-[#1A1A1A] overflow-x-auto whitespace-pre-wrap border border-[#E5E5E5]">
                      {s.content}
                    </pre>
                  ) : s.type === 'table' && s.rows ? (
                    <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                            <th className="text-left px-3 py-2 font-medium text-[#6B6B6B]">问题</th>
                            <th className="text-left px-3 py-2 font-medium text-[#6B6B6B]">责任方</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows.map((r, j) => (
                            <tr key={j} className="border-b border-[#E5E5E5] last:border-0">
                              <td className="px-3 py-2 text-[#1A1A1A]">{r.left}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  r.highlight === 'model'
                                    ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]'
                                    : 'bg-[#787F95]/10 text-[#787F95]'
                                }`}>
                                  {r.right}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B6B6B] leading-relaxed whitespace-pre-wrap">{s.content}</p>
                  )}
                </div>
              ))}

              <div className="bg-[#F0F1FF] rounded-lg p-4 border border-[#5E6AD2]/20">
                <p className="text-sm text-[#1A1A1A] leading-relaxed">{conclusion}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider mb-2">参考文献</h3>
                <div className="space-y-1">
                  {references.map((ref, i) => (
                    <a
                      key={i}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-[#5E6AD2] hover:underline"
                    >
                      {ref.title}
                      <span className="text-[#9B9B9B] ml-1">— {ref.source}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}