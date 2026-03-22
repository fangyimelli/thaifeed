# Writer workspace import boundary update (2026-03-22)

## Safe boundary
- `sandbox-chat-writer-workspace.json` is **not** an import source. It stores context, scene notes, proposals, and writer-only guidance.
- `sandbox-chat-draft.json` and `shared-chat-draft.json` remain the only automated import inputs for sandbox/shared editable content.
- `scripts/sync-chat-content-writer-workspace.mjs` is the explicit conversion step from writer proposals -> editable drafts.
- `docs/sandbox-shared-message-review.md` is review-only output and must never be treated as an import source.
- `docs/classic-flow-message-review.md` and `docs/classic-message-review.md` are classic review packets only; they exist for audit visibility and must never become import sources.
- `scripts/import-chat-content-editable.mjs` still writes only keys that are `editable=true` and point to `authoredChatContent.json`.

## Guard expectations
- Workspace must contain only editable/importable sandbox/shared keys.
- Workspace tokens, mode/category, and `importTarget` must stay aligned with manifest/drafts.
- Classic review-first keys must not appear in workspace or sync output.
- Writer notes / context fields must never be written into runtime content.

# Chat Content Import Policy

## Ownership rules

| sourceOfTruth | Meaning | Direct import allowed | Import target |
| --- | --- | --- | --- |
| `registry` | Content layer or registry-owned text. | Only when `editable=true`. | `src/content/chat-content/editable/authoredChatContent.json` or manual review queue. |
| `runtime_wrapper` | Runtime assembles the final wrapper around dynamic tokens. | No. | `runtime_wrapper_only` |
| `legacy` | Old source still owns behavior/content. | No. | `legacy_reference_only` |
| `parallel` | Parallel/adapter source kept for compatibility. | No. | `parallel_reference_only` |

## Current automated import boundary
Automated import only writes keys that are both:
- `editable=true`
- `importTarget=src/content/chat-content/editable/authoredChatContent.json`

Today that means sandbox extracted text and shared chat UI text. Classic manifest-backed entries are exported into the draft for review and future migration planning, but they are not auto-written back to their original registries yet.

## Failure conditions
Import must fail when:
- a draft key is missing from the manifest
- the same key appears twice across draft files
- tokens differ from the manifest
- category or mode differs from the manifest
- a non-editable or locked entry targets the authored content file
- an editable entry points anywhere other than the authored content file

## File ownership map
- `src/content/chat-content/editable/authoredChatContent.json`: writable content-layer source for sandbox/chat UI copy.
- `src/content/chat-content/editable/*-chat-draft.json`: human-facing editable/review drafts generated from manifest + ownership classification.
- `src/content/chat-content/appRuntimeContent.ts`: runtime adapter that consumes authored content without changing classic/sandbox gate/flow behavior.
- `src/content/chat-content/chatContentManifest.ts`: registry/audit assembly; still the authoritative manifest projection.

## Human review rules
- If a key is marked `manual_review_required`, edit the draft first, then use the draft as the review packet for a later migration of the original registry file.
- If a key is marked `runtime_wrapper_only`, only edit the underlying prompt/template keys, not the wrapper record itself.
- `legacy` and `parallel` entries may be annotated in the draft but cannot become the sole source of truth without a dedicated migration.
- For classic mode, review in two passes: `docs/classic-flow-message-review.md` for player-flow sequencing, then `docs/classic-message-review.md` for registry/category verification. Neither file is importable.

## Mode ownership import rules (phase 1)
- `docs/classic-flow-table.md` / `docs/sandbox-flow-table.md` / `docs/mode-ownership-map.md` 為可重建 ownership 視圖，不是 import source。
- 新增 flow step 或 category 前，先在 mode-specific definition/content map 建立 ownership，再決定是否需要 editable draft / writer workspace。
- `shared` 只可承載 schema、tooling、UI shell、review/import/export workflow；shared 類別不可被標成 classic/sandbox experiential content owner。
- `runtime_wrapper` / `legacy` / `parallel` 條目必須保留明確標記，不能假裝已 migrated。
