import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '../../store/configStore'
import ConfigPanel from '../ConfigPanel'

interface TopBarProps {
  title: string;
  levelNumber: string;
  mode?: 'live' | 'replay';
  onModeChange?: (mode: 'live' | 'replay') => void;
}

export default function TopBar({ title, levelNumber, mode, onModeChange }: TopBarProps) {
  const navigate = useNavigate()
  const apiKey = useConfigStore((s) => s.apiKey)
  const [configOpen, setConfigOpen] = useState(false)

  return (
    <>
      <div className="h-14 bg-white/75 backdrop-blur-xl border-b border-[#E4E7F4]/90 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[13px] text-[#6B6F85] hover:text-[#14141f] transition-colors flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 hover:bg-[#F0F1F8]"
          >
            <span className="text-[11px] opacity-70">←</span>
            地图
          </button>
          <span className="w-px h-4 bg-[#E4E7F4] shrink-0" />
          <span className="text-[11px] text-[#5E6AD2] font-mono font-medium bg-[#5E6AD2]/10 px-1.5 py-0.5 rounded-md shrink-0">
            {levelNumber}
          </span>
          <h1 className="text-[13px] sm:text-sm font-semibold text-[#14141f] truncate font-display tracking-tight">
            {title}
          </h1>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[#0c0e18] text-[#C4CBFF] shrink-0 border border-white/10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5E6AD2] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7B85E0]" />
            </span>
            透明机芯
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {mode && onModeChange && (
            <div className="flex items-center bg-[#F0F1F8]/90 rounded-xl p-0.5 border border-[#E4E7F4]">
              <button
                type="button"
                onClick={() => onModeChange('replay')}
                className={`px-2.5 sm:px-3 py-1 text-[11px] rounded-lg transition-all ${
                  mode === 'replay'
                    ? 'bg-white text-[#14141f] shadow-sm font-semibold'
                    : 'text-[#8B8FA3] hover:text-[#5A5E72]'
                }`}
              >
                模拟
              </button>
              <button
                type="button"
                onClick={() => onModeChange('live')}
                className={`px-2.5 sm:px-3 py-1 text-[11px] rounded-lg transition-all ${
                  mode === 'live'
                    ? 'bg-white text-[#14141f] shadow-sm font-semibold'
                    : 'text-[#8B8FA3] hover:text-[#5A5E72]'
                }`}
              >
                大模型
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-[#F0F1F8] transition-colors"
          >
            <div
              className={`w-2 h-2 rounded-full ring-2 ring-offset-1 ${
                apiKey
                  ? 'bg-[#2DA44E] ring-[#2DA44E]/25'
                  : 'bg-[#D0D0D8] ring-[#E5E5E5]'
              }`}
            />
            <span className="text-[11px] text-[#8B8FA3] hidden sm:inline">
              {apiKey ? 'API 就绪' : '配置 API'}
            </span>
          </button>
        </div>
      </div>

      <ConfigPanel isOpen={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  )
}
