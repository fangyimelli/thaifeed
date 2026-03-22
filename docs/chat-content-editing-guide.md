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
