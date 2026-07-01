import { lazy } from 'react'
import type { LevelConfig } from '../../types'
const c: LevelConfig = { id:'2.2-runtime-policy',zone:2,order:2,title:'Runtime Policy 权限审批',description:'allow/ask/deny 策略决策',type:'decision',component:lazy(()=>import('./Level')),requiresLevels:['2.1-tool-registry'],references:[{title:'Codex Approvals',url:'https://developers.openai.com/codex/agent-approvals-security',source:'OpenAI'}] }
export default c
