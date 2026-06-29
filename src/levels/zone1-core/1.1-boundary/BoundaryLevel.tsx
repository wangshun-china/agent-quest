import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import PlaybackControls from '../../../components/playback/PlaybackControls'
import PipelineView from '../../../components/pipeline/PipelineView'
import StepTimeline from '../../../components/pipeline/StepTimeline'
import Button from '../../../components/ui/Button'
import { useEngineStore } from '../../../store/engineStore'
import { useProgressStore } from '../../../store/progressStore'
import { useConfigStore } from '../../../store/configStore'
import { loadTrace } from '../../../engine/TraceLoader'
import { LEVEL_1_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_1_QUIZ } from '../../../data/quizQuestions'

const SIMULATED_RESPONSES = [
  { user: '为 calc.py 添加 add 函数', assistant: '我来帮你。先看看项目里有什么文件。', toolCall: 'list_files', toolResult: 'workspace/ (calc.py 不存在)' },
  { user: '(auto)', assistant: 'calc.py 还不存在，我来创建一个。', toolCall: 'write_file', toolResult: '创建了 calc.py，包含一个空的 Python 文件' },
  { user: '(auto)', assistant: '现在添加 add 函数。', toolCall: 'write_file', toolResult: '已写入 add(a, b) 函数到 calc.py' },
  { user: '(auto)', assistant: '验证一下代码是否正常。', toolCall: 'run_command', toolResult: '测试通过 ✓' },
  { user: '(auto)', assistant: '任务完成！calc.py 中已包含 add(a, b) 函数，返回两数之和。', toolCall: null, toolResult: null },
]

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCall?: string | null;
  toolResult?: string | null;
  stepIndex?: number;
}

export default function BoundaryLevel() {
  const { loadSteps, steps, status, reset, setStatus } = useEngineStore()
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const isCompleted = useProgressStore((s) => s.isCompleted)
  const apiKey = useConfigStore((s) => s.apiKey)

  const [mode, setMode] = useState<'live' | 'replay'>('replay')
  const [traceLoaded, setTraceLoaded] = useState(false)
  const [quizPhase, setQuizPhase] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [simStep, setSimStep] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTrace('/traces/1.1-create-calc').then((steps) => {
      loadSteps(steps)
      setTraceLoaded(true)
    })
    return () => { reset() }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // --- Simulated mode ---
  const sendSimulated = () => {
    const text = inputValue.trim() || '我要为 calc.py 添加 add 函数'
    setInputValue('')
    if (simStep >= SIMULATED_RESPONSES.length) return

    const resp = SIMULATED_RESPONSES[simStep]
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      {
        role: 'assistant',
        content: resp.assistant,
        toolCall: resp.toolCall,
        toolResult: resp.toolResult,
        stepIndex: simStep,
      },
    ])
    setSimStep((s) => s + 1)
    // Advance trace step
    if (simStep < steps.length) {
      useEngineStore.getState().setCurrentStepIndex(simStep)
      if (simStep === 0) useEngineStore.getState().setStatus('paused')
    }
    if (simStep + 1 >= SIMULATED_RESPONSES.length) {
      useEngineStore.getState().setStatus('completed')
    }
  }

  // --- LLM mode ---
  const sendLive = async () => {
    const text = inputValue.trim()
    if (!text || !apiKey) return
    setInputValue('')
    setLlmLoading(true)

    const config = useConfigStore.getState()
    const newMessages: ChatMessage[] = [{ role: 'user', content: text }]
    setChatMessages((prev) => [...prev, newMessages[0]])

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      history.push({ role: 'user', content: text })

      const res = await fetch(`${config.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是 Coding Agent。工作目录: workspace/。可用工具: read_file, list_files, write_file, run_command。每次只调用一个工具。' },
            ...history,
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'list_files',
                description: '列出目录中的文件',
                parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
              },
            },
            {
              type: 'function',
              function: {
                name: 'write_file',
                description: '写入文件',
                parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
              },
            },
            {
              type: 'function',
              function: {
                name: 'run_command',
                description: '运行命令',
                parameters: { type: 'object', properties: { program: { type: 'string' }, args: { type: 'array', items: { type: 'string' } } }, required: ['program', 'args'] },
              },
            },
          ],
        }),
      })

      const data = await res.json()
      const choice = data.choices?.[0]
      const msg = choice?.message

      if (msg?.tool_calls?.length) {
        const tc = msg.tool_calls[0]
        newMessages.push({
          role: 'assistant',
          content: msg.content || `调用工具: ${tc.function.name}`,
          toolCall: tc.function.name,
          toolResult: `已执行 ${tc.function.name}(${tc.function.arguments})`,
        })
      } else {
        newMessages.push({
          role: 'assistant',
          content: msg?.content || '(无响应)',
        })
      }
    } catch (e: unknown) {
      newMessages.push({
        role: 'assistant',
        content: `❌ API 错误: ${e instanceof Error ? e.message : '未知错误'}`,
      })
    }

    setChatMessages((prev) => [...prev, newMessages[1]])
    setLlmLoading(false)
  }

  const handleSend = () => {
    if (mode === 'replay') sendSimulated()
    else sendLive()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuizSubmit = () => {
    if (selectedAnswer === LEVEL_1_1_QUIZ.correctIndex) {
      setQuizPassed(true)
      completeLevel('1.1-boundary', mode)
    } else {
      setShowFeedback(true)
    }
  }

  // ---------- Pipeline content ----------
  const pipelineContent = (
    <div className="flex gap-4 h-full">
      {steps.length > 0 && (
        <div className="w-36 shrink-0">
          <StepTimeline />
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-auto">
        <PipelineView />
      </div>
    </div>
  )

  // ---------- Chat area ----------
  const chatArea = (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {chatMessages.length === 0 && (
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">
              任务：为 calc.py 添加 add 函数
            </h2>
            <p className="text-sm text-[#6B6B6B] mb-4">
              {mode === 'replay'
                ? '在下方发送消息，Agent 会逐步完成任务。每次发送会推进一步。'
                : '在下方输入你的任务描述，Agent 会调用 LLM API 来回应。'
              }
            </p>
            {!apiKey && mode === 'live' && (
              <p className="text-sm text-[#D23B3B]">⚠ 请先在顶部配置 API Key</p>
            )}
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-[#5E6AD2] text-white'
                : 'bg-white border border-[#E5E5E5] text-[#1A1A1A]'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.toolCall && (
                <div className={`mt-2 pt-2 border-t text-xs ${msg.role === 'user' ? 'border-white/20 text-white/80' : 'border-[#E5E5E5] text-[#6B6B6B]'}`}>
                  <span className="font-mono">🔧 {msg.toolCall}</span>
                  {msg.toolResult && (
                    <span className="block mt-0.5 opacity-80">→ {msg.toolResult}</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {llmLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[#D0D0D0] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#D0D0D0] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-[#D0D0D0] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Playback controls (if trace is playing) */}
      {chatMessages.length > 0 && status !== 'idle' && (
        <div className="mb-3">
          <PlaybackControls />
        </div>
      )}

      {/* Completion + Quiz trigger */}
      {mode === 'replay' && simStep >= SIMULATED_RESPONSES.length && !quizPhase && !quizPassed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4"
        >
          <p className="text-sm text-[#1A1A1A] mb-2">✅ 回放完成！</p>
          <Button size="sm" onClick={() => { setQuizPhase(true); setSelectedAnswer(null); setShowFeedback(false); }}>
            开始答题
          </Button>
        </motion.div>
      )}
      {mode === 'live' && chatMessages.length >= 2 && !quizPhase && !quizPassed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4"
        >
          <p className="text-sm text-[#1A1A1A] mb-2">观察管道中的数据流，然后答题。</p>
          <Button size="sm" onClick={() => { setQuizPhase(true); setSelectedAnswer(null); setShowFeedback(false); }}>
            开始答题
          </Button>
        </motion.div>
      )}

      {/* Quiz */}
      {quizPhase && !quizPassed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 bg-white rounded-xl border border-[#E5E5E5] p-4"
        >
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">过关测试</h3>
          <p className="text-sm text-[#1A1A1A] mb-3">{LEVEL_1_1_QUIZ.question}</p>
          <div className="space-y-1.5 mb-3">
            {LEVEL_1_1_QUIZ.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => { setSelectedAnswer(i); setShowFeedback(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedAnswer === i ? 'border-[#5E6AD2] bg-[#5E6AD2]/5 text-[#5E6AD2]' : 'border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#FAFAFA]'
                }`}
              >
                <span className="font-mono text-xs text-[#9B9B9B] mr-2">{opt.label})</span>
                {opt.text}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleQuizSubmit} disabled={selectedAnswer === null}>提交</Button>
            <Button size="sm" variant="ghost" onClick={() => setQuizPhase(false)}>取消</Button>
          </div>
          {showFeedback && (
            <p className="text-xs text-[#D23B3B] mt-2">提示：A 和 B 是模型决策，拒绝执行是 Harness 用确定性代码判断的。</p>
          )}
        </motion.div>
      )}

      {/* Quiz passed */}
      {quizPassed && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-white rounded-xl border border-[#2DA44E]/30 p-6 text-center"
        >
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">关卡通过！</h3>
          <div className="bg-[#F0F9F2] rounded-lg p-3 mb-3 text-left">
            <p className="text-xs text-[#1A1A1A]">{LEVEL_1_1_QUIZ.explanation}</p>
          </div>
          <Button size="sm" onClick={() => window.location.href = '/'}>返回地图</Button>
        </motion.div>
      )}

      {/* Input */}
      {!quizPassed && (
        <div className="flex gap-2 shrink-0">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'replay' ? '输入消息推进 Agent 执行...' : '输入任务描述...'}
            disabled={llmLoading || (mode === 'replay' && simStep >= SIMULATED_RESPONSES.length) || (mode === 'live' && !apiKey)}
            className="flex-1 px-4 py-2.5 text-sm border border-[#E5E5E5] rounded-xl focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30 disabled:bg-[#F5F5F5] disabled:text-[#9B9B9B]"
          />
          <Button
            onClick={handleSend}
            disabled={llmLoading || (mode === 'replay' && simStep >= SIMULATED_RESPONSES.length) || (mode === 'live' && (!apiKey || !inputValue.trim()))}
          >
            {llmLoading ? '...' : '发送'}
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <LevelLayout
      title="Agent vs Harness 边界"
      levelNumber="1.1"
      mode={mode}
      onModeChange={setMode}
      conceptCard={<ConceptCard {...LEVEL_1_1_CONCEPT} />}
      simulation={chatArea}
      pipeline={pipelineContent}
    />
  )
}