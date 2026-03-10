## Follow-up fix scope

- Complete authoritative judge audit persistence to sandbox SSOT (`consonantJudgeAudit`) for consonant consume path.
- Converged next-question handoff to single `ADVANCE_NEXT` consumer (`advance_next_effect`) with explicit blocked reasons and emission timestamps.
- Added same-round preheat chat dedupe guard to prevent bootstrap/warmup replay duplicates.

## Summary
- Implemented sandbox-only integration fix for authoritative judge observability and next-question emit stability.

## Changed
- Added authoritative `consonantJudgeAudit` mode state and write path at `consumePlayerReply` consonant gate.
- Debug panel now separates Display metadata (`displayAcceptedAnswers/displayAliases`) from runtime judge candidates (`runtimeAcceptedCandidates`).
- `POST_REVEAL_CHAT -> ADVANCE_NEXT` converged to single consumer path with explicit boundaries: `postRevealChatState`, `nextQuestionReady`, `nextQuestionEmitted`, `nextQuestionBlockedReason`.
- Marked `scheduler.phase` as non-authoritative auxiliary debug state.
- Added regression guards for judge audit SSOT, display/runtime separation, and advance-next guard path.

## Removed
- Item: none (runtime logic removed only at decision level: no remaining debug-ref authority for judge rendering)
- Reason: consolidated SSOT for judge observability
- Impact: debug now mirrors authoritative state; legacy/ref mixed-source confusion removed
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated
- [x] docs/sandbox-flow-table.md updated

## SSOT
- [ ] No SSOT changes
- [x] SSOT changed (list files + reasons below)

### SSOT changes
- `sandboxStoryMode` state adds `consonantJudgeAudit` (authoritative judge audit snapshot).
- `sandboxFlow` adds post-reveal/advance boundaries for next-question emit handoff tracking.

## Acceptance
- Debug fields checked: authoritative flow/judge/display/legacy/scheduler sections now separated.
- Desktop check: not run (logic/debug contract change).
- Mobile check: not run.

## 2026-03-10 sandbox debug panel audit + fixes

### Scope
- Sandbox mode only. No classic mode changes.

### What was fixed
- Reconnected sandbox debug buttons to authoritative runtime state updates by implementing previously noop mode APIs:
  - `advancePrompt`, `applyCorrect`, `setPronounceState`, `forceWave`, `commitAdvanceBlockedReason`, `commitHintText`.
- Standardized debug node advance behavior to SSOT path (`advancePrompt`) and explicit end-of-flow block (`end_of_nodes`).
- Added per-button debug action audit records with required observability fields:
  - `lastClickedAt`, `handlerInvoked`, `effectApplied`, `blockedReason`, `targetState`, `lastResult`.
- Added in-panel audit render block so testers can immediately see invoked/blocked/applied state.

### Why buttons looked like “no-op” before
- Several mode APIs were stubbed with `() => undefined`, so button handlers ran but did not mutate authoritative state.
- Some handlers returned early due to mode/prompt/event readiness guards without surfacing blocked reason in UI.

### Outcome
- Every audited button now leaves an action record.
- Blocked actions always include an explicit blocked reason.
- Successful actions always mutate at least one authoritative state field.
