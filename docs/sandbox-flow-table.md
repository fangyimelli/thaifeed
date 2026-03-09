# Sandbox NIGHT_01 Flow Table（SSOT）

## Boot / Start Contract（sandbox_story）

1. 切到 `sandbox_story` 必須立即 hydration runtime：`joinGate.satisfied=true`、`introGate.startedAt>0`、`flow.step !== PREJOIN`。
2. 若 guard 偵測 `flow.step=PREJOIN` 或 `scheduler.phase=boot` 卡住，必須自動 recovery 到 `PREHEAT`。
3. `__CHAT_DEBUG__.sandbox` 必須由 runtime state 直寫，不得長期 fallback `-`。

## Reveal-before-riot / Prompt-before-tag / Gate-before-answer Contract

- `REVEAL_1_RIOT` 進入前，以下全部必須成立：
  - `sandbox.reveal.visible=true`
  - `word.reveal.active=true`
  - `sandbox.currentPrompt.id` 存在
  - `sandbox.prompt.current.kind` 存在
  - `sandbox.consonant.currentConsonant/currentWordKey` 存在
- `TAG_PLAYER_1` 進入前必須有有效 prompt（不得空值 tag）。
- ask-player emitter 只允許在 `WAIT_REPLY_1` 且 gate 已 armed（`replyGateActive=true && canReply=true`）。

## NIGHT_01 Q1 Single Orchestration（唯一合法順序）

| order | step | contract |
|---|---|---|
| 1 | PREJOIN | runtime init only |
| 2 | PREHEAT | prejoin chatter only |
| 3 | REVEAL_1_START | 建立 currentPrompt + reveal metadata |
| 4 | REVEAL_1_RIOT | reveal 成立後才開 riot（2~4 則） |
| 5 | TAG_PLAYER_1 | 只做 transition，不直接 ask |
| 6 | WAIT_REPLY_1 | gate armed + 單一 questionEmitter tag 玩家 |
| 7 | player input | mention strip -> parser/judge -> consume |
| 8 | POST_ANSWER_GLITCH_1 | consume 後短 glitch |
| 9 | NETWORK_ANOMALY_1 | tail beat |
| 10 | ADVANCE_NEXT | next beat |

## Unresolved Ambient Burst Contract

1. unresolved ambient 僅有限 burst（每 gate 最多 1 段，最多 2 則）。
2. retry 與 ambient 分離；retry 最多一次。
3. consume 成功後 `gateConsumed=true`，ambient/retry 必須停止。
4. 不可無限 recurring template loop。

## Consume / Cancel Contract

- 每次玩家輸入必寫 `lastReplyEval`：
  - `rawInput`
  - `normalizedInput`
  - `extractedAnswer`
  - `gateType`
  - `consumed`
  - `reason`
- consume success 後：
  - `gateConsumed=true`
  - `replyGateActive=false`
  - `canReply=false`
  - unresolved burst stop

## Classic / Sandbox Emitter Exclusion Contract

- sandbox Q1 只允許正式 flow emitter：
  - `sandbox_reveal_1_riot`
  - `sandbox_tag_player_1_question`
  - `sandbox_wait_reply_1_retry`
  - `sandbox_wait_reply_1_glitch_pool`
- 封鎖偷跑來源：classic fallback、legacy qna ask path、pre-reveal riot、prompt empty tag、gate 未 armed ask。

## Debug Acceptance Fields

- `flow.step` / `flow.questionIndex`
- `scheduler.phase` / `blockedReason`
- `sandbox.reveal.visible` / `word.reveal.active`
- `sandbox.currentPrompt.id`
- `sandbox.prompt.current.kind`
- `sandbox.consonant.currentConsonant/currentWordKey`
- `sandboxFlow.replyGateActive/gateType/canReply/questionEmitter/retryCount/retryLimit/gateConsumed`
- `sandbox.lastReplyEval.raw/normalized/extractedAnswer/reason/consumed`
- `unresolvedAmbient.active/remaining/completed`
