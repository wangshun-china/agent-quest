import { ReactNode, useState, useCallback, useEffect, useRef } from 'react'
import TopBar from './TopBar'

interface LevelLayoutProps {
  title: string;
  levelNumber: string;
  conceptCard: ReactNode;
  simulation: ReactNode;
  pipeline: ReactNode;
  mode?: 'live' | 'replay';
  onModeChange?: (mode: 'live' | 'replay') => void;
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

function Resizer({
  panelRef,
  minSize,
  maxSize,
  initialSize,
  onResizeEnd,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  minSize: number;
  maxSize: number;
  initialSize: number;
  onResizeEnd: (finalSize: number) => void;
}) {
  const currentSize = useRef(initialSize)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = panelRef.current?.offsetWidth ?? currentSize.current

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newW = Math.min(maxSize, Math.max(minSize, startW + delta))
      currentSize.current = newW
      if (panelRef.current) {
        panelRef.current.style.width = `${newW}px`
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      onResizeEnd(currentSize.current)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [panelRef, minSize, maxSize, onResizeEnd])

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-[5px] shrink-0 cursor-col-resize hover:bg-[#5E6AD2]/40 active:bg-[#5E6AD2]/60 transition-colors duration-150 relative group z-10"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}

export default function LevelLayout({
  title,
  levelNumber,
  conceptCard,
  simulation,
  pipeline,
  mode,
  onModeChange,
}: LevelLayoutProps) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(() => loadSizes().left)
  const [rightWidth, setRightWidth] = useState(() => loadSizes().right)

  const handleLeftResizeEnd = useCallback((finalSize: number) => {
    setLeftWidth(finalSize)
    saveSizes(finalSize, rightWidth)
  }, [rightWidth])

  const handleRightResizeEnd = useCallback((finalSize: number) => {
    setRightWidth(finalSize)
    saveSizes(leftWidth, finalSize)
  }, [leftWidth])

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      <TopBar title={title} levelNumber={levelNumber} mode={mode} onModeChange={onModeChange} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Concept card */}
        <div
          ref={leftRef}
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: leftWidth }}
        >
          {conceptCard}
        </div>

        <Resizer
          panelRef={leftRef}
          minSize={MIN_LEFT}
          maxSize={MAX_LEFT}
          initialSize={leftWidth}
          onResizeEnd={handleLeftResizeEnd}
        />

        {/* Center: Simulation */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {simulation}
        </div>

        <Resizer
          panelRef={rightRef}
          minSize={MIN_RIGHT}
          maxSize={MAX_RIGHT}
          initialSize={rightWidth}
          onResizeEnd={handleRightResizeEnd}
        />

        {/* Right: Pipeline */}
        <div
          ref={rightRef}
          className="shrink-0 overflow-y-auto p-4"
          style={{ width: rightWidth }}
        >
          {pipeline}
        </div>
      </div>
    </div>
  )
}