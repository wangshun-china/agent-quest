import PipelineNode from './PipelineNode'
import DataPanel from './DataPanel'
import { useEngineStore } from '../../store/engineStore'
import type { StepTrace } from '../../types'

export default function PipelineView() {
  const steps = useEngineStore((s) => s.steps)
  const currentStepIndex = useEngineStore((s) => s.currentStepIndex)
  const expandedNodeId = useEngineStore((s) => s.expandedNodeId)
  const expandNode = useEngineStore((s) => s.expandNode)

  const currentStep: StepTrace | undefined = steps[currentStepIndex]

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#9B9B9B]">
        加载 trace 数据后查看管道
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3 flex-wrap">
        {currentStep.pipeline.map((node, i) => (
          <div key={node.id} className="flex items-center gap-3">
            <PipelineNode
              node={node}
              isActive={node.status === 'active'}
              isExpanded={expandedNodeId === node.id}
              onClick={() => expandNode(expandedNodeId === node.id ? null : node.id)}
            />
            {i < currentStep.pipeline.length - 1 && (
              <span className="text-[#D0D0D0] text-lg">→</span>
            )}
          </div>
        ))}
      </div>

      {expandedNodeId && (
        <div className="flex-1 min-h-0">
          <DataPanel
            trace={currentStep}
            nodeId={expandedNodeId}
            onClose={() => expandNode(null)}
          />
        </div>
      )}
    </div>
  )
}