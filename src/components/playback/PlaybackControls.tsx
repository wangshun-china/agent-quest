import { useEngineStore } from '../../store/engineStore'
import Button from '../ui/Button'

export default function PlaybackControls() {
  const status = useEngineStore((s) => s.status)
  const currentStepIndex = useEngineStore((s) => s.currentStepIndex)
  const steps = useEngineStore((s) => s.steps)
  const playbackSpeed = useEngineStore((s) => s.playbackSpeed)
  const goToPrevStep = useEngineStore((s) => s.goToPrevStep)
  const goToNextStep = useEngineStore((s) => s.goToNextStep)
  const setPlaybackSpeed = useEngineStore((s) => s.setPlaybackSpeed)
  const setStatus = useEngineStore((s) => s.setStatus)
  const reset = useEngineStore((s) => s.reset)

  const totalSteps = steps.length
  const currentStep = steps[currentStepIndex]

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-[#9B9B9B] font-medium">
          Step {currentStepIndex + 1}/{totalSteps}
        </span>
        <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5E6AD2] rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / Math.max(totalSteps, 1)) * 100}%` }}
          />
        </div>
        {currentStep && (
          <span className="text-xs text-[#9B9B9B]">
            {currentStep.timing.total ? `${currentStep.timing.total}ms` : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToPrevStep} disabled={currentStepIndex === 0}>
            ◀ 上一步
          </Button>
          {status === 'paused' || status === 'idle' ? (
            <Button size="sm" onClick={() => setStatus('running')}>
              ▶ 播放
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStatus('paused')}>
              ⏸ 暂停
            </Button>
          )}
          {currentStepIndex >= totalSteps - 1 ? (
            <Button variant="secondary" size="sm" onClick={goToNextStep}>
              ✓ 完成
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={goToNextStep}>
              下一步 ▶
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-[#5E6AD2] text-white'
                    : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={reset}>
            ↺ 重置
          </Button>
        </div>
      </div>
    </div>
  )
}