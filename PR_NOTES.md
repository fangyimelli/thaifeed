## 2026-03-25 Sandbox 360 shot-driven overlay events

### Scope
- Enforced integration mode: patch on current branch.
- Scoped only to `sandbox_360_test`.
- No changes in classic mode, sandbox_story, parser, or chat flow.

### Summary
- Added `onShotChange(prevShot, nextShot)` listener in `Sandbox360Viewer` and connected transition/dwell event triggers.
- Added state refs for `lastShot`, `shotEnterTime`, and `eventCooldownMap`.
- Added per-event cooldown gate to prevent back-to-back retrigger.
- Kept debug event buttons and global `triggerRoomEvent` API, now guarded by same cooldown SSOT.
- Added regression guard script `scripts/regression-sandbox360-shot-events.mjs` and npm script `test:sandbox360-shot-events`.

### Verification
- `npm run test:sandbox360-shot-events`
- `npm run build`

## 2026-03-22 Classic flow-first review packet

### Scope
- Classic review workflow only.
- No classic runtime text rewrite.
- No editable/importable promotion for classic entries.
- Sandbox/shared review packet, writer workspace, and import workflow stay intact.

### Implemented
- Extended `scripts/generate-chat-content-artifacts.mjs` to emit:
  - `docs/classic-flow-message-review.md` for flow/player-experience-first classic review.
  - `docs/classic-message-review.md` for source/category-first classic review.
- Each classic flow step now exposes allowed categories, primary/optional category, selection policy, player-facing review notes, message entry metadata, ownership, status, runtime wrapper visibility, and explicit `classic review-only / not importable` labeling.
- Classic inferred runtime wrappers are now called out in a dedicated runtime-wrapper section with wrapped base key, fixed template, dynamic tokens, review focus, and reason they cannot be imported.
- Regression guards now fail if classic flow review docs disappear, major steps are omitted, wrapper visibility is lost, or classic review-only boundaries drift.

### Boundary notes
- Classic remains review-first and non-importable.
- No new classic editable path was added.
- Sandbox/shared writer workspace and `docs/sandbox-shared-message-review.md` remain unchanged in role and import boundary.

## 2026-03-22 Mode ownership split blueprint (phase 1)

### Scope
- Establish classic/sandbox mode-owned flow definitions and content maps without full runtime rewrite.
- Preserve shared schema/tooling/UI shell/review-import-export workflow.

### Implemented
- Added classic/sandbox flow definition files with step purpose, enter/exit conditions, gateType, uiSurface, blocked reasons, next-step candidates, messagePurpose, tone/tonePack placeholders, and allowed message categories.
- Added classic/sandbox content maps and mode ownership metadata for active/shared/legacy/runtime_wrapper boundaries.
- Extended artifact generation to publish classic flow table, sandbox flow table, and mode ownership map.
- Updated manifest/schema metadata so runtime/docs/review tooling can see ownerMode/ownership/messagePurpose/selectionPolicy fields.
- Added phase-1 App adapter usage: reply UI authority now consults mode flow metadata rather than treating App as sole flow ownership source.
- Added regression guards for definition/map existence, step/category ownership separation, and generated docs presence.

### Boundary notes
- Classic review-first import boundary remains unchanged.
- Sandbox/shared import path remains `writer workspace -> draft sync -> import`.
- Legacy/parallel/runtime-wrapper sources stay explicitly marked; no fake full migration.

## 2026-03-22 Sandbox/shared writer workspace round 1

### Root Cause Report
- 上一輪已把 sandbox/shared 文案抽到 editable content layer，但實際創作時仍要在 draft/manifest 欄位裡自行推測用途、流程位置與 UI 限制。
- import script 會先重跑 artifact generation，容易在匯入前把手動 draft 修改洗回 authored baseline，不利安全創作。

### What changed
- 新增 `src/content/chat-content/editable/sandbox-chat-writer-workspace.json`，只收錄可直接編修且可 import 的 sandbox/shared key，並分成 7 個創作批次。
- 每個 key 補齊 `usageContext`、`scenePurpose`、`toneGoal`、`constraints`、`suggestedLength`、`notesForWriter`、`relatedFlowStep`、`relatedGateType`、`relatedUiSurface`、`proposedRewrite`、`altRewriteIdeas`、`bannedPatterns`。
- 新增 `docs/sandbox-chat-writer-workspace.md` 與 `npm run sync:chat-writer-workspace`，workspace 只做創作規劃；既有 import 邊界維持 `draft -> authored -> generate artifacts`。
- `scripts/import-chat-content-editable.mjs` 改為直接驗證目前 draft，不再先覆寫 drafts。
- `scripts/chat-content-regression-guards.mjs` 補 writer workspace guards，鎖定 editable/importable coverage、token/import target 不漂移、classic review-only 不可混入。

### Flow / boundary impact check
- sandbox / shared runtime content 仍由 `appRuntimeContent.ts` 讀 `authoredChatContent.json`，flow / gate / state authority 不變。
- classic mode 仍是 review-first；workspace 不包含 classic key，也不可直接 import classic registry。
- workspace 不直接進 runtime，不會把 writer notes / context 欄位混進正式 content。

### Required docs sync
- README updated.
- docs/10-change-log.md updated.
- docs/sandbox-flow-table.md updated.
- docs/chat-content-editing-guide.md updated.
- docs/chat-content-import-policy.md updated.
- docs/chat-content-editable-preview.md regenerated.
- docs/sandbox-chat-writer-workspace.md added.

### Scope
- Focused on writer workspace / batch grouping / documentation / regression guards only.
- No classic registry overwrite.
- No flow / gate / state expansion.

## 2026-03-22 Editable chat draft + import workflow (project-level enforced integration)

### Scope
- Classic mode + sandbox mode.
- No intentional flow / gate / state behavior change.
- Goal: turn the manifest into a sustainable authoring + safe import workflow.

### Implemented
- Added human-facing editable drafts by mode under `src/content/chat-content/editable/`.
- Added writable content-layer source: `authoredChatContent.json`.
- Rewired `appRuntimeContent.ts` to consume authored content instead of inline literal ownership.
- Added `scripts/import-chat-content-editable.mjs` with validation for missing keys, duplicate keys, token mismatch, category mismatch, and locked ownership.
- Extended artifact generation to emit editable preview docs.
- Added docs for editing guide and import policy.

### Ownership summary
- Sandbox/shared extracted copy: direct editable import path.
- Classic registry content: draft-visible, review-first, manual migration required.
- Runtime wrapper / legacy / parallel: explicitly marked locked or reference-only.

### Verification
- `npm run generate:chat-content-artifacts`
- `npm run import:chat-content-editable`
- `npm run test:chat-content-guards`
- `npm run test:sandbox-guards`
- `npm run build`

## 2026-03-22 Chat content manifest extraction

### Scope
- Classic mode + sandbox mode.
- No intentional flow/gate/state behavior change.
- Goal: create an editable, backfillable, verifiable content layer for real chat-visible text.

### Implemented
- Added `src/content/chat-content/schema.ts` shared schema.
- Added `src/content/chat-content/chatContentManifest.ts` registry covering classic, sandbox, and shared chat sources.
- Added `src/content/chat-content/appRuntimeContent.ts` for App-owned runtime templates and fixed strings.
- Rewired extracted sandbox/App strings to use the content layer:
  - preheat sequence
  - VIP summary lines
  - glitch burst lines
  - tag question template
  - reveal prompt template
  - help-hint template/fallback
  - sandbox debug smoke text
- Rewired ChatPanel UI text to use the shared content layer.
- Added generated artifacts:
  - `src/content/chat-content/chatContentManifest.generated.json`
  - `docs/chat-content-audit-manifest.md`
- Added regression guard + artifact generation scripts.

### Runtime/source classification added
- `active`
- `legacy`
- `parallel`
- `inferred_runtime_wrapper`

### Verification
- `npm run generate:chat-content-artifacts`
- `npm run test:chat-content-guards`
- `npm run test:sandbox-guards`
- `npm run build`

### Deprecated/Removed ownership
- Removed direct ownership of extracted sandbox fixed strings from `src/app/App.tsx`.
- Removed direct ownership of shared chat UI text from `src/ui/chat/ChatPanel.tsx`.
- Retained but explicitly marked legacy/parallel sources in the manifest where dual-track content still exists.
