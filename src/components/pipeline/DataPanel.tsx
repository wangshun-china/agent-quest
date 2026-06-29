import { motion, AnimatePresence } from 'framer-motion'
import type { StepTrace, Message, ToolResult, PolicyDecision } from '../../types'

interface DataPanelProps {
  trace: StepTrace;
  nodeId: string;
  onClose: () => void;
}

function Field({ label, value, mono = false, highlight }: { label: string; value: string; mono?: boolean; highlight?: 'model' | 'harness' | 'error' | 'success' }) {
  const colors = {
    model: 'text-[#5E6AD2]',
    harness: 'text-[#787F95]',
    error: 'text-[#D23B3B]',
    success: 'text-[#2DA44E]',
  }
  return (
    <div className="mb-2">
      <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-xs leading-relaxed ${mono ? 'font-mono bg-[#F8F8F8] rounded px-2 py-1' : ''} ${highlight ? colors[highlight] : 'text-[#1A1A1A]'}`}>
        {value}
      </div>
    </div>
  )
}

function ContextPanel({ trace }: { trace: StepTrace }) {
  const msgs = trace.messagesBefore
  const systemMsg = msgs?.find((m: Message) => m.role === 'system')
  const userMsg = msgs?.find((m: Message) => m.role === 'user')

  return (
    <div className="space-y-3">
      <Field label="消息数量" value={`${msgs?.length || 0} 条`} />
      {systemMsg && (
        <div className="bg-[#F0F1FF] rounded-lg p-3 border border-[#5E6AD2]/15">
          <div className="text-[10px] text-[#5E6AD2] uppercase tracking-wider mb-1 font-medium">System Contract</div>
          <div className="text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {typeof systemMsg.content === 'string' ? systemMsg.content.slice(0, 600) : JSON.stringify(systemMsg.content)}
          </div>
          <div className="text-[10px] text-[#9B9B9B] mt-1">Harness 注入的契约规则，定义 Agent 的行为边界</div>
        </div>
      )}
      {userMsg && (
        <div className="bg-[#F5F5F5] rounded-lg p-3">
          <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-1">User Message</div>
          <div className="text-xs text-[#1A1A1A]">{typeof userMsg.content === 'string' ? userMsg.content : ''}</div>
          <div className="text-[10px] text-[#9B9B9B] mt-1">用户原始输入，不被 Harness 修改</div>
        </div>
      )}
      {!systemMsg && !userMsg && (
        <div className="text-xs text-[#9B9B9B]">无消息数据</div>
      )}
    </div>
  )
}

function ModelPanel({ trace }: { trace: StepTrace }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <div className="text-[10px] text-[#9B9B9B]">Model</div>
          <div className="text-xs font-mono text-[#1A1A1A] mt-0.5">{String(trace.requestBody?.model || 'unknown')}</div>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <div className="text-[10px] text-[#9B9B9B]">Finish Reason</div>
          <div className={`text-xs font-mono mt-0.5 ${trace.finishReason === 'stop' ? 'text-[#2DA44E]' : trace.finishReason === 'tool_calls' ? 'text-[#5E6AD2]' : 'text-[#1A1A1A]'}`}>
            {trace.finishReason || '—'}
          </div>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <div className="text-[10px] text-[#9B9B9B]">Input Tokens</div>
          <div className="text-xs font-mono text-[#1A1A1A] mt-0.5">{trace.usageInput || '—'}</div>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2 text-center">
          <div className="text-[10px] text-[#9B9B9B]">Output Tokens</div>
          <div className="text-xs font-mono text-[#1A1A1A] mt-0.5">{trace.usageOutput || '—'}</div>
        </div>
      </div>
      {trace.responseContent && (
        <div>
          <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-1">Response Content</div>
          <div className="text-xs text-[#1A1A1A] leading-relaxed bg-[#F8F8F8] rounded-lg p-3 max-h-32 overflow-y-auto">
            {trace.responseContent.slice(0, 500)}
          </div>
        </div>
      )}
      {trace.responseToolCalls && trace.responseToolCalls.length > 0 && (
        <div>
          <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-1">Tool Calls（模型调用的工具）</div>
          {trace.responseToolCalls.map((tc, i) => (
            <div key={i} className="bg-[#F0F1FF] rounded-lg p-3 border border-[#5E6AD2]/15 mb-1.5">
              <div className="text-xs font-mono font-medium text-[#5E6AD2]">{tc.function.name}</div>
              <div className="text-xs font-mono text-[#6B6B6B] mt-1 whitespace-pre-wrap break-all">
                {(() => { try { return JSON.stringify(JSON.parse(tc.function.arguments), null, 2) } catch { return tc.function.arguments } })()}
              </div>
              <div className="text-[10px] text-[#9B9B9B] mt-1">call_id: {tc.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PolicyPanel({ trace }: { trace: StepTrace }) {
  const pd = trace.policyDecision as PolicyDecision | undefined
  if (!pd) return <div className="text-xs text-[#9B9B9B]">无策略数据</div>
  return (
    <div className="space-y-3">
      <div className={`rounded-lg p-3 border ${
        pd.outcome === 'allow' ? 'bg-[#F0F9F2] border-[#2DA44E]/20' :
        pd.outcome === 'deny' ? 'bg-[#FEF2F2] border-[#D23B3B]/20' :
        'bg-[#FFF8EB] border-[#D48C20]/20'
      }`}>
        <div className={`text-xs font-bold ${
          pd.outcome === 'allow' ? 'text-[#2DA44E]' :
          pd.outcome === 'deny' ? 'text-[#D23B3B]' :
          'text-[#D48C20]'
        }`}>
          {pd.outcome === 'allow' ? '✓ ALLOW — 允许执行' :
           pd.outcome === 'deny' ? '✕ DENY — 拒绝执行' :
           '? ASK — 需要审批'}
        </div>
        <div className="text-xs text-[#1A1A1A] mt-1">{pd.reason}</div>
      </div>
      <Field label="Policy Code" value={pd.code} mono />
      <Field label="Risk Level" value={pd.risk} mono highlight={pd.outcome === 'deny' ? 'error' : 'harness'} />
      <div className="text-[10px] text-[#9B9B9B] mt-1">
        Harness 的 RuntimePolicy 用确定性代码判断：工具风险等级 + 权限配置 → allow / ask / deny
      </div>
    </div>
  )
}

function ExecutePanel({ trace }: { trace: StepTrace }) {
  const tr = trace.toolResult as ToolResult | undefined
  if (!tr) return <div className="text-xs text-[#9B9B9B]">无执行数据</div>
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#F8F8F8] rounded-lg p-2">
          <div className="text-[10px] text-[#9B9B9B]">工具名称</div>
          <div className="text-xs font-mono text-[#1A1A1A] mt-0.5">{tr.name || '—'}</div>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2">
          <div className="text-[10px] text-[#9B9B9B]">耗时</div>
          <div className="text-xs font-mono text-[#1A1A1A] mt-0.5">{tr.duration_ms}ms</div>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2">
          <div className="text-[10px] text-[#9B9B9B]">执行结果</div>
          <div className={`text-xs font-mono mt-0.5 ${tr.ok ? 'text-[#2DA44E]' : 'text-[#D23B3B]'}`}>
            {tr.ok ? '成功' : '失败'}
          </div>
        </div>
        <div className="bg-[#F8F8F8] rounded-lg p-2">
          <div className="text-[10px] text-[#9B9B9B]">风险等级</div>
          <div className="text-xs font-mono text-[#1A1A1A] mt-0.5">{tr.risk || '—'}</div>
        </div>
      </div>
      {tr.result && (
        <div>
          <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-1">执行输出</div>
          <div className="text-xs font-mono text-[#1A1A1A] bg-[#F8F8F8] rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(tr.result, null, 2)}
          </div>
        </div>
      )}
      {tr.error && (
        <div className="bg-[#FEF2F2] rounded-lg p-3 border border-[#D23B3B]/20">
          <div className="text-xs font-medium text-[#D23B3B]">Error: {tr.error.code}</div>
          <div className="text-xs text-[#1A1A1A] mt-1">{tr.error.message}</div>
        </div>
      )}
    </div>
  )
}

function ObservationPanel({ trace }: { trace: StepTrace }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider">回传给模型的内容</div>
      <div className="bg-[#F0F1FF] rounded-lg p-3 border border-[#5E6AD2]/15">
        <div className="text-[10px] text-[#5E6AD2] font-medium mb-1">Role: tool（原生 tool message）</div>
        <div className="text-xs text-[#1A1A1A] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
          {trace.observationContent?.slice(0, 500) || '—'}
        </div>
      </div>
      <div className="text-[10px] text-[#9B9B9B]">
        工具结果通过 role=tool + tool_call_id 回传给模型，这是 Function Calling 协议的标准方式。大结果会被裁剪后进入模型上下文。
      </div>
    </div>
  )
}

function CompletionPanel({ trace }: { trace: StepTrace }) {
  const fc = trace.finalCheck
  return (
    <div className="space-y-3">
      <div className={`rounded-lg p-3 border ${fc?.status === 'success' ? 'bg-[#F0F9F2] border-[#2DA44E]/20' : 'bg-[#FEF2F2] border-[#D23B3B]/20'}`}>
        <div className={`text-xs font-bold ${fc?.status === 'success' ? 'text-[#2DA44E]' : 'text-[#D23B3B]'}`}>
          {fc?.status === 'success' ? '✓ 运行成功' : '✕ 运行失败'}
        </div>
        <div className="text-xs text-[#6B6B6B] mt-1">Reason: {fc?.reasonCode || '—'}</div>
      </div>
      {fc?.message && (
        <div>
          <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mb-1">Agent 的最终输出 (final.md)</div>
          <div className="text-xs text-[#1A1A1A] bg-[#F8F8F8] rounded-lg p-3 leading-relaxed">{fc.message.slice(0, 400)}</div>
        </div>
      )}
      <div className="text-[10px] text-[#9B9B9B]">
        Harness 的 CompletionTracker 检查：是否完成了编辑？是否验证通过？Plan 是否完成？所有条件满足才允许 final。
      </div>
    </div>
  )
}

const panels: Record<string, React.FC<{ trace: StepTrace }>> = {
  context: ContextPanel,
  model: ModelPanel,
  policy: PolicyPanel,
  execute: ExecutePanel,
  observation: ObservationPanel,
  completion: CompletionPanel,
}

const nodeLabels: Record<string, string> = {
  context: 'Context Builder',
  model: 'Model Request / Response',
  policy: 'Policy Check',
  execute: 'Tool Execute',
  observation: 'Observation',
  completion: 'Completion Check',
}

export default function DataPanel({ trace, nodeId, onClose }: DataPanelProps) {
  const Panel = panels[nodeId]
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
            <h3 className="text-sm font-semibold text-[#1A1A1A]">{nodeLabels[nodeId] || nodeId}</h3>
          </div>
          <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1A1A1A] text-lg leading-none">×</button>
        </div>

        <div className="p-4 max-h-[480px] overflow-y-auto">
          {Panel ? <Panel trace={trace} /> : (
            <div className="text-xs text-[#9B9B9B]">点击管道节点查看数据</div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#E5E5E5] bg-[#FAFAFA] flex gap-4 text-xs text-[#9B9B9B]">
          <span>Step {trace.step}</span>
          <span>|</span>
          <span>{trace.phase}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}