import { ReactNode, useCallback, useRef, useState, useEffect } from 'react'
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

const MIN_LEFT = 200
const MAX_LEFT = 400
const MIN_RIGHT = 300
const STORAGE_KEY = 'agent-quest-panel-sizes'

function loadSizes(): { leftW: number; rightRatio: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        leftW: Math.min(MAX_LEFT, Math.max(MIN_LEFT, p.leftW || 260)),
        rightRatio: p.rightRatio || 0.5,
      }
    }
  } catch { /* */ }
  // Prefer a wider glass pipeline column for transparent exploration
  return { leftW: 240, rightRatio: 0.48 }
}

function saveSizes(leftW: number, rightRatio: number) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ leftW, rightRatio })) } catch { /* */ }
}

function Resizer({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-[5px] shrink-0 cursor-col-resize hover:bg-[#5E6AD2]/40 active:bg-[#5E6AD2]/60 transition-colors relative z-10"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}

export default function LevelLayout({
  title, levelNumber, conceptCard, simulation, pipeline, mode, onModeChange,
}: LevelLayoutProps) {
  const [leftW, setLeftW] = useState(() => loadSizes().leftW)
  const [rightRatio, setRightRatio] = useState(() => loadSizes().rightRatio)
  const containerRef = useRef<HTMLDivElement>(null)

  // Left resizer: drag right → left panel grows
  const onLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = leftW
    const mm = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const w = Math.min(MAX_LEFT, Math.max(MIN_LEFT, startW + delta))
      setLeftW(w)
      saveSizes(w, rightRatio)
    }
    const mu = () => {
      document.removeEventListener('mousemove', mm)
      document.removeEventListener('mouseup', mu)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', mm)
    document.addEventListener('mouseup', mu)
  }, [leftW, rightRatio])

  // Right resizer: drag left → right panel GROWS (inverse relationship)
  const onRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const containerW = containerRef.current?.offsetWidth ?? 1200
    const startX = e.clientX
    const startRatio = rightRatio
    const mm = (ev: MouseEvent) => {
      // dragging LEFT means right panel grows → ratio increases
      const deltaPx = startX - ev.clientX
      const deltaRatio = deltaPx / containerW
      const r = Math.min(0.65, Math.max(0.3, startRatio + deltaRatio))
      setRightRatio(r)
      saveSizes(leftW, r)
    }
    const mu = () => {
      document.removeEventListener('mousemove', mm)
      document.removeEventListener('mouseup', mu)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', mm)
    document.addEventListener('mouseup', mu)
  }, [leftW, rightRatio])

  return (
    <div className="h-screen flex flex-col mesh-bg">
      <TopBar title={title} levelNumber={levelNumber} mode={mode} onModeChange={onModeChange} />

      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left: Concept */}
        <div className="shrink-0 overflow-y-auto p-3 sm:p-4 pretty-scroll bg-white/50 border-r border-[#E4E7F4]/90" style={{ width: leftW }}>
          {conceptCard}
        </div>

        <Resizer onMouseDown={onLeftMouseDown} />

        {/* Center + Right: flex split */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {/* Center: Simulation */}
          <div className="overflow-y-auto p-4 sm:p-6 min-w-0 pretty-scroll" style={{ width: `${(1 - rightRatio) * 100}%` }}>
            {simulation}
          </div>

          <Resizer onMouseDown={onRightMouseDown} />

          {/* Right: Glass pipeline */}
          <div
            className="overflow-y-auto p-3 sm:p-4 min-w-0 pretty-scroll border-l border-[#E4E7F4]/90"
            style={{
              width: `${rightRatio * 100}%`,
              minWidth: MIN_RIGHT,
              background:
                'linear-gradient(165deg, rgba(248,249,255,0.98) 0%, rgba(236,239,252,0.92) 55%, rgba(242,244,250,0.95) 100%)',
            }}
          >
            {pipeline}
          </div>
        </div>
      </div>
    </div>
  )
}