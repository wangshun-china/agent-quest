import { lazy } from 'react'
import type { LevelConfig } from '../../types'
const c: LevelConfig = { id:'2.4-verification',zone:2,order:4,title:'验证反馈与自动修复',description:'测试失败→修复→重试闭环',type:'debug',component:lazy(()=>import('./Level')),requiresLevels:['2.3-code-edit'],references:[{title:'Reflexion',url:'https://arxiv.org/abs/2303.11366',source:'ICLR 2023'}] }
export default c
