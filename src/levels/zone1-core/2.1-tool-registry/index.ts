import { lazy } from 'react'
import type { LevelConfig } from '../../types'
const c: LevelConfig = { id:'2.1-tool-registry',zone:2,order:1,title:'Tool Registry 与 ACI',description:'ToolSpec → Registry → Executor',type:'config',component:lazy(()=>import('./Level')),requiresLevels:['1.4-function-calling'],references:[{title:'SWE-agent: ACI',url:'https://arxiv.org/abs/2405.15793',source:'NeurIPS 2024'}] }
export default c