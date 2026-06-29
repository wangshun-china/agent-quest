import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import TraceStream from '../../../components/pipeline/TraceStream'
import Button from '../../../components/ui/Button'
import { useProgressStore } from '../../../store/progressStore'
import { useConfigStore } from '../../../store/configStore'
import { useTraceStore, createTraceEvent } from '../../../store/traceStore'
import { LEVEL_1_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_1_QUIZ } from '../../../data/quizQuestions'

const TOOLS_SCHEMA = [
  { name: 'list_files', description: '列出 workspace 目录中的文件', params: { path: 'string' } },
  { name: 'read_file', description: '读取文件内容（行窗口）', params: { path: 'string', start_line: 'number?', line_count: 'number?' } },
  { name: 'write_file', description: '创建或覆盖文件（需要 preview 审批）', params: { path: 'string', content: 'string' } },
  { name: 'replace_text', description: '精确替换文件中的一段文本', params: { path: 'string', old_string: 'string', new_string: 'string' } },
  { name: 'run_command', description: '执行命令（program + args，shell=False）', params: { program: 'string', args: 'string[]' } },
]

const SYSTEM_PROMPT = `你是 Coding Agent。工作目录: workspace/。
可用工具: list_files, read_file, write_file, replace_text, run_command。
规则:
- 每次只调用一个工具
- 编辑前必须先 read_file 观察文件
- run_command 只允许 python/node/npm
- 修改后必须运行验证
- 验证失败不能声称完成`

const SIM_STEPS = [
  { user: '为 calc.py 添加 add 函数',
    assistant: '我先看看项目里有什么文件。',
    tool: 'list_files', toolArgs: '{"path":"workspace"}', toolResult: 'OK — workspace/ 目录为空，calc.py 不存在' },
  { user: '(继续)',
    assistant: 'calc.py 还不存在，我来创建它。先写好 Python 文件内容。',
    tool: 'write_file', toolArgs: '{"path":"workspace/calc.py","content":"def add(a, b):\\n    return a + b\\n"}', toolResult: 'OK — 已创建 workspace/calc.py，11 bytes' },
  { user: '(继续)',
    assistant: '运行测试验证 add 函数是否正常工作。',
    tool: 'run_command', toolArgs: '{"program":"python","args":["-c","from calc import add; assert add(2,3)==5; print(\'OK\')"]}', toolResult: 'OK — stdout: OK' },
  { user: '(继续)',
    assistant: '验证通过！calc.py 中包含 add(a, b) 函数，返回两数之和。任务完成。',
    tool: null, toolArgs: null, toolResult: null },
]

interface ChatMsg { role: 'user' | 'assistant'; content: string; toolCall?: string | null; toolResult?: string | null }

export default function BoundaryLevel() {
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const isCompleted = useProgressStore((s) => s.isCompleted)
  const apiKey = useConfigStore((s) => s.apiKey)
  const { addEvent, clearEvents } = useTraceStore()

  const [mode, setMode] = useState<'live' | 'replay'>('replay')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [simStep, setSimStep] = useState(0)
  const [input, setInput] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [quizPhase, setQuizPhase] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { return () => clearEvents() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat])

  // ─── Simulated mode ───
  const sendSim = () => {
    if (simStep >= SIM_STEPS.length) return
    const resp = SIM_STEPS[simStep]
    const text = input.trim() || resp.user
    setInput('')

    // Trace: user message
    if (simStep === 0) {
      addEvent(createTraceEvent('system_context', 'System Prompt', { system_prompt: SYSTEM_PROMPT }, 'Harness 注入给模型的完整契约规则'))
      addEvent(createTraceEvent('tools_schema', '可用工具注册表', { tools: TOOLS_SCHEMA.map(t => t.name) }, `共 ${TOOLS_SCHEMA.length} 个工具，由 ToolRegistry 暴露`))
    }
    addEvent(createTraceEvent('user_message', `用户消息: ${text}`, { content: text, role: 'user' }))

    // Trace: model response
    const tc = resp.tool
    if (tc) {
      addEvent(createTraceEvent('model_response', `模型响应 → tool_call: ${tc}`, {
        role: 'assistant', content: resp.assistant, tool_calls: [{ function: { name: tc, arguments: resp.toolArgs } }],
      }, '模型决定调用工具'))
      addEvent(createTraceEvent('policy_check', `Policy: ${tc} → ALLOW`, {
        outcome: 'allow', code: 'allowed', reason: `${tc} 在允许列表中`, risk: 'low',
      }, 'RuntimePolicy 检查工具风险等级和权限配置'))
      addEvent(createTraceEvent('tool_execute', `执行 ${tc}`, {
        name: tc, arguments: JSON.parse(resp.toolArgs || '{}'), duration_ms: 12,
      }))
      addEvent(createTraceEvent('observation', `观察结果 → ${tc}`, { result: resp.toolResult }, '工具结果通过 role=tool + tool_call_id 回传模型'))
    } else {
      addEvent(createTraceEvent('model_response', '模型响应 → final', { role: 'assistant', content: resp.assistant }, '模型决定输出最终答案'))
      addEvent(createTraceEvent('completion', '运行完成', { status: 'success', reason_code: 'completed' }, 'CompletionTracker: 编辑已验证通过，允许 final'))
    }

    setChat((prev) => [...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: resp.assistant, toolCall: tc, toolResult: resp.toolResult },
    ])
    setSimStep((s) => s + 1)
  }

  // ─── Live mode ───
  const sendLive = async () => {
    const text = input.trim()
    if (!text || !apiKey) return
    setInput('')
    setLlmLoading(true)

    const config = useConfigStore.getState()

    // Boot trace
    if (chat.length === 0) {
      addEvent(createTraceEvent('system_context', 'System Prompt', { system_prompt: SYSTEM_PROMPT }, 'Harness 注入给模型的完整契约规则'))
      addEvent(createTraceEvent('tools_schema', '可用工具注册表', { tools: TOOLS_SCHEMA.map(t => t.name) }, `共 ${TOOLS_SCHEMA.length} 个工具`))
    }

    addEvent(createTraceEvent('user_message', `用户: ${text}`, { content: text, role: 'user' }))
    addEvent(createTraceEvent('model_request', '发送模型请求', {
      endpoint: `${config.apiBaseUrl}/chat/completions`,
      model: config.model,
      tool_count: TOOLS_SCHEMA.length,
    }, 'ContextBuilder 组装 messages + tools，发送 HTTP POST'))

    setChat((prev) => [...prev, { role: 'user', content: text }])

    try {
      const history = chat.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: text })

      const res = await fetch(`${config.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
          ],
          tools: TOOLS_SCHEMA.map(t => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: { type: 'object', properties: {}, required: [] } },
          })),
        }),
      })

      const data = await res.json()
      const msg = data.choices?.[0]?.message

      let assistantMsg: ChatMsg
      if (msg?.tool_calls?.length) {
        const tc = msg.tool_calls[0]
        assistantMsg = { role: 'assistant', content: msg.content || '', toolCall: tc.function.name, toolResult: `调用 ${tc.function.name}(${tc.function.arguments})` }
        addEvent(createTraceEvent('model_response', `模型 → tool_call: ${tc.function.name}`, {
          role: 'assistant', content: msg.content?.slice(0, 200), tool_calls: msg.tool_calls,
        }, '模型决定调用工具'))
        addEvent(createTraceEvent('tool_execute', `执行 ${tc.function.name}`, {
          name: tc.function.name, arguments: tc.function.arguments,
        }))
        addEvent(createTraceEvent('observation', `结果: ${tc.function.name}`, { raw: '(需实际执行)' }, '工具结果通过 role=tool 回传'))
      } else {
        assistantMsg = { role: 'assistant', content: msg?.content || '(空响应)' }
        addEvent(createTraceEvent('model_response', '模型 → final', { role: 'assistant', content: msg?.content?.slice(0, 300) }, '模型输出最终答案'))
        addEvent(createTraceEvent('completion', '运行完成', { status: 'success' }, 'CompletionTracker 判定'))
      }
      addEvent(createTraceEvent('context_update', '上下文更新', {
        messages_count: chat.length + 2,
      }, `当前对话共 ${chat.length + 2} 条消息，纳入下一轮模型请求`))

      setChat((prev) => [...prev, assistantMsg])
    } catch (e: unknown) {
      addEvent(createTraceEvent('error', 'API 错误', { error: e instanceof Error ? e.message : '未知' }))
      setChat((prev) => [...prev, { role: 'assistant', content: `❌ ${e instanceof Error ? e.message : 'API 调用失败'}` }])
    }
    setLlmLoading(false)
  }

  const handleSend = () => { if (mode === 'replay') sendSim(); else sendLive() }
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const handleQuiz = () => {
    if (selectedAnswer === LEVEL_1_1_QUIZ.correctIndex) {
      setQuizPassed(true)
      completeLevel('1.1-boundary', mode)
    } else setShowFeedback(true)
  }

  const isDone = mode === 'replay' ? simStep >= SIM_STEPS.length : chat.length >= 2 && !llmLoading

  return (
    <LevelLayout
      title="Agent vs Harness 边界" levelNumber="1.1" mode={mode} onModeChange={setMode}
      conceptCard={<ConceptCard {...LEVEL_1_1_CONCEPT} />}
      simulation={
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
            {chat.length === 0 && (
              <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
                <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">任务：为 calc.py 添加 add 函数</h2>
                <p className="text-sm text-[#6B6B6B] mb-2">
                  {mode === 'replay' ? '模拟模式下，每次发送推进一步。观察右侧追踪面板。' : '直接调用 LLM API，观察右侧实时追踪面板。'}
                </p>
                {!apiKey && mode === 'live' && <p className="text-sm text-[#D23B3B]">⚠ 请先配置 API Key</p>}
              </div>
            )}
            {chat.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${m.role === 'user' ? 'bg-[#5E6AD2] text-white' : 'bg-white border border-[#E5E5E5] text-[#1A1A1A]'}`}>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  {m.toolCall && (
                    <div className={`mt-2 pt-2 border-t text-xs font-mono ${m.role === 'user' ? 'border-white/20 text-white/80' : 'border-[#E5E5E5] text-[#6B6B6B]'}`}>
                      🔧 {m.toolCall} → {m.toolResult}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {llmLoading && (
              <div className="flex justify-start"><div className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 flex gap-1.5"><div className="w-2 h-2 bg-[#D0D0D0] rounded-full animate-bounce"/><div className="w-2 h-2 bg-[#D0D0D0] rounded-full animate-bounce [animation-delay:0.1s]"/><div className="w-2 h-2 bg-[#D0D0D0] rounded-full animate-bounce [animation-delay:0.2s]"/></div></div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Done + quiz trigger */}
          {isDone && !quizPhase && !quizPassed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-[#1A1A1A]">✅ 对话完成，右侧可查看回放</span>
              <Button size="sm" onClick={() => { setQuizPhase(true); setSelectedAnswer(null); setShowFeedback(false) }}>开始答题</Button>
            </motion.div>
          )}

          {/* Quiz */}
          {quizPhase && !quizPassed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 bg-white rounded-xl border border-[#E5E5E5] p-4">
              <h3 className="text-sm font-semibold mb-3">过关测试</h3>
              <p className="text-sm mb-3">{LEVEL_1_1_QUIZ.question}</p>
              <div className="space-y-1.5 mb-3">
                {LEVEL_1_1_QUIZ.options.map((o, i) => (
                  <button key={i} onClick={() => { setSelectedAnswer(i); setShowFeedback(false) }} className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${selectedAnswer === i ? 'border-[#5E6AD2] bg-[#5E6AD2]/5 text-[#5E6AD2]' : 'border-[#E5E5E5] hover:bg-[#FAFAFA]'}`}>
                    <span className="font-mono text-xs text-[#9B9B9B] mr-2">{o.label})</span>{o.text}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleQuiz} disabled={selectedAnswer === null}>提交</Button>
                <Button size="sm" variant="ghost" onClick={() => setQuizPhase(false)}>取消</Button>
              </div>
              {showFeedback && <p className="text-xs text-[#D23B3B] mt-2">提示：A 和 B 是模型决策，拒绝执行是 Harness 用确定性代码判断的。</p>}
            </motion.div>
          )}

          {/* Passed */}
          {quizPassed && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="bg-white rounded-xl border border-[#2DA44E]/30 p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold mb-2">关卡通过！</h3>
              <div className="bg-[#F0F9F2] rounded-lg p-3 mb-3 text-left"><p className="text-xs">{LEVEL_1_1_QUIZ.explanation}</p></div>
              <Button size="sm" onClick={() => window.location.href = '/'}>返回地图</Button>
            </motion.div>
          )}

          {/* Input */}
          {!quizPassed && (
            <div className="flex gap-2 shrink-0">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={mode === 'replay' ? '输入消息推进 Agent...' : '描述你的任务...'}
                disabled={llmLoading || (mode === 'replay' && simStep >= SIM_STEPS.length) || (mode === 'live' && !apiKey)}
                className="flex-1 px-4 py-2.5 text-sm border border-[#E5E5E5] rounded-xl focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30 disabled:bg-[#F5F5F5]" />
              <Button onClick={handleSend} disabled={llmLoading || (mode === 'replay' && simStep >= SIM_STEPS.length) || (mode === 'live' && (!apiKey || !input.trim()))}>
                {llmLoading ? '...' : '发送'}
              </Button>
            </div>
          )}
        </div>
      }
      pipeline={<TraceStream />}
    />
  )
}