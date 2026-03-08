# Sandbox NIGHT_01 Flow Table（SSOT）

> 本表為 NIGHT_01 第一題唯一合法流程；所有 gate / emitter / retry / autoplay 必須對齊此 SSOT。

## Deterministic Flow（Q1）

| state | gateType | canReply | emitter roles | retry contract | autoplay consume contract | next |
|---|---|---:|---|---|---|---|
| PREJOIN | none | false | system（UI/tech only） | n/a | no-op | PREHEAT |
| PREHEAT (`PREHEAT`) | none | false | ambientViewerPool / vip / mod（自然聊天） | 禁止正式提問 | no-op | REVEAL_1_RIOT |
| REVEAL_1_RIOT | none | false | ambientViewerPool（2~4 則混亂討論） | n/a | no-op | TAG_PLAYER_1 |
| TAG_PLAYER_1 | none | false | **questionEmitter only**（單一角色 tag 玩家） | 設定 WAIT_REPLY contract | no-op | WAIT_REPLY_1 |
| WAIT_REPLY_1 | consonant_guess | true | questionEmitter / retryEmitter / glitchEmitterPool / ambientViewerPool（角色分離） | retryLimit=1, cooldown>=7s, variant text required | `gateType=consonant_guess` → mock consonant reply or internal consume | POST_ANSWER_GLITCH_1 |
| POST_ANSWER_GLITCH_1 | none | false | glitchEmitterPool（至少 2 sender） | retry 停止 | no-op | NETWORK_ANOMALY_1 |
| NETWORK_ANOMALY_1 | none | false | ambientViewerPool + system(tech only) | 不可回播題目 | no-op | ADVANCE_NEXT |
| ADVANCE_NEXT | none | false | flow transition | n/a | no-op | next beat |

## WAIT_REPLY_1 Contract（authoritative fields）

- `gateType: consonant_guess`
- `canReply: true`
- `questionEmitterId: mod_live`
- `retryEmitterId: vip_luna`
- `glitchEmitterIds: [viewer_118, viewer_203, viewer_409]`
- `retryCount: 0..1`
- `retryLimit: 1`
- `lastPromptAt: epoch_ms`
- `nextRetryAt: epoch_ms`
- `questionPromptFingerprint: step+questionIndex+sender+normalizedText`
- `normalizedPrompt: normalized chat text`
- `gateConsumed: boolean`
- `dedupeWindowMs: 5000`
- `unresolvedBehavior: retry_once_then_idle`
- `activeSpeakerRoles: [questionEmitter, retryEmitter, glitchEmitterPool, ambientViewerPool]`

## UI Output Contract（WAIT_REPLY_1）

1. 先一條正式 tag 問句（questionEmitter）。
2. 玩家未回時，僅 glitchEmitterPool 零散出現 lag/send-fail（最多 1~3 則）。
3. cooldown 到期後，最多一條 retry（retryEmitter，且文案變體）。
4. consume 成功後必須 `gateConsumed=true`、`nextRetryAt=0`、停止後續 retry。
5. 禁止同 sender 在同 gate 內同時扮演 question + glitch + retry。

## Hard Guards / Regression Invariants

1. PREHEAT 30 秒內不得進正式提問。
2. 第一題前不得有 `system` 作為正式題目 emitter。
3. WAIT_REPLY_1 必須 `gateType !== none`。
4. 同 sender/同 gate/同 normalized text 在 `dedupeWindowMs` 內不得重複插入。
5. sender cooldown 生效，避免單一 sender 連續霸佔輸出。
6. `retryCount <= retryLimit` 且 retry 文案不得與首問相同。
7. questionEmitter 不得發送 network anomaly / glitch 文案。
8. `autoplayNightEnabled=true` 時必須可達 `ADVANCE_NEXT`。
9. 每次玩家輸入都必須寫入 `lastReplyEval`（成功/失敗皆記錄）。
10. UI debug 必顯示 `state/gateType/canReply/lastReplyEval/retryCount/activeSpeakerRoles`。
11. debug flag 必須標示 non-authoritative（no formal impact）。
12. `retryCount` 不得超過 `retryLimit`，且 consume 後不得再次觸發同 gate retry。
