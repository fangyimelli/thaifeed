## This PR (bootstrap/state mount/debug consistency follow-up)
- 修復 `sandbox_story` mode 已切入但正式 state 未初始化（debug 大量 `- / 0 / []`）問題。
- 建立單一初始化權威：`sandboxStoryMode.bootstrapRuntime()`；App mode entry、guard recovery、clearReplyUi re-init 全部整併到同一路徑。
- `audit.transitions` 改為正式 state 權威來源，debug 不再讀到空陣列。
- 補齊 regression guard：防止 flow.step/questionIndex/introGate/scheduler.phase 缺失與 debug 漂移。

## This PR
- 一次整體修復 sandbox_story bootstrap/flow/replyGate/prompt/judge/reveal/debug consistency，收斂到 mode state machine SSOT。
- NIGHT_01 前段改為正式 step-driven flow：`PREHEAT_CHAT -> VIP_TAG_PLAYER -> WAIT_WARMUP_REPLY -> POST_REPLY_CHAT -> REVEAL_1_START -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1`。
- replyGate 正式化：wait step 進入時由 controller 建立 `replyGate`，autoPinFreeze 僅 renderer，不再推導 gate。
- 玩家輸入 routing 修復：每次 submit 都寫入正式 `lastReplyEval`，debug 不再讀到 `-`。
- 第一題鏈路修復：`WAIT_REPLY_1 -> ANSWER_EVAL -> REVEAL_WORD -> POST_REVEAL_CHAT`，對齊 currentPrompt/judge/reveal/pronounce。

## Summary
- Align sandbox SSOT reply-gate schema to enforced integration contract: rename formal fields to `gateType` and `targetPlayerId`, while preserving backward-compatible hydration from legacy `type/targetActor`.
- Ensure flow/state/debug share one authority by syncing derived gate state back into sandbox mode each tick (`gateType`, `replyGateActive`, `canReply`, `replySourceMessageId`, `replySourceType`, `consumePolicy`).
- Update debug panel labels to read the same formal replyGate keys (`gateType/armed`, `sourceMessageId/targetPlayerId`).
- Add regression guard checks to prevent replyGate schema/debug drift.

## Root cause
1. Sandbox runtime still carried mixed reply-gate naming (`type/targetActor` vs `gateType/targetPlayerId`), creating schema ambiguity.
2. Derived gate lived mostly in UI-side computed state; formal mode state could lag key fields used by debug and audits.

## Validation
- npm run test:sandbox-guards
- npm run build

## Scope guard
- Only sandbox_story flow/state/debug integration path was changed.
- Classic mode logic remains untouched.
