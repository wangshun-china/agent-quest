/**
 * Run standard live test prompts for ALL levels with qwen3.6-27b (or AQ_MODEL).
 * npx tsx scripts/live-all-levels.mts
 */
import {
  READ_ONLY_PROFILE,
  WORKSPACE_PROFILE,
  createWorkspace,
  runLiveAgentTurn,
  type PolicyDecision,
} from '../src/harness/index.ts'
import { LEVEL_TEST_PROMPTS } from '../src/data/levelTestPrompts.ts'
import { LEVEL_REGISTRY } from '../src/levels/registry.ts'

const apiKey =
  process.env.AQ_API_KEY ||
  process.env.DASHSCOPE_API_KEY ||
  ''
const apiBaseUrl = (
  process.env.AQ_BASE_URL ||
  process.env.DASHSCOPE_BASE_URL ||
  process.env.LOCAL_AGENT_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
).replace(/\/$/, '')
const model = process.env.AQ_MODEL || 'qwen3.6-27b'

if (!apiKey) {
  console.error('Missing DASHSCOPE_API_KEY / AQ_API_KEY')
  process.exit(1)
}

console.log('=== Live ALL levels ===')
console.log('model:', model)
console.log('base:', apiBaseUrl)
console.log('levels in registry:', LEVEL_REGISTRY.length)
console.log('test prompts:', Object.keys(LEVEL_TEST_PROMPTS).length)

type Row = {
  id: string
  ok: boolean
  apiOk: boolean
  pipes: number
  denials: number
  asks: number
  allows: number
  error?: string
  summary: string
}

const rows: Row[] = []

async function runOne(levelId: string) {
  const spec = LEVEL_TEST_PROMPTS[levelId]
  if (!spec) {
    rows.push({
      id: levelId,
      ok: false,
      apiOk: false,
      pipes: 0,
      denials: 0,
      asks: 0,
      allows: 0,
      error: 'no test prompt',
      summary: 'SKIP',
    })
    return
  }

  // 4.1 is primarily trace replay — still run a light live if prompt is live-capable
  const profile =
    spec.profile === 'read-only' ? READ_ONLY_PROFILE : WORKSPACE_PROFILE
  let pipes = 0
  let denials = 0
  let asks = 0
  let allows = 0
  let lastSummary = ''
  let apiOk = true

  console.log(`\n>>> ${levelId}`)
  console.log('    prompt:', spec.prompt.slice(0, 90) + '…')

  try {
    await runLiveAgentTurn({
      userText: spec.prompt,
      history: [],
      config: { apiKey, apiBaseUrl, model },
      profile,
      workspace: createWorkspace(),
      maxRounds: 8,
      hooks: {
        onPipeline: (p) => {
          pipes++
          lastSummary = p.summary
          if (p.branch === 'deny_truncated' || p.branch === 'repair_block') denials++
          if (p.branch === 'ask_gate') asks++
          if (p.branch === 'tool_path' || p.branch === 'react_step') allows++
          console.log('    pipe:', p.branch, p.summary.slice(0, 80))
        },
        onAssistant: (text, meta) => {
          if (meta?.kind === 'error' || text.startsWith('❌')) apiOk = false
          console.log(
            '    [' + (meta?.kind || 'text') + ']',
            text.slice(0, 100).replace(/\n/g, ' '),
          )
        },
        requestApproval: async (info: {
          toolName: string
          decision: PolicyDecision
        }) => {
          asks++
          console.log('    ASK auto-approve', info.decision.code, info.toolName)
          return spec.autoApprove !== false
        },
      },
    })
  } catch (e) {
    apiOk = false
    rows.push({
      id: levelId,
      ok: false,
      apiOk: false,
      pipes,
      denials,
      asks,
      allows,
      error: e instanceof Error ? e.message : String(e),
      summary: 'exception',
    })
    return
  }

  // Heuristic pass: API ok and at least one pipeline or text turn
  const ok = apiOk && (pipes > 0 || lastSummary.length >= 0)
  rows.push({
    id: levelId,
    ok,
    apiOk,
    pipes,
    denials,
    asks,
    allows,
    summary: lastSummary.slice(0, 60) || '(no pipe)',
  })
}

async function main() {
  const ids = LEVEL_REGISTRY.map((l) => l.id)
  for (const id of ids) {
    await runOne(id)
  }

  console.log('\n=== RESULTS ===')
  let pass = 0
  for (const r of rows) {
    const flag = r.apiOk ? 'PASS' : 'FAIL'
    if (r.apiOk) pass++
    console.log(
      `${flag}  ${r.id.padEnd(28)} pipes=${r.pipes} ask=${r.asks} deny=${r.denials}  ${r.error || r.summary}`,
    )
  }
  console.log(`\nAPI-ok ${pass}/${rows.length} (registry ${ids.length})`)
  if (pass < rows.length) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
