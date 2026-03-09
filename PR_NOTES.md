# PR Notes - Sandbox runtime boot chain reconnect (sandbox_story only)

## 修改原因
- `currentMode=sandbox_story` 雖然切換成功，但 runtime 曾停留在 PREJOIN 空殼，造成 scheduler/flow/prompt/debug 全部像未啟動。

## 本次變更（sandbox only）
- mode switch 進入 sandbox 時，直接執行 runtime bootstrap（joinGate fulfill、flow 進 PREHEAT、introGate.startedAt 初始化）。
- 新增 boot recovery guard：sandbox mode 若出現 `joinGate 未滿足`、`flow.step=PREJOIN` 或 `introGate.startedAt=0`，自動重啟 sandbox runtime。
- `__CHAT_DEBUG__.sandbox` 補齊 runtime/joinGate hydration，避免空值面板。
- classic/sandbox 排他：sandbox mode 阻斷 classic idle tick emitter，避免雙軌暗跑。
- 移除 `TAG_PLAYER_2_PRONOUNCE && false`，避免正式 prompt pipeline 被硬封死。

## Regression guards
1. sandbox mode 下 runtime 不得長期停在 PREJOIN 未啟動。
2. sandbox mode 下 introGate 必須有有效 startedAt/minDuration。
3. sandbox mode 下 debug 必須回填真實 runtime（含 joinGate/runtime guard）。
4. sandbox mode 下 classic idle tick emitter 不得驅動聊天。
5. `TAG_PLAYER_2_PRONOUNCE` 不得再被 hardcoded false 阻斷。

# PR Notes - Sandbox NIGHT_01 single-orchestrator takeover

## 修改原因
- NIGHT_01 前期仍存在多條 emitter 路徑（reducer seed / App scripted riot / TAG 首問路徑 / classic scheduler / legacy qna），造成看似 flow 在跑但並非單一 SSOT。

## 本次變更（sandbox only）
- flow 啟動修補：`joinGate.satisfied=true` 且仍在 `PREJOIN` 時，立即推進 `PREHEAT`。
- `PREHEAT` 倒數結束後改進 `REVEAL_1_RIOT`，讓 NIGHT_01 前期流程對齊：`PREJOIN -> PREHEAT -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1`。
- 移除 reducer boot seed 泰文教材式 system 訊息（`initialState.messages=[]`）。
- `canAskConsonantNow()` 改為正式 state gating（joinGate/flow.step/introGate/gateType/replyGate）。
- sandbox 前期阻斷 classic emitter：scheduler idle 與 forced fallback 在 sandbox 不再 dispatch。
- `REVEAL_1_RIOT` / `TAG_PLAYER_1` 收斂為 sandbox sourceTag orchestration。
- TAG_PLAYER_1 首問改為 ask-once contract：先寫 fingerprint + asked state，再進 `runTagStartFlow`，避免 callback 失敗導致重問 loop。

## Regression guards
1. reducer 初始訊息不得注入教材式 seed。
2. sandbox 模式阻斷 classic `audience_idle` / forced fallback。
3. TAG_PLAYER_1 同 fingerprint 問句不可重覆 append。
4. `canAskConsonantNow` 不可 hardcoded false。

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
