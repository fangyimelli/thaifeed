## 修改原因
- NIGHT_01 第一題存在順序錯位：reveal/prompt 尚未建立時，riot 與 ask-player emitter 已先偷跑，導致玩家輸入無法被正式 consume。

- flow contract 改為 `PREJOIN -> PREHEAT -> REVEAL_1_START -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1`。
- `REVEAL_1_START` 負責先寫入 SSOT：`currentPrompt + consonant/wordKey + reveal metadata`，完成後才進 riot。
- `REVEAL_1_RIOT` / `TAG_PLAYER_1` / `WAIT_REPLY_1` 全加 prerequisite guard；未 reveal / prompt 空值時禁止進行。
- `TAG_PLAYER_1` 改為 transition only；問句 emitter 改為 `WAIT_REPLY_1`（gate armed）才可送出。
- 玩家輸入改為 mention strip 後才 parser/judge；`lastReplyEval` 新增 `extractedAnswer`。
- unresolved ambient 改為有限 burst（最多 2 則）+ retry 最多一次，consume 後立即停止。
- debug 補齊 `unresolvedAmbient.active/remaining/completed` 與 `flow.questionEmitter`、`lastReplyEval.extractedAnswer`。

## Regression guards
1. reveal 未成立時不得進 `REVEAL_1_RIOT`。
2. currentPrompt 未建立時不得進 `TAG_PLAYER_1`。
3. gate 未 armed 時不得送 ask-player emitter。
4. 玩家輸入後 `lastReplyEval` 必寫入 `extractedAnswer`。
5. consume 成功後不得再出同 gate unresolved emit。
6. unresolved ambient 不得無限模板輪播。

## 修改原因

- 移除 `TAG_PLAYER_2_PRONOUNCE && false`，避免正式 prompt pipeline 被硬封死。

## Regression guards
5. `TAG_PLAYER_2_PRONOUNCE` 不得再被 hardcoded false 阻斷。

## 修改原因
- NIGHT_01 前期仍存在多條 emitter 路徑（reducer seed / App scripted riot / TAG 首問路徑 / classic scheduler / legacy qna），造成看似 flow 在跑但並非單一 SSOT。

- flow 啟動修補：`joinGate.satisfied=true` 且仍在 `PREJOIN` 時，立即推進 `PREHEAT`。
- `PREHEAT` 倒數結束後改進 `REVEAL_1_RIOT`，讓 NIGHT_01 前期流程對齊：`PREJOIN -> PREHEAT -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1`。
- 移除 reducer boot seed 泰文教材式 system 訊息（`initialState.messages=[]`）。
- `canAskConsonantNow()` 改為正式 state gating（joinGate/flow.step/introGate/gateType/replyGate）。
- TAG_PLAYER_1 首問改為 ask-once contract：先寫 fingerprint + asked state，再進 `runTagStartFlow`，避免 callback 失敗導致重問 loop。

## Regression guards
1. reducer 初始訊息不得注入教材式 seed。
3. TAG_PLAYER_1 同 fingerprint 問句不可重覆 append。
4. `canAskConsonantNow` 不可 hardcoded false。

## 修改原因
- 第一題 `WAIT_REPLY_1` 在 gate unresolved/invalid reply 狀態下，question retry 會持續命中條件，造成提問重送 loop。
- consume 成功後未明確同步關閉 retry/gate，導致後續 tick 仍可能觸發 retry path。

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

- Kept classic mode files untouched.
