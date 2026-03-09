## Summary
- Rebuilt missing sandbox modules into a clean `sandbox_story v2` baseline runtime so the app compiles and runs on current branch.
- Added a shared NIGHT_01 question bank and rewired NIGHT1 data to use that shared source.
- Restored sandbox-only runtime/chat/overlay dependencies without touching classic mode controller.

## Files Added
- `src/shared/questionBank/night01QuestionBank.ts`
- `src/ssot/sandbox_story/types.ts`
- `src/ssot/sandbox_story/night1.ts`
- `src/modes/sandbox_story/sandboxStoryMode.ts`
- `src/modes/sandbox_story/classicConsonantAdapter.ts`
- `src/sandbox/chat/chat_engine.ts`
- `src/sandbox/chat/vip_identity.ts`
- `src/ui/overlays/SandboxWordRevealText.tsx`
- `docs/sandbox-flow-table.md`

## Files Updated
- `src/data/night1_words.ts` (shared bank mapping)
- `src/app/App.tsx` (strict type fixes only)
- `README.md`
- `docs/10-change-log.md`

## Validation
- `npm run build` passes.

## Follow-up (Phase 2)
- Expand v2 runtime state transitions to fully enforce pronunciation-discussion six-line gate before reveal.
- Complete backlog accumulation scheduler and theory revisit limits in runtime-driven fashion.
- Fill NIGHT_01 ending choreography (VIP leave, collapse sequence, final black screen) as declarative script blocks.
