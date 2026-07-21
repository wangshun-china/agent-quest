/**
 * Live smoke test against real OpenAI-compatible API (env-driven).
 * Usage: npx tsx scripts/live-smoke.mts
 *
 * Env:
 *   AQ_API_KEY / DASHSCOPE_API_KEY
 *   AQ_BASE_URL / DASHSCOPE_BASE_URL / LOCAL_AGENT_BASE_URL
 *   AQ_MODEL (default qwen-plus)
 */
import {
  READ_ONLY_PROFILE,
  WORKSPACE_PROFILE,
  createWorkspace,
  runLiveAgentTurn,
  type GlassPipeline,
  type PolicyDecision,
} from '../src/harness/index.ts'

const apiKey =
  process.env.AQ_API_KEY ||
  process.env.DASHSCOPE_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  ''
const apiBaseUrl = (
  process.env.AQ_BASE_URL ||
  process.env.DASHSCOPE_BASE_URL ||
  process.env.LOCAL_AGENT_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
).replace(/\/$/, '')
const model = process.env.AQ_MODEL || 'qwen3.6-27b'

if (!apiKey) {
  console.error('No API key in env (AQ_API_KEY / DASHSCOPE_API_KEY)')
  process.exit(1)
}

const config = { apiKey, apiBaseUrl, model }
console.log('=== Live smoke ===')
console.log('base:', apiBaseUrl)
console.log('model:', model)
console.log('key:', apiKey.slice(0, 6) + '…' + apiKey.slice(-4))

type Step = { title: string; pipeline?: GlassPipeline; notes: string[] }

async function runScenario(
  name: string,
  userText: string,
  opts: {
    profile?: typeof WORKSPACE_PROFILE
    autoApprove?: boolean
  } = {},
) {
  const notes: string[] = []
  let lastPipe: GlassPipeline | undefined
  const profile = opts.profile ?? WORKSPACE_PROFILE
  const autoApprove = opts.autoApprove ?? true

  console.log(`\n--- ${name} ---`)
  console.log('user:', userText)

  const { history } = await runLiveAgentTurn({
    userText,
    history: [],
    config,
    profile,
    workspace: createWorkspace(),
    maxRounds: 6,
    hooks: {
      onPipeline: (p) => {
        lastPipe = p
        notes.push(`pipeline:${p.branch} | ${p.title}`)
        console.log('  pipeline:', p.branch, '|', p.summary.slice(0, 100))
      },
      onAssistant: (text, meta) => {
        notes.push(`assistant[${meta?.kind || 'text'}]: ${text.slice(0, 120)}`)
        console.log('  assistant[' + (meta?.kind || 'text') + ']:', text.slice(0, 160).replace(/\n/g, ' '))
      },
      requestApproval: async (info: {
        toolName: string
        args: Record<string, unknown>
        decision: PolicyDecision
      }) => {
        notes.push(`ask:${info.decision.code} tool=${info.toolName}`)
        console.log('  ASK:', info.decision.code, info.toolName, autoApprove ? '→ auto-approve' : '→ deny')
        return autoApprove
      },
    },
  })

  const ok = !history.some((h) => h.content?.startsWith('❌ API'))
  console.log('  turns:', history.length, ok ? 'OK' : 'FAIL')
  return { name, ok, notes, lastPipe, historyLen: history.length }
}

async function main() {
  const results = []

  // 1) inspect should allow
  results.push(
    await runScenario(
      '2.2 inspect allow',
      '只用 list_files 工具列出 workspace 里有什么文件，然后用一句话告诉我结果。不要写文件。',
      { profile: WORKSPACE_PROFILE, autoApprove: true },
    ),
  )

  // 2) write should ask then succeed when approved
  results.push(
    await runScenario(
      '2.2 write ask+approve',
      '读取 calc.py，然后用 write_file 在 note.txt 写入 hello，最后说明完成。',
      { profile: WORKSPACE_PROFILE, autoApprove: true },
    ),
  )

  // 3) read-only should deny write
  results.push(
    await runScenario(
      '2.2 read-only deny write',
      '用 write_file 创建 hack.txt 内容为 pwned。如果被拒绝，说明被拒绝的 code。',
      { profile: READ_ONLY_PROFILE, autoApprove: true },
    ),
  )

  // 4) edit without read — model may still try; policy should deny if it jumps to edit
  results.push(
    await runScenario(
      '2.3 read-before-edit',
      '不要先读文件，直接用 replace_text 把 calc.py 里的 return a + b 改成 return a * b。如果被拒绝就先 read_file 再改。',
      { profile: WORKSPACE_PROFILE, autoApprove: true },
    ),
  )

  // 5) simple final
  results.push(
    await runScenario(
      '1.4 tool then final',
      'read_file 读取 calc.py，然后总结 add 函数在做什么（不要再调用工具）。',
      { profile: WORKSPACE_PROFILE, autoApprove: true },
    ),
  )

  console.log('\n=== SUMMARY ===')
  let pass = 0
  for (const r of results) {
    const status = r.ok ? 'PASS' : 'FAIL'
    if (r.ok) pass++
    console.log(`${status}  ${r.name}  (msgs=${r.historyLen}, pipes=${r.notes.filter((n) => n.startsWith('pipeline')).length})`)
  }
  console.log(`\n${pass}/${results.length} scenarios API-ok`)
  if (pass < results.length) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
