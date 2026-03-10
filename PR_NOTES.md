## This PR (WAIT_WARMUP_REPLY replyGate authority alignment)
- 修復 `flow.step=WAIT_WARMUP_REPLY` 時正式 `replyGate` 缺失/未 armed 問題：進入 wait step 後若 gateType/armed/canReply/target/sourceMessageId 任一缺失，立即補齊 `warmup_tag` gate。
- 將 warmup gate 正式名稱統一為 `warmup_tag`，並保證 `targetPlayerId/sourceMessageId/sourceType/consumePolicy` 完整存在。
- 玩家輸入 routing 修正：wait-reply step submit 不再覆寫成 `consume_fallback_to_free_chat`，保持在正式 evaluator / `lastReplyEval` 路徑。
- `answerGate` 降級為 compatibility mirror：由 `replyGate` 同步 waiting/pausedChat，防止 legacy gate 與正式 gate 狀態矛盾。
- 補 regression guards：檢查 `WAIT_WARMUP_REPLY` gate 建立、repair guard 與 wait-step no-fallback 規則。

## This PR (sandbox_story bootstrap root-cause one-shot fix)
- 單一路徑整併：新增 `ensureBootstrapState()`，mode switch、runtime guard、clearReplyUi re-init 全部改由 mode 正式 bootstrap authority 處理。
- 修正 core state 空值根因：v2 initial state 改為直接掛載 PREHEAT bootstrap state，避免 `currentMode=sandbox_story` 但 flow/scheduler/introGate 全空。
- 修正 reset/cleanup 洗掉初始化：guard 與 clear 路徑若檢測缺欄位，會強制完整 re-init，不再留殘缺 state。
- 修正 visual/core 脫鉤：consonant bubble 需 core bootstrap 成立才可 visible。
- Regression guard 同步更新：驗證 bootstrap authority、initial mount、re-init 與 visual/core 對齊。

## This PR (sandbox_story debug panel clean-up)
- 只調整 sandbox_story debug panel（不改 classic mode / gameplay flow / replyGate-prompt-judge-reveal 行為）。
- 修正 `sandboxFlow.*` debug rows 讀錯來源（`sandbox.flow.*` -> `sandbox.sandboxFlow.*`）。
- 新增 `CORE FLOW STATE – TRUSTED` 最小可信區塊，集中 flow/scheduler/introGate/replyGate/lastReplyEval/prompt.current/judge/reveal。
- `answerGate.*` 改為 `[LEGACY COMPATIBILITY – NON AUTHORITATIVE]`，並明示 replyGate 才是權威 gate。
- 移除 debug panel 的 deprecated/重複列：`storyPhaseGate.*`、`sandbox.currentPrompt.*`、`sandbox.reveal.*`。
- 新增 `VISUAL STATE – NOT FLOW AUTHORITY` 區塊集中 UI visual state。
- `audit.transitions` row 加上來源標註：`source: state.audit.transitions | fallback`。

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
