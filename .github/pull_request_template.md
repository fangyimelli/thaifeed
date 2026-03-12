## 2026-03-12 Sandbox QnA stall-timeout build fix (minimal set)

### Root Cause Report
- `src/app/App.tsx` imported `isQnaAwaitingReplyGateOpen` and called `shouldAbortStalledAsking`, but `src/game/qna/qnaEngine.ts` does not export either symbol.
- This created a build break from a partial refactor (App caller surface drifted from qnaEngine authoritative API).

### What changed
- Removed dead import `isQnaAwaitingReplyGateOpen` from `App.tsx`.
- Replaced stalled-abort precheck from legacy `shouldAbortStalledAsking(...)` to authoritative `isAskingStalled(qnaStateRef.current, undefined, now)`.
- No fake compatibility wrapper added; authoritative source remains `qnaEngine.isAskingStalled + active.status lifecycle`.
- Added regression guard in `scripts/sandbox-v2-regression-guards.mjs`:
  - fail if App contains `isQnaAwaitingReplyGateOpen`
  - fail if App contains `shouldAbortStalledAsking`
  - fail if timer loop does not use `isAskingStalled(..., now)`

### Flow impact check (minimal risk)
- asking: unchanged lifecycle owner (`active.status='ASKING'`)
- awaiting reply: unchanged owner/gate (`AWAITING_REPLY` path untouched)
- stalled asking abort/timeout: now exclusively gated by authoritative `isAskingStalled`
- reveal/post-reveal handoff: unchanged (sandbox reveal flow not modified)

### Required docs sync
- README updated.
- docs/10-change-log.md updated.
- docs/sandbox-flow-table.md updated.
- PR_NOTES and `.github/pull_request_template.md` synchronized.

### Scope
- Sandbox/QnA integration minimal fix only.
- No classic mode behavior changes.

