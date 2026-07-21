import LiveGlassLevel from '../../components/live/LiveGlassLevel'
import type { QuizQuestion } from '../../data/quizQuestions'

type Concept = React.ComponentProps<typeof import('../../components/concept/ConceptCard').default>

export function makeLiveLevel(opts: {
  levelId: string
  title: string
  levelNumber: string
  concept: Concept
  quiz: QuizQuestion
  focusTitle: string
  focusBody: string
  suggestedPrompt?: string
  profileDefault?: 'workspace' | 'read-only'
}) {
  return function Level() {
    return (
      <LiveGlassLevel
        levelId={opts.levelId}
        title={opts.title}
        levelNumber={opts.levelNumber}
        concept={opts.concept}
        quiz={opts.quiz}
        focusTitle={opts.focusTitle}
        focusBody={opts.focusBody}
        suggestedPrompt={opts.suggestedPrompt}
        profileDefault={opts.profileDefault}
        defaultMode="live"
      />
    )
  }
}
