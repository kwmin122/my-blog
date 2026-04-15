# Plan 05-01 Summary

**Status**: DONE_WITH_CONCERNS
**Duration**: ~20 minutes
**Tasks**: 5/5

## Tasks Completed

- T1: Read current files — confirmed three/webgpu + three/tsl exports exist in r183 package, reviewed ArchipelagoScene.tsx, tokens.ts, WorldCanvas.tsx import pattern
- T2: Create shaders/CloudSeaSky.tsx — TSL NodeMaterial sky shader with horizon gradient + animated shimmer band commit dfc3807
- T3: Check lib/colorAudit.ts — file already existed (created by sibling plan 05-02); full implementation present, stub creation skipped
- T4: Modify ArchipelagoScene.tsx — removed fog+background, added CloudSeaSky + assertLightColor useEffect commit d2c44ac
- T5: Lint and type-check — tsc passes (0 errors); removed 6 unused @ts-expect-error directives (TSL types resolved fine in r183) commit 9cecac3

## Deviations

1. **three/webgpu.js not a physical file** — `node_modules/three/webgpu.js` does not exist as a physical file; it is exposed as a package.json `exports` entry (`"./webgpu"`). Import pattern `import * as THREE from 'three/webgpu'` works correctly via Node.js exports resolution. No change needed.

2. **lib/colorAudit.ts already existed** — Plan 05-02 (sibling wave 1 agent) ran before T3 and created the full `colorAudit.ts` implementation. Stub creation was skipped per the plan's "if the file already exists, skip this task" instruction.

3. **@ts-expect-error directives unused** — The plan instructed adding `// @ts-expect-error` for TSL type errors, but three/tsl r183 ships complete TypeScript declarations. All six directives caused `TS2578: Unused '@ts-expect-error' directive` errors on tsc run. Removed all six; tsc now exits 0.

4. **pnpm lint FAIL (worktree path issue)** — ESLint scans `.claude/worktrees/agent-*/tokens/tokens.ts` (sibling agent worktrees). The `ignores: ['tokens/tokens.ts']` pattern in `eslint.config.mjs` is root-relative and does NOT match the worktree-relative copies. Errors:
   - `.claude/worktrees/agent-a61c24d1/tokens/tokens.ts` lines 36-39
   - `.claude/worktrees/agent-aabb0ccb/tokens/tokens.ts` lines 36-39
   All 8 errors are `local/no-hardcoded-hex` on the pre-existing `tokens.scene.*` hex values. No file created or modified by this plan contributes any lint error. Files this plan touched (`shaders/CloudSeaSky.tsx`, `components/world/ArchipelagoScene.tsx`, `lib/colorAudit.ts`) are individually lint-clean (`npx eslint <files>` exits 0).

## Acceptance Criteria

- [x] `shaders/CloudSeaSky.tsx` exists — created at commit dfc3807
- [x] `grep 'colorNode' shaders/CloudSeaSky.tsx` — 2 matches
- [x] `grep 'NodeMaterial' shaders/CloudSeaSky.tsx` — 1 match
- [x] `grep 'useMemo' shaders/CloudSeaSky.tsx` — 2 matches
- [x] `grep 'BackSide' shaders/CloudSeaSky.tsx` — 1 match
- [x] `grep 'CloudSeaSky' components/world/ArchipelagoScene.tsx` — 2 matches
- [x] `grep '<fog' components/world/ArchipelagoScene.tsx` — 0 matches
- [x] `grep 'attach="background"' components/world/ArchipelagoScene.tsx` — 0 matches
- [x] `grep 'assertLightColor' components/world/ArchipelagoScene.tsx` — 3 matches
- [x] `npx tsc --noEmit` — exits 0

## Lint Gate

**lint_status**: FAIL

Reason: 8 `local/no-hardcoded-hex` errors in `.claude/worktrees/*/tokens/tokens.ts` (sibling agent worktree copies). The ESLint `ignores` rule only covers `tokens/tokens.ts` (root-relative), not worktree paths. No errors in files this plan created or modified.

## Lint Errors (first 10 lines)

```
/Users/min-kyungwook/Desktop/dev/webbuild/.claude/worktrees/agent-a61c24d1/tokens/tokens.ts
  36:17  error  Hardcoded hex "#a8d4f5" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
  37:17  error  Hardcoded hex "#fff8e8" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
  38:17  error  Hardcoded hex "#f0f4ff" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
  39:17  error  Hardcoded hex "#c4a882" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
/Users/min-kyungwook/Desktop/dev/webbuild/.claude/worktrees/agent-aabb0ccb/tokens/tokens.ts
  36:17  error  Hardcoded hex "#a8d4f5" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
  37:17  error  Hardcoded hex "#fff8e8" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
  38:17  error  Hardcoded hex "#f0f4ff" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
  39:17  error  Hardcoded hex "#c4a882" — use a token from tokens/tokens.ts or var(--color-*)  local/no-hardcoded-hex
```

## Concerns

1. **ESLint worktree scan**: The `eslint.config.mjs` `ignores` list should include `.claude/worktrees/**` to prevent scanning sibling agent worktrees. The orchestrator should add this to the eslint config after the wave completes.

2. **useFrame unused**: The plan mentioned `useFrame` as a dependency to import but the TSL `time` built-in auto-ticks in R3F+NodeMaterial — no manual `useFrame` call is needed. The import was intentionally omitted to avoid an unused-import lint error.
