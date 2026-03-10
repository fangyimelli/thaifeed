## 2026-03-10 Sandbox debug panel integration refactor

### Scope
- 僅修改 sandbox 路徑（`src/app/App.tsx`）；classic mode 未動。

### Button inventory decision
- 保留：
  - `Pass Flow`（主流程前進）
  - `Force Correct`（必要 override，且寫入 authoritative judge audit）
  - `Trigger Random Ghost`（事件流測試）
  - `Run Sandbox Flow Test`（一鍵自動驗證）
- 刪除：`ForceResolveQna`、`ClearReplyUi`、`Force Next Node`、`Force Reveal Word`、`ForcePlayPronounce`、`ForceWave(related/surprise/guess)`。
- 合併：`PASS (advancePrompt)` + `Force Next Node` 收斂為單一 `Pass Flow` 概念，不再雙軌。

### Auto test flow
- 新增 `runSandboxFlowTest()`：
  1) skip preheat gate（仍走正式 flow step）
  2) 等待 VIP tag/warmup gate
  3) 自動送 warmup reply（正式 submit）
  4) 等待第一題 prompt + consonant replyGate armed
  5) 送正確答案（prompt.consonant）
  6) 等 reveal/post-reveal done
  7) 驗證 nextQuestionEmitted + toQuestionId（第二題確實出現）
- 任一步失敗會記錄 failedStep/failureReason。

### Formal issue fixes
- 修正 auto-advance 在 reveal 後可能卡 `post_reveal_chat_not_done`。
- 修正 debug override judge audit 不完整。

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
