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
