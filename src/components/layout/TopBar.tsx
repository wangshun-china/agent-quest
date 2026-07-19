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
      <div className="h-14 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors flex items-center gap-1"
          >
            ← 地图
          </button>
          <span className="text-[#E5E5E5]">|</span>
          <span className="text-xs text-[#9B9B9B] font-mono">{levelNumber}</span>
          <h1 className="text-sm font-semibold text-[#1A1A1A]">{title}</h1>
          <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-[#1A1A2E] text-[#A8B4FF]">
            透明探索
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          {mode && onModeChange && (
            <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5">
              <button
                onClick={() => onModeChange('replay')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  mode === 'replay'
                    ? 'bg-white text-[#1A1A1A] shadow-sm font-medium'
                    : 'text-[#9B9B9B] hover:text-[#6B6B6B]'
                }`}
              >
                模拟数据
              </button>
              <button
                onClick={() => onModeChange('live')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  mode === 'live'
                    ? 'bg-white text-[#1A1A1A] shadow-sm font-medium'
                    : 'text-[#9B9B9B] hover:text-[#6B6B6B]'
                }`}
              >
                大模型驱动
              </button>
            </div>
          )}

          {/* API status */}
          <button
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-[#2DA44E]' : 'bg-[#E5E5E5]'}`} />
            <span className="text-xs text-[#9B9B9B]">
              {apiKey ? 'API 已配置' : '未配置 API'}
            </span>
          </button>
        </div>
      </div>

      <ConfigPanel isOpen={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  )
}