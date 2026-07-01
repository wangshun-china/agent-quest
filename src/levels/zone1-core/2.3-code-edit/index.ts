import { lazy } from 'react'
import type { LevelConfig } from '../../types'
const c: LevelConfig = { id:'2.3-code-edit',zone:2,order:3,title:'代码编辑与 Patch 系统',description:'read-before-edit, replace_text, apply_patch',type:'config',component:lazy(()=>import('./Level')),requiresLevels:['2.2-runtime-policy'],references:[{title:'Aider',url:'https://github.com/paul-gauthier/aider',source:'GitHub'}] }
export default c
