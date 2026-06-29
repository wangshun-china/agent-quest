import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConfigStore } from '../store/configStore'
import Button from './ui/Button'

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const { apiKey, apiBaseUrl, model, setApiKey, setApiBaseUrl, setModel } = useConfigStore()
  const [keyInput, setKeyInput] = useState(apiKey)
  const [urlInput, setUrlInput] = useState(apiBaseUrl)
  const [modelInput, setModelInput] = useState(model)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')

  const handleSave = () => {
    setApiKey(keyInput)
    setApiBaseUrl(urlInput)
    setModel(modelInput)
    onClose()
  }

  const handleTest = async () => {
    if (!keyInput) return
    setTestStatus('testing')
    setTestMsg('')
    try {
      const res = await fetch(`${urlInput}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyInput}`,
        },
        body: JSON.stringify({
          model: modelInput,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      })
      if (res.ok) {
        setTestStatus('ok')
        setTestMsg('连接成功')
      } else {
        const err = await res.text()
        setTestStatus('fail')
        setTestMsg(`HTTP ${res.status}: ${err.slice(0, 120)}`)
      }
    } catch (e: unknown) {
      setTestStatus('fail')
      setTestMsg(e instanceof Error ? e.message : '网络错误')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-lg p-6 w-[420px] max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#1A1A1A]">API 配置</h2>
              <button onClick={onClose} className="text-[#9B9B9B] hover:text-[#1A1A1A]">✕</button>
            </div>

            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">API Key</label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => { setKeyInput(e.target.value); setTestStatus('idle') }}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg font-mono focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
                  Base URL
                  <span className="text-[#9B9B9B] ml-1">— 兼容 OpenAI 格式</span>
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setTestStatus('idle') }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg font-mono focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30"
                />
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {[
                    ['OpenAI', 'https://api.openai.com/v1'],
                    ['百炼', 'https://dashscope.aliyuncs.com/compatible-mode/v1'],
                    ['Ollama', 'http://localhost:11434/v1'],
                  ].map(([label, url]) => (
                    <button
                      key={label}
                      onClick={() => { setUrlInput(url); setTestStatus('idle') }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        urlInput === url
                          ? 'border-[#5E6AD2] bg-[#5E6AD2]/5 text-[#5E6AD2]'
                          : 'border-[#E5E5E5] text-[#9B9B9B] hover:border-[#D0D0D0]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">Model</label>
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => { setModelInput(e.target.value); setTestStatus('idle') }}
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg font-mono focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30"
                />
              </div>

              {/* Test result */}
              {testStatus !== 'idle' && (
                <div className={`text-xs px-3 py-2 rounded-lg ${
                  testStatus === 'testing' ? 'bg-[#F5F5F5] text-[#6B6B6B]' :
                  testStatus === 'ok' ? 'bg-[#F0F9F2] text-[#2DA44E]' :
                  'bg-[#FEF2F2] text-[#D23B3B]'
                }`}>
                  {testStatus === 'testing' ? '测试中...' : testMsg}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <Button onClick={handleTest} variant="secondary" disabled={!keyInput || testStatus === 'testing'}>
                {testStatus === 'testing' ? '测试中...' : '测试连接'}
              </Button>
              <Button onClick={handleSave} className="flex-1">
                保存
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}