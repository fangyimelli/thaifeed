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
