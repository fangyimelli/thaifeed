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
