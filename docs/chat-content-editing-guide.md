# Writer-first workflow update (2026-03-22)

## Recommended workflow
1. Run `npm run generate:chat-content-artifacts` to refresh manifest, drafts, preview, and writer workspace docs.
2. Edit `src/content/chat-content/editable/sandbox-chat-writer-workspace.json` instead of guessing directly inside the drafts.
3. Fill `proposedRewrite` on the keys you want to change; keep `currentText` as shipped baseline reference.
4. Run `npm run generate:chat-content-artifacts` and review `docs/sandbox-shared-message-review.md` line by line before any sync/import.
5. Preserve every token and every flow/gate/UI constraint listed in the workspace and review packet.
6. Run `npm run sync:chat-writer-workspace` only after the per-message review is approved, to copy `proposedRewrite` (or fallback `currentText`) into `sandbox-chat-draft.json` / `shared-chat-draft.json`.
7. Review the synced draft files and run `npm run import:chat-content-editable` to write approved text back into `authoredChatContent.json`.
8. Re-run `npm run test:chat-content-guards` and `npm run build`.

## Writer workspace rules
- Workspace only contains sandbox/shared keys that are `editable=true` and directly importable.
- Workspace is planning metadata + proposal storage; runtime import must never read it directly.
- `docs/sandbox-shared-message-review.md` is the human-readable per-message review packet for old/new copy comparison, purpose, tokens, and flow location.
- `currentText` is the current shipped text; write new copy into `proposedRewrite` to avoid losing baseline context.
- Use `altRewriteIdeas`, `notesForWriter`, `constraints`, and `bannedPatterns` as your creative checklist.

# Chat Content Editing Guide

## Workflow
1. Run `npm run generate:chat-content-artifacts` to refresh the manifest snapshot, editable drafts, and preview tables.
2. Edit the human-facing draft files in `src/content/chat-content/editable/` by mode:
   - `classic-chat-draft.json`
   - `sandbox-chat-draft.json`
   - `shared-chat-draft.json`
3. Only change entries where `editable=true` and `importTarget=src/content/chat-content/editable/authoredChatContent.json`.
4. Preserve every token exactly as-is (`@activeUser`, `{index}`, `{consonant}`, `{imageMemoryHint}`, etc.).
5. Run `npm run import:chat-content-editable` to validate and apply the approved draft text back into the editable content layer.
6. Re-run `npm run test:chat-content-guards` and `npm run build`.

## Draft structure
Each draft is grouped by `mode -> category -> entries[]` and every entry exposes:
- `key`
- `currentText` / `currentVariants`
- `tokens`
- `sourceFile` / `sourceSymbol`
- `editable`
- `sourceOfTruth`
- `importTarget`
- `reviewStatus`
- existing runtime context fields (`flowStep`, `gateType`, `eventKey`, `qnaFlowId`, `questionId`)

## What is directly editable now
### Sandbox
- `sandbox_preheat`
- `sandbox_prompt` (`sandbox.prompt.reveal_prompt`)
- `sandbox_vip_summary`
- `sandbox_glitch`
- `sandbox_tag_question`
- `sandbox_help_hint`
- `debug_text` (`sandbox.debug.warmup_reply`)

### Shared
- `ui_placeholder`
- `fallback` (`ui.chat.pinned.missing_source`)
- `debug_text` (`ui.chat.pinned.highlight_only`)

## Review-only for now
- Classic `event_dialog`, `event_reaction`, `qna_prompt`, `qna_retry`, `qna_unknown`, `ambient_chat`, `fallback` are visible in the draft for single-key review, but they still point to their existing runtime registries and require manual migration review before automated import.
- `sourceOfTruth=runtime_wrapper` entries describe wrapper templates only and must stay structurally aligned with runtime code.
- `sourceOfTruth=legacy|parallel` entries are reference-only and cannot be imported.

## Verification checklist
- Draft key exists in manifest.
- Category and token list are unchanged.
- Non-editable entries stay locked.
- Import regenerates `chatContentManifest.generated.json`, draft JSONs, and `docs/chat-content-editable-preview.md`.
