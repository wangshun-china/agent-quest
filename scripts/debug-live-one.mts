/**
 * One-shot debug: prove live agent is not instant-empty.
 */
import {
  WORKSPACE_PROFILE,
  createWorkspace,
  runLiveAgentTurn,
  type GlassPipeline,
} from '../src/harness/index.ts'

const apiKey =
  process.env.AQ_API_KEY ||
  process.env.DASHSCOPE_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  ''
const apiBaseUrl = (
  process.env.AQ_BASE_URL ||
  process.env.DASHSCOPE_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
).replace(/\/$/, '')
const model = process.env.AQ_MODEL || 'qwen3.6-27b'

if (!apiKey) {
  console.error('NO_KEY')
  process.exit(1)
}

const t0 = Date.now()
const pipes: Array<{ ms: number; branch: string; title: string; nodes: number }> = []

console.log('start', { model, base: apiBaseUrl, keyLen: apiKey.length })

const result = await runLiveAgentTurn({
  userText:
    '你必须使用 list_files 工具列出工作区文件。不要直接用文字回答，必须 tool_call。',
  history: [],
  config: { apiKey, apiBaseUrl, model },
  profile: WORKSPACE_PROFILE,
  workspace: createWorkspace(),
  maxRounds: 4,
  hooks: {
    onPipeline: (p: GlassPipeline) => {
      const row = {
        ms: Date.now() - t0,
        branch: p.branch,
        title: p.title,
        nodes: p.nodes.length,
      }
      pipes.push(row)
      console.log('PIPE', JSON.stringify(row))
    },
    onStatus: (s) => console.log('STATUS', Date.now() - t0, s),
    onAssistant: (t, m) =>
      console.log('ASST', Date.now() - t0, m?.kind, t.slice(0, 160).replace(/\n/g, ' ')),
    requestApproval: async () => true,
  },
})

console.log(
  'DONE',
  JSON.stringify({
    ms: Date.now() - t0,
    pipelineSteps: result.pipelineSteps,
    historyLen: result.history.length,
    pipes,
    lastHistory: result.history.slice(-3).map((h) => ({
      role: h.role,
      content: (h.content || '').slice(0, 120),
    })),
  }),
)
