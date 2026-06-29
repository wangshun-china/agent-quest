import { motion } from 'framer-motion'
import type { PipelineNodeData } from '../../types'

interface PipelineNodeProps {
  node: PipelineNodeData;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

const typeStyles: Record<string, string> = {
  model: 'border-[#5E6AD2] bg-white',
  harness: 'border-[#787F95] bg-white',
}

export default function PipelineNode({ node, isActive, isExpanded, onClick }: PipelineNodeProps) {
  return (
    <motion.button
      onClick={onClick}
      animate={isActive ? {
        boxShadow: ['0 0 0 0 rgba(94,106,210,0.4)', '0 0 0 4px rgba(94,106,210,0)', '0 0 0 0 rgba(94,106,210,0)'],
      } : {}}
      transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
      className={`
        relative flex flex-col items-center justify-center
        min-w-[100px] h-16 px-3 rounded-xl border-2
        cursor-pointer transition-all duration-150
        ${typeStyles[node.type]}
        ${node.status === 'active' ? 'ring-2 ring-[#5E6AD2]/40' : ''}
        ${node.status === 'done' ? 'border-[#2DA44E] bg-[#F0F9F2]' : ''}
        ${node.status === 'error' ? 'border-[#D23B3B] bg-[#FEF2F2]' : ''}
        ${isExpanded ? 'ring-2 ring-[#5E6AD2]/30' : ''}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
        node.status === 'active' ? 'bg-[#5E6AD2]' :
        node.status === 'done' ? 'bg-[#2DA44E]' :
        node.status === 'error' ? 'bg-[#D23B3B]' :
        'bg-[#E5E5E5]'
      }`} />

      <span className="text-xs font-medium text-[#1A1A1A] leading-tight text-center whitespace-pre-line">
        {node.label}
      </span>
      <span className={`text-[10px] mt-0.5 ${
        node.type === 'model' ? 'text-[#5E6AD2]' : 'text-[#787F95]'
      }`}>
        {node.type === 'model' ? 'Model' : 'Harness'}
      </span>
    </motion.button>
  )
}