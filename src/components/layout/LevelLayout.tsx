import { ReactNode, useState, useCallback, useEffect, useRef } from 'react'
import TopBar from './TopBar'

interface LevelLayoutProps {
  title: string;
  levelNumber: string;
  conceptCard: ReactNode;
  simulation: ReactNode;
  pipeline: ReactNode;
}

const MIN_LEFT = 220
const MAX_LEFT = 480
const MIN_RIGHT = 260
const MAX_RIGHT = 560
const DEFAULT_LEFT = 280
const DEFAULT_RIGHT = 340
const STORAGE_KEY = 'agent-quest-panel-sizes'

function loadSizes(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        left: Math.min(MAX_LEFT, Math.max(MIN_LEFT, parsed.left || DEFAULT_LEFT)),
        right: Math.min(MAX_RIGHT, Math.max(MIN_RIGHT, parsed.right || DEFAULT_RIGHT)),
      }
    }
  } catch { /* ignore */ }
  return { left: DEFAULT_LEFT, right: DEFAULT_RIGHT }
}

function saveSizes(left: number, right: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }))
  } catch { /* ignore */ }
}

function Resizer({ onDrag, position }: { onDrag: (delta: number) => void; position: 'left' | 'right' }) {
  const resizerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      onDrag(position === 'left' ? delta : -delta)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onDrag, position])

  return (
    <div
      ref={resizerRef}
      onMouseDown={handleMouseDown}
      className="w-1 shrink-0 cursor-col-resize hover:bg-[#5E6AD2]/40 active:bg-[#5E6AD2]/60 transition-colors duration-150 relative group"
    >
      <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#5E6AD2]/10 transition-colors duration-150" />
    </div>
  )
}

export default function LevelLayout({
  title,
  levelNumber,
  conceptCard,
  simulation,
  pipeline,
}: LevelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(() => loadSizes().left)
  const [rightWidth, setRightWidth] = useState(() => loadSizes().right)

  const handleLeftDrag = useCallback((delta: number) => {
    setLeftWidth((prev) => {
      const next = Math.min(MAX_LEFT, Math.max(MIN_LEFT, prev + delta))
      saveSizes(next, rightWidth)
      return next
    })
  }, [rightWidth])

  const handleRightDrag = useCallback((delta: number) => {
    setRightWidth((prev) => {
      const next = Math.min(MAX_RIGHT, Math.max(MIN_RIGHT, prev + delta))
      saveSizes(leftWidth, next)
      return next
    })
  }, [leftWidth])

  // Sync save when either changes
  useEffect(() => {
    saveSizes(leftWidth, rightWidth)
  }, [leftWidth, rightWidth])

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      <TopBar title={title} levelNumber={levelNumber} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Concept card */}
        <div
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: leftWidth }}
        >
          {conceptCard}
        </div>

        {/* Left resizer */}
        <Resizer onDrag={handleLeftDrag} position="left" />

        {/* Center: Simulation area */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {simulation}
        </div>

        {/* Right resizer */}
        <Resizer onDrag={handleRightDrag} position="right" />

        {/* Right: Pipeline */}
        <div
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: rightWidth }}
        >
          {pipeline}
        </div>
      </div>
    </div>
  )
}