import { motion, AnimatePresence } from 'framer-motion'
import type { StepTrace } from '../../types'

interface DataPanelProps {
  trace: StepTrace;
  nodeId: string;
  onClose: () => void;
}

function getNodeData(trace: StepTrace, nodeId: string): unknown {
  switch (nodeId) {
    case 'context':
      return { messages: trace.messagesBefore };
    case 'model':
      return {
        request: trace.requestBody,
        response: {
          content: trace.responseContent,
          tool_calls: trace.responseToolCalls,
          finish_reason: trace.finishReason,
          usage: { input: trace.usageInput, output: trace.usageOutput },
        },
      };
    case 'policy':
      return trace.policyDecision;
    case 'execute':
      return trace.toolResult;
    case 'observation':
      return { content: trace.observationContent };
    case 'completion':
      return trace.finalCheck;
    default:
      return { message: '点击管道节点查看数据' };
  }
}

const nodeLabels: Record<string, string> = {
  context: 'Context Builder — 构建发送给模型的消息',
  model: 'Model Request / Response — 模型调用与响应',
  policy: 'Policy Check — 运行时策略检查',
  execute: 'Tool Execute — 工具执行',
  observation: 'Observation — 工具结果回传',
  completion: 'Completion — 完成条件检查',
};

export default function DataPanel({ trace, nodeId, onClose }: DataPanelProps) {
  const data = getNodeData(trace, nodeId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] capitalize">{nodeId}</h3>
            <p className="text-xs text-[#9B9B9B] mt-0.5">{nodeLabels[nodeId] || ''}</p>
          </div>
          <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1A1A1A] text-lg leading-none">
            ×
          </button>
        </div>

        <div className="p-4 max-h-[500px] overflow-y-auto">
          <pre className="text-xs font-mono text-[#1A1A1A] whitespace-pre-wrap break-all bg-[#F8F8F8] rounded-lg p-3 border border-[#E5E5E5]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        <div className="px-4 py-2 border-t border-[#E5E5E5] bg-[#FAFAFA] flex gap-4 text-xs text-[#9B9B9B]">
          <span>Step {trace.step}</span>
          <span>Phase: {trace.phase}</span>
          {trace.timing[nodeId] ? <span>{trace.timing[nodeId]}ms</span> : null}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}