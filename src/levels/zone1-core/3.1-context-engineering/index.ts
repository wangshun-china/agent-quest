import { lazy } from 'react'
import type { LevelConfig } from '../../types'
const c: LevelConfig = { id:'3.1-context-engineering',zone:3,order:1,title:'Context Engineering',description:'ContextBuilder, priority, budget, compact',type:'config',component:lazy(()=>import('./Level')),requiresLevels:['2.4-verification'],references:[{title:'Building effective agents',url:'https://www.anthropic.com/engineering/building-effective-agents',source:'Anthropic'}] }
export default c
