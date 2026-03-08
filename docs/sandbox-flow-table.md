# Sandbox NIGHT_01 Flow Table（SSOT）

> 本表為 NIGHT_01 前期唯一合法流程；所有 state gate / emitter orchestration / retry contract 必須由 `sandboxFlow` 單一 SSOT 決定。

## Flow 啟動條件與 JoinGate Contract

1. 進入 `sandbox_story` mode 初始化為 `PREJOIN`。
2. 玩家完成 join (`onSandboxJoin`) 後必須同時：
   - `joinGate.satisfied=true`
   - `joinGate.submittedAt=epoch_ms`
   - `flow.step/sandboxFlow.step=PREHEAT`
   - `introGate.startedAt=submittedAt`
3. 若 `joinGate.satisfied=false`，`tick` 只允許停留 `PREJOIN`，不得輸出正式故事訊息。
4. 一旦 `introElapsedMs >= introGate.minDurationMs`，`PREHEAT -> REVEAL_1_RIOT`。

## Emitter Orchestration Contract（sandbox vs classic exclusion）

- Sandbox NIGHT_01 前期唯一合法 emitter source tag：
  - `sandbox_preheat_join`
  - `sandbox_reveal_1_riot`
  - `sandbox_tag_player_1_question`
  - `sandbox_wait_reply_1_retry`
  - `sandbox_wait_reply_1_glitch_pool`
  - `sandbox_post_answer_glitch_pool`
- sandbox 前期硬阻斷：
  - classic scheduler `audience_idle`
  - classic forced fallback `dispatchForcedBaseMessage`
  - legacy `qna_question`
  - reducer boot seed 教材式 system 提示

## Deterministic Flow（NIGHT_01 前期）

| step | gateType | canReply | replyGateActive | emitter | next |
|---|---|---:|---:|---|---|
| PREJOIN | none | false | false | UI/system tech only | PREHEAT |
| PREHEAT | none | false | false | sandbox preheat chatter | REVEAL_1_RIOT |
| REVEAL_1_RIOT | none | false | false | riot viewer/vip burst (single orchestration) | TAG_PLAYER_1 |
| TAG_PLAYER_1 | none | false | false | questionEmitter 首問（一次） | WAIT_REPLY_1 |
| WAIT_REPLY_1 | consonant_guess | true | true | retryEmitter + glitchEmitterPool（依 contract） | POST_ANSWER_GLITCH_1 |
| POST_ANSWER_GLITCH_1 | none | false | false | glitch burst | NETWORK_ANOMALY_1 |
| NETWORK_ANOMALY_1 | none | false | false | anomaly tail | ADVANCE_NEXT |
| ADVANCE_NEXT | none | false | false | flow transition only | next beat |

## TAG_PLAYER_1 ask-once Contract

- 首問 dedupe key：`step + questionIndex + speaker + normalizedText`。
- SSOT 欄位：
  - `sandboxFlow.questionPromptFingerprint`
  - `sandboxFlow.normalizedPrompt`
  - `sandboxFlow.lastPromptAt`
  - `flow.tagAskedThisStep`
  - `flow.tagAskedAt`
- 規則：
  1. 進入 `TAG_PLAYER_1` 時，若 `flow.tagAskedThisStep=true` 不得再次首問。
  2. 首問寫入 ask-once SSOT 發生在 append 之前（不可依賴 callback 成功後才標記）。
  3. `WAIT_REPLY_1` retry path 只能沿用同一組 fingerprint contract，不得建立平行首問路徑。

## WAIT_REPLY_1 Contract（authoritative fields）

- `gateType: consonant_guess`
- `canReply: true`
- `replyGateActive: true`
- `questionEmitterId: mod_live`
- `retryEmitterId: vip_luna`
- `glitchEmitterIds: [viewer_118, viewer_203, viewer_409]`
- `retryCount: 0..retryLimit`
- `retryLimit: 1`
- `lastPromptAt / nextRetryAt / gateConsumed`
- `questionPromptFingerprint / normalizedPrompt`
- `activeSpeakerRoles: [questionEmitter, retryEmitter, glitchEmitterPool, ambientViewerPool]`

## Debug 對齊 Contract

debug panel / `__CHAT_DEBUG__.sandbox` 必須對齊真實控制 state：

- `flow.step`
- `flow.questionIndex`
- `scheduler.phase`
- `sandboxFlow.gateType`
- `sandboxFlow.canReply`
- `sandboxFlow.replyGateActive`
- `sandboxFlow.retryCount / retryLimit`
- `sandboxFlow.questionEmitter / retryEmitter`
- `sandboxFlow.activeSpeakerRoles`
- `sandbox.lastReplyEval`

## Regression Invariants

1. sandbox 啟動後 `flow.step` 不得長期為 `-`。
2. reducer `initialState.messages` 不得注入教材式 system seed。
3. sandbox mode 下 classic fallback / qna_question / audience idle emitter 必須硬阻斷。
4. `TAG_PLAYER_1` 首問在同 `step+questionIndex+speaker+normalizedText` 只能 append 一次。
5. `canAskConsonantNow()` 不得為 hardcoded false。
6. debug 欄位需與實際 `sandboxFlow` 控制一致。
