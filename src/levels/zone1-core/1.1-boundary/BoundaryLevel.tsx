import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import LevelLayout from '../../../components/layout/LevelLayout'
import ConceptCard from '../../../components/concept/ConceptCard'
import PlaybackControls from '../../../components/playback/PlaybackControls'
import PipelineView from '../../../components/pipeline/PipelineView'
import StepTimeline from '../../../components/pipeline/StepTimeline'
import Button from '../../../components/ui/Button'
import { useEngineStore } from '../../../store/engineStore'
import { useProgressStore } from '../../../store/progressStore'
import { loadTrace } from '../../../engine/TraceLoader'
import { LEVEL_1_1_CONCEPT } from '../../../data/conceptContent'
import { LEVEL_1_1_QUIZ } from '../../../data/quizQuestions'

export default function BoundaryLevel() {
  const loadSteps = useEngineStore((s) => s.loadSteps)
  const status = useEngineStore((s) => s.status)
  const steps = useEngineStore((s) => s.steps)
  const reset = useEngineStore((s) => s.reset)
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const isCompleted = useProgressStore((s) => s.isCompleted)

  const [traceLoaded, setTraceLoaded] = useState(false)
  const [started, setStarted] = useState(false)
  const [quizPhase, setQuizPhase] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    loadTrace('/traces/1.1-create-calc').then((steps) => {
      loadSteps(steps)
      setTraceLoaded(true)
    })
    return () => { reset() }
  }, [])

  const handleStart = () => {
    setStarted(true)
    setQuizPhase(false)
    setQuizPassed(false)
    setSelectedAnswer(null)
    setShowFeedback(false)
  }

  const handleQuizSubmit = () => {
    if (selectedAnswer === LEVEL_1_1_QUIZ.correctIndex) {
      setQuizPassed(true)
      completeLevel('1.1-boundary', 'replay')
    } else {
      setShowFeedback(true)
    }
  }

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

  return (
    <LevelLayout
      title="Agent vs Harness 边界"
      levelNumber="1.1"
      conceptCard={<ConceptCard {...LEVEL_1_1_CONCEPT} />}
      simulation={
        <div className="flex flex-col gap-6">
          {/* Intro / Not started */}
          {!started && !quizPassed && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
                <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                  任务：为 calc.py 添加 add 函数
                </h2>
                <p className="text-sm text-[#6B6B6B] leading-relaxed mb-4">
                  下面是一个真实 Agent 的执行记录，数据来自 <code className="bg-[#F0F0F0] px-1 py-0.5 rounded text-xs font-mono">labs/local-agent-python</code> 的 eval 运行。
                </p>
                <p className="text-sm text-[#6B6B6B] leading-relaxed mb-4">
                  观察管道中每一步的数据流，注意区分 <span className="text-[#5E6AD2] font-medium">蓝色 = Model 决策</span> 和 <span className="text-[#787F95] font-medium">灰色 = Harness 约束</span>。
                  点击管道节点可以<span className="font-medium text-[#1A1A1A]">展开查看内部数据</span>。
                </p>

                {traceLoaded ? (
                  <Button onClick={handleStart}>开始回放</Button>
                ) : (
                  <p className="text-sm text-[#9B9B9B]">加载 trace 数据中...</p>
                )}

                {isCompleted('1.1-boundary') && (
                  <Button variant="ghost" className="ml-2" onClick={() => { setQuizPhase(true); setSelectedAnswer(null); setShowFeedback(false); }}>
                    直接答题
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Playback controls */}
          {started && status !== 'idle' && !quizPhase && !quizPassed && (
            <PlaybackControls />
          )}

          {/* Completion hint */}
          {started && status === 'completed' && !quizPhase && !quizPassed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#F0F9F2] border border-[#2DA44E]/20 rounded-xl p-4"
            >
              <p className="text-sm text-[#1A1A1A] mb-3">
                ✅ 回放完成！现在来检验你的理解。
              </p>
              <Button onClick={() => { setQuizPhase(true); setSelectedAnswer(null); setShowFeedback(false); }}>
                开始答题
              </Button>
            </motion.div>
          )}

          {/* Quiz */}
          {quizPhase && !quizPassed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-[#E5E5E5] p-6"
            >
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">过关测试</h3>
              <p className="text-sm text-[#1A1A1A] mb-4">{LEVEL_1_1_QUIZ.question}</p>
              <div className="space-y-2 mb-4">
                {LEVEL_1_1_QUIZ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedAnswer(i); setShowFeedback(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                      selectedAnswer === i
                        ? 'border-[#5E6AD2] bg-[#5E6AD2]/5 text-[#5E6AD2]'
                        : 'border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <span className="font-mono text-xs text-[#9B9B9B] mr-2">{opt.label})</span>
                    {opt.text}
                  </button>
                ))}
              </div>
              <Button onClick={handleQuizSubmit} disabled={selectedAnswer === null}>
                提交答案
              </Button>

              {showFeedback && (
                <p className="text-sm text-[#D23B3B] mt-3">
                  答案不正确。提示：A 和 B 都是模型根据任务语义自主选择的，而拒绝执行是 Harness 用确定性代码判断的。
                </p>
              )}
            </motion.div>
          )}

          {/* Passed */}
          {quizPassed && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-xl border border-[#2DA44E]/30 p-8 text-center"
            >
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">关卡通过！</h3>
              <p className="text-sm text-[#6B6B6B] mb-2">1.1 Agent vs Harness 边界 — 已完成</p>
              <div className="bg-[#F0F9F2] rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-[#1A1A1A]">{LEVEL_1_1_QUIZ.explanation}</p>
              </div>
              <p className="text-xs text-[#9B9B9B] mb-4">1.2 ReAct 最小循环 已解锁</p>
              <Button onClick={() => window.location.href = '/'}>
                返回地图
              </Button>
            </motion.div>
          )}
        </div>
      }
      pipeline={pipelineContent}
    />
  )
}