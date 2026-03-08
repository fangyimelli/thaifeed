# PR Notes - Sandbox NIGHT_01 WAIT_REPLY_1 loop hotfix

## 修改原因
- 第一題 `WAIT_REPLY_1` 在 gate unresolved/invalid reply 狀態下，question retry 會持續命中條件，造成提問重送 loop。
- consume 成功後未明確同步關閉 retry/gate，導致後續 tick 仍可能觸發 retry path。

## 本次變更（僅 sandbox WAIT_REPLY_1）
- 補齊 WAIT_REPLY retry SSOT 欄位：`retryCount/retryLimit/lastPromptAt/nextRetryAt/questionPromptFingerprint/normalizedPrompt/gateConsumed`。
- retry contract：初次提問一次、retry 最多一次、固定 cooldown（7s）、retry 文案變體。
- dedupe guard：同一 gate（`step:questionIndex`）內，`sender + normalizedText` 在 dedupe window 內拒絕重複插入。
- consume success guard：一旦 consume，立即 `gateConsumed=true`、`nextRetryAt=0`、`retryCount=retryLimit`、`replyGateActive=false`，停止 retry loop。
- invalid reply guard：寫入 `lastReplyEval.reason=wrong_format|parse_miss`，gate 可保持 active，但 question retry 仍受 cooldown/limit/dedupe 限制。
- unanswered behavior：僅允許 viewer glitch 少量（最多 3 則）+ retry 一次，後續不再重問。
- debug panel：新增 `lastPromptAt/nextRetryAt/gateConsumed/questionPromptFingerprint/normalizedPrompt`。

## Regression guards
1. 同 sender + 同 gate + 同 normalized text 不得短時間重複插入。
2. `retryCount <= retryLimit`。
3. consume 後不得再觸發同 gate question retry。
4. invalid reply 不得造成 questionEmitter/retryEmitter loop。
5. debug panel 顯示 `retryCount/retryLimit/lastPromptAt/nextRetryAt/gateConsumed/replyGateActive/lastReplyEval` 與控制條件一致。
