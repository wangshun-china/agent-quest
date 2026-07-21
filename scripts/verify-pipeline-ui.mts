/**
 * Non-browser verification that UI pipeline helpers never ship 0-node frames
 * and live turns take real wall time with multi-frame pipelines.
 */
import {
  WORKSPACE_PROFILE,
  buildConnectingPipeline,
  buildWaitingPipeline,
  createWorkspace,
  emptyPipeline,
  runLiveAgentTurn,
  type GlassPipeline,
} from '../src/harness/index.ts'

function assertNodes(p: GlassPipeline, label: string) {
  if (!p.nodes.length) {
    throw new Error(`${label} has 0 nodes — UI would show blank rail`)
  }
  console.log('OK', label, 'nodes=', p.nodes.length, 'branch=', p.branch)
}

assertNodes(emptyPipeline('idle hint'), 'emptyPipeline')
assertNodes(buildConnectingPipeline('qwen3.6-27b', '/llm-proxy/dashscope'), 'connecting')
assertNodes(buildWaitingPipeline(1, 'qwen3.6-27b', 2), 'waiting')

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
  console.error('SKIP live: no key')
  process.exit(0)
}

const t0 = Date.now()
const frames: GlassPipeline[] = []
const result = await runLiveAgentTurn({
  userText:
    '请严格用工具：先 list_files，再 read_file 读取 calc.py，最后用一句话总结。禁止不调用工具直接编造。',
  history: [],
  config: { apiKey, apiBaseUrl, model },
  profile: WORKSPACE_PROFILE,
  workspace: createWorkspace(),
  maxRounds: 6,
  hooks: {
    onPipeline: (p) => {
      frames.push(p)
      assertNodes(p, `frame#${frames.length} ${p.title}`)
      console.log(
        `  +${Date.now() - t0}ms frame#${frames.length} ${p.branch} "${p.title}"`,
      )
    },
    onStatus: (s) => console.log(`  status +${Date.now() - t0}ms`, s),
    onAssistant: (t, m) =>
      console.log(`  asst +${Date.now() - t0}ms`, m?.kind, t.slice(0, 80).replace(/\n/g, ' ')),
    requestApproval: async () => true,
  },
})

const ms = Date.now() - t0
console.log(
  JSON.stringify(
    {
      ms,
      pipelineSteps: result.pipelineSteps,
      frames: frames.length,
      branches: frames.map((f) => f.branch),
      minNodes: Math.min(...frames.map((f) => f.nodes.length)),
      ok: ms >= 800 && frames.length >= 2 && frames.every((f) => f.nodes.length > 0),
    },
    null,
    2,
  ),
)

if (ms < 800) {
  console.error('FAIL: finished too fast for a real LLM call')
  process.exit(2)
}
if (frames.some((f) => f.nodes.length === 0)) {
  console.error('FAIL: empty pipeline frame')
  process.exit(3)
}
if (frames.length < 2) {
  console.error('FAIL: too few pipeline frames')
  process.exit(4)
}
console.log('PASS live multi-frame real timing')
