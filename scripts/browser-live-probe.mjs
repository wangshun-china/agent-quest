/**
 * Headless browser probe: inject config, open a level, click one-shot test, observe pipeline.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const apiKey =
  process.env.AQ_API_KEY ||
  process.env.DASHSCOPE_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  ''
const model = process.env.AQ_MODEL || 'qwen3.6-27b'
const base = 'http://localhost:5173'
const levelPath = process.env.AQ_LEVEL || '/play/zone1/2.1-tool-registry'

if (!apiKey) {
  console.error('NO_KEY')
  process.exit(1)
}

const chromePath =
  process.env.CHROME ||
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const logs = []
page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`))
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))
page.on('response', (res) => {
  const u = res.url()
  if (u.includes('chat/completions') || u.includes('llm-proxy')) {
    logs.push(`[net] ${res.status()} ${u.slice(0, 120)}`)
  }
})

await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate(
  ({ apiKey, model }) => {
    localStorage.setItem(
      'agent-quest-config',
      JSON.stringify({
        state: {
          apiKey,
          apiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          model,
          defaultMode: 'live',
        },
        version: 0,
      }),
    )
  },
  { apiKey, model },
)

await page.goto(base + levelPath, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(800)

const before = await page.evaluate(() => ({
  title: document.title,
  body: document.body?.innerText?.slice(0, 1500) || '',
  glass: document.querySelector('.mesh-dark')?.textContent?.slice(0, 400) || '',
  buttons: [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean).slice(0, 40),
}))
console.log('BEFORE', JSON.stringify(before, null, 2))

const runBtn = page.getByRole('button', { name: /一键发送测试命令/ })
const visible = await runBtn.isVisible().catch(() => false)
console.log('runBtnVisible', visible)
if (!visible) {
  // expand guide
  const guide = page.getByRole('button', { name: /这一关怎么玩|新手引导|展开/ })
  if (await guide.first().isVisible().catch(() => false)) {
    await guide.first().click()
    await page.waitForTimeout(300)
  }
}

const t0 = Date.now()
await runBtn.click({ timeout: 10000 })
console.log('clicked at', Date.now() - t0)

// Sample UI over time
const samples = []
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(500)
  const snap = await page.evaluate(() => {
    const statusLine = [...document.querySelectorAll('p')].map((p) => p.textContent || '').find((t) => t.includes('Round') || t.includes('请求') || t.includes('本轮') || t.includes('调用') || t.includes('失败') || t.includes('连接')) || ''
    const glassHeader = document.querySelector('.mesh-dark h3')?.textContent || ''
    const glassSummary = document.querySelector('.mesh-dark p')?.textContent || ''
    const chips = [...document.querySelectorAll('.mesh-dark ~ * , .glass-panel')].slice(0, 0)
    const nodeLabels = [...document.querySelectorAll('button')]
      .map((b) => b.textContent || '')
      .filter((t) => /Context|Model|Policy|Runtime|Completion|Final|Tool|Observation|waiting|ALLOW|DENY|ASK/i.test(t))
      .slice(0, 12)
    const pipelineArt = document.body.innerText.includes('透明管道待命中')
    const pipeStat = [...document.querySelectorAll('span')].map((s) => s.textContent || '').find((t) => t.includes('管道步')) || ''
    const loading = [...document.querySelectorAll('button')].some((b) => /跑着|请求中/.test(b.textContent || ''))
    return {
      ms: 0,
      statusLine: statusLine.slice(0, 200),
      glassHeader,
      glassSummary: glassSummary.slice(0, 160),
      nodeLabels,
      pipelineArt,
      pipeStat,
      loading,
      hasWaiting: document.body.innerText.includes('请求模型') || document.body.innerText.includes('waiting'),
      hasPolicy: document.body.innerText.includes('Policy') || document.body.innerText.includes('ALLOW'),
    }
  })
  snap.ms = Date.now() - t0
  samples.push(snap)
  console.log('SAMPLE', JSON.stringify(snap))
  if (!snap.loading && i > 2 && (snap.pipeStat || snap.hasPolicy || /本轮|失败|异常/.test(snap.statusLine))) {
    // allow a couple more samples after done
    if (i > 6) break
  }
}

await page.screenshot({ path: 'scripts/browser-live-probe.png', fullPage: true })
const afterText = await page.evaluate(() => document.body.innerText.slice(0, 2500))
console.log('AFTER_TEXT', afterText)
console.log('LOGS', logs.join('\n'))
console.log('TOTAL_MS', Date.now() - t0)

fs.writeFileSync(
  'scripts/browser-live-probe.json',
  JSON.stringify({ samples, logs, totalMs: Date.now() - t0, afterText }, null, 2),
)

await browser.close()
