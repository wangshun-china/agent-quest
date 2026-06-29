import { useEngineStore } from '../../store/engineStore'

export default function StepTimeline() {
  const steps = useEngineStore((s) => s.steps)
  const currentStepIndex = useEngineStore((s) => s.currentStepIndex)
  const setCurrentStepIndex = useEngineStore((s) => s.setCurrentStepIndex)

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider font-medium px-1 mb-1">
        Steps
      </p>
      {steps.map((s, i) => (
        <button
          key={s.step}
          onClick={() => setCurrentStepIndex(i)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
            ${i === currentStepIndex
              ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] font-medium'
              : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'
            }
          `}
        >
          <span className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0
            ${i === currentStepIndex
              ? 'bg-[#5E6AD2] text-white'
              : 'bg-[#F0F0F0] text-[#9B9B9B]'
            }
          `}>
            {s.step}
          </span>
          <span className="text-xs capitalize">{s.phase}</span>
          {s.phase === 'tool' && s.policyDecision?.outcome === 'deny' && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#D23B3B] font-medium">DENY</span>
          )}
          {s.phase === 'final' && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#F0F9F2] text-[#2DA44E] font-medium">DONE</span>
          )}
        </button>
      ))}
    </div>
  )
}