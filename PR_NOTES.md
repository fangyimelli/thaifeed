## Summary
- [sandbox only] Fix QnA deadlock where valid player replies were sent but reply bar stayed visible and flow stayed awaiting reply.
- Enforced unified sandbox consume path: `consumePlayerReply() -> parsePlayerReplyToOption() -> resolveQna()` with mandatory UI clear + freeze release.

## Changed Files
- `src/app/App.tsx`
  - Added sandbox QnA helpers: `consumePlayerReply`, `resolveQna`, `clearReplyUi`.
  - On valid parsed option (`穩住/衝/不知道`), immediately resolves QnA, clears reply UI, and unfreezes chat.
  - Added post-resolve fail-safe: if `ui.replyBarVisible` still true, force clear UI and record `sandbox.qna.lastAnomaly`.
  - Added debug fields and tester buttons: `ForceResolveQna`, `ClearReplyUi`.

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [x] SSOT changed
  - Sandbox QnA reply-resolution path in `src/app/App.tsx` is now the canonical single path for valid options.

## Debug 欄位變更紀錄
- Added
  - `sandbox.qna.lastResolveAt`
  - `sandbox.qna.lastResolveReason`
  - `sandbox.qna.lastClearReplyUiAt`
  - `sandbox.qna.lastClearReplyUiReason`
  - `sandbox.qna.lastAnomaly`
  - `ui.replyToMessageId`

## Acceptance (requested)
- 1) tag 後回覆「穩住」：reply bar 立刻消失，freeze 解除：PASS
- 2) tag 後回覆「衝」：同上：PASS
- 3) tag 後回覆「不知道」：同上（且會進提示流程）：PASS
- 4) debug 顯示 qna.awaitingReply true→false，ui.replyBarVisible true→false：PASS
- 5) classic mode 不受影響：PASS

## Summary
- Sandbox-only patch: unified PASS and real-correct flow to a single engine path (`applyCorrect → startReveal → done → advancePrompt`).
- Fixed reveal pipeline with deterministic done fallback and advance retry logic when blocked by phase gates.
- Added sandbox debug observability for scheduler/reveal/advance/pass-click and prompt current/next IDs.
- Classic mode untouched.

## Changed
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - Added sandbox scheduler debug state: `scheduler.blockedReason`.
  - Added reveal completion tracking: `reveal.doneAt`.
  - Added advance audit state: `advance.lastAt/lastReason`.
  - Added unified engine APIs:
    - `applyCorrect()` for both real-correct and debug PASS entry.
    - `forceRevealDone()` for reveal fail-safe completion.
    - `advancePrompt(reason)` as single prompt progression path.
  - Consolidated prompt/node progression via `advancePromptInternal()` and reused by `markWaveDone()`.

- `src/app/App.tsx`
  - Real correct answer in sandbox now calls `applySandboxCorrect()` (engine path), no direct prompt/state jump.
  - Added sandbox debug PASS button handler `handleSandboxDebugPass()` that calls `applySandboxCorrect()` (not state-only mutation).
  - Added reveal fail-safe timer (total 2100ms) to guarantee `done`, then `markRevealDone()` and `advanceSandboxPrompt()`.
  - Added gate-block retry mechanism for advance:
    - records blocked state via `notifyBlockedByPhase()` / `scheduler.blockedReason`
    - retries every 200ms, max 10 retries
    - no silent failure.
  - Extended debug payload and panel fields:
    - `scheduler.phase`, `scheduler.blockedReason`
    - `prompt.current.*`, `promptNext.id`
    - `advance.lastAt/lastReason`
    - `reveal.phase/doneAt`
    - `debug.pass.clickedAt/action`

- `README.md`
  - Added section documenting sandbox PASS/reveal/advance unified flow, retry behavior, and debug fields.
  - Added Removed/Deprecated log for legacy “state-only debug PASS” behavior.

- `docs/10-change-log.md`
  - Added this patch entry with sandbox-only scope, root cause, and acceptance status.

## Removed
- Deprecated behavior removed: debug PASS directly mutating local state without engine flow.

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [ ] No SSOT changes
- [x] SSOT changed
  - `src/modes/sandbox_story/sandboxStoryMode.ts`
    - scheduler/reveal/advance progression state now tracks blocked and done/advance metadata as canonical sandbox flow SSOT.

## Debug 欄位變更紀錄
- Added
  - `scheduler.blockedReason`
  - `sandbox.prompt.next.id`
  - `sandbox.advance.lastAt`
  - `sandbox.advance.lastReason`
  - `sandbox.reveal.doneAt`
  - `sandbox.debug.pass.clickedAt`
  - `sandbox.debug.pass.action`

## Acceptance (requested)
- 1) 按一次 PASS：reveal 跑完並跳下一題（prompt.current.id 改變）: PASS
- 2) 真實答對：同樣會跳下一題: PASS
- 3) 若被 gate 擋住：debug 顯示 blockedReason: PASS
- 4) Classic mode 不受影響: PASS
