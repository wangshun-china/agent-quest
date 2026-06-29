import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import WorldMap from './pages/WorldMap'
import { LEVEL_REGISTRY } from './levels/registry'

function Loading() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#5E6AD2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#9B9B9B]">加载关卡...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<WorldMap />} />
        {LEVEL_REGISTRY.map((level) => {
          const LevelComponent = level.component
          return (
            <Route
              key={level.id}
              path={`/play/zone${level.zone}/${level.id}`}
              element={<LevelComponent />}
            />
          )
        })}
      </Routes>
    </Suspense>
  )
}