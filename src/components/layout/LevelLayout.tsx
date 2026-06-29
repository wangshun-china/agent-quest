import { ReactNode } from 'react'
import TopBar from './TopBar'

interface LevelLayoutProps {
  title: string;
  levelNumber: string;
  conceptCard: ReactNode;
  simulation: ReactNode;
  pipeline: ReactNode;
}

export default function LevelLayout({
  title,
  levelNumber,
  conceptCard,
  simulation,
  pipeline,
}: LevelLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      <TopBar title={title} levelNumber={levelNumber} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] shrink-0 overflow-y-auto border-r border-[#E5E5E5] p-4">
          {conceptCard}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {simulation}
        </div>

        <div className="w-[340px] shrink-0 overflow-y-auto border-l border-[#E5E5E5] p-4">
          {pipeline}
        </div>
      </div>
    </div>
  )
}