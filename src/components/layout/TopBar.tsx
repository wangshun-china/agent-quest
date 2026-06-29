import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '../../store/configStore'

interface TopBarProps {
  title: string;
  levelNumber: string;
}

export default function TopBar({ title, levelNumber }: TopBarProps) {
  const navigate = useNavigate()
  const apiKey = useConfigStore((s) => s.apiKey)

  return (
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
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-[#2DA44E]' : 'bg-[#E5E5E5]'}`} />
          <span className="text-xs text-[#9B9B9B]">
            {apiKey ? 'API 已配置' : '未配置 API'}
          </span>
        </div>
      </div>
    </div>
  )
}