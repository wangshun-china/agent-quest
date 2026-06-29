# Agent Quest — 项目搭建 + 第一关实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 搭建 Agent Quest 项目基础架构，实现第一关 1.1「Agent vs Harness 边界」

**Architecture:** React SPA with Vite，Zustand 管理三层状态，关卡组件通过 registry 注册。第一关使用预置 trace 数据驱动回放模式。

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Framer Motion + React Router v6

## Global Constraints

- 纯前端 SPA，无后端
- Linear 风格浅色主题，Inter + JetBrains Mono
- 管道节点可点击展开内部数据
- 每个 task 完成后 commit

---

## Task 1: Project scaffolding

Create Vite project with all deps. Files: package.json, index.html, vite.config.ts, tsconfig*.json, tailwind.config.ts, postcss.config.js, src/main.tsx, src/App.tsx, src/index.css

**Steps:**
1. Write all config files
2. `npm install`
3. `npm run dev` → verify
4. Commit

---

## Task 2: Core types

Create `src/types/index.ts` with: Message, ToolCall, ToolResult, PipelineNodeData, StepTrace, BudgetSnapshot, PolicyDecision, ContextManifest. All shared types for engine and UI.

---

## Task 3: Zustand stores

Create `src/store/configStore.ts` (API key, model config, persisted), `src/store/progressStore.ts` (level completion, persisted), `src/store/engineStore.ts` (runtime state: steps, currentStepIndex, playbackSpeed, expandedNodeId).

---

## Task 4: Trace data

Copy trace files from `G:/project/career-system/labs/local-agent-python/eval_runs/create_add_function/runs/eval-run/` to `public/traces/1.1-create-calc/`. Create run_result.json.

---

## Task 5: UI components

Create `src/components/ui/Button.tsx` with primary/secondary/ghost variants and sm/md sizes.

---

## Task 6: ConceptCard

Create `src/components/concept/ConceptCard.tsx` with collapsible sections, code blocks, tables, conclusion box, and reference links. Props: title, subtitle, sections[], conclusion, references[].

---

## Task 7: PipelineNode

Create `src/components/pipeline/PipelineNode.tsx` with idle/active/done/error states, model/harness type colors, pulse animation on active, click handler.

---

## Task 8: DataPanel

Create `src/components/pipeline/DataPanel.tsx` showing JSON-formatted data for expanded pipeline node. Header with close button, formatted JSON body, timing metadata footer.

---

## Task 9: PipelineView + StepTimeline

Create `src/components/pipeline/PipelineView.tsx` rendering PipelineNodes horizontally with arrows. Create `src/components/pipeline/StepTimeline.tsx` showing vertical step list with phase badges.

---

## Task 10: PlaybackControls

Create `src/components/playback/PlaybackControls.tsx` with progress bar, prev/play-pause/next buttons, speed selector (0.5x/1x/2x), reset button.

---

## Task 11: TopBar

Create `src/components/layout/TopBar.tsx` with back-to-map link, level title, API status indicator.

---

## Task 12: LevelLayout

Create `src/components/layout/LevelLayout.tsx` with three-column layout: concept card (280px) | simulation (flex) | pipeline (340px).

---

## Task 13: TraceLoader

Create `src/engine/TraceLoader.ts` that fetches event_log.jsonl and model_call_log.jsonl, parses JSONL, groups by step, and builds StepTrace[] with pipeline nodes and data.

---

## Task 14: Concept content

Create `src/data/conceptContent.ts` with LEVEL_1_1_CONCEPT object containing title, subtitle, sections (code block, table, text), conclusion, references.

---

## Task 15: Quiz questions

Create `src/data/quizQuestions.ts` with LEVEL_1_1_QUIZ: question about Harness vs Model decision, 3 options, correct answer C, explanation.

---

## Task 16: BoundaryLevel (1.1 page)

Create `src/levels/zone1-core/1.1-boundary/BoundaryLevel.tsx` and `index.ts`. Level component loads trace, renders LevelLayout with ConceptCard, PlaybackControls, and Pipeline. Shows intro → playback → quiz → pass flow.

---

## Task 17: Level registry + types

Create `src/levels/types.ts` (LevelConfig interface) and `src/levels/registry.ts` (LEVEL_REGISTRY array with level 1.1). Modify `src/App.tsx` to add routes for WorldMap and all registered levels.

---

## Task 18: WorldMap

Create `src/pages/WorldMap.tsx` showing 5 zones with level cards. Each card shows lock/complete status, level type badge. Click navigates to level route.

---

## Task 19: Global styles

Update `src/index.css` with Tailwind directives, body base styles, custom utility classes.

---

## Task 20: Verify and fix

`npm run build` → must succeed. `npm run dev` → WorldMap shows → click 1.1 → trace loads → pipeline renders → quiz passes → returns to map.