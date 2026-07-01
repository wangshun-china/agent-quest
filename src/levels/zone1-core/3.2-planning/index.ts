import { lazy } from 'react'
import type { LevelConfig } from '../../types'
const c: LevelConfig = { id:'3.2-planning',zone:3,order:2,title:'Planning 与 Plan-Execute',description:'task plan, goals, evidence, re-planning',type:'decision',component:lazy(()=>import('./Level')),requiresLevels:['3.1-context-engineering'],references:[{title:'Plan-and-Solve',url:'https://arxiv.org/abs/2305.04091',source:'ICLR 2024'}] }
export default c
