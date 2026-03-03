# 修正：事件音效卡死（stuck）→ 事件狀態機化

## 變更摘要
- 事件音效流程由「lock + cd 分散判斷」收斂為單一事件音效狀態機（`idle | playing | cooldown`），並加上保底 timeout，避免 `onended` 缺失或播放失敗造成永久 stuck。
- `trigger` 與 `force execute` 共用同一套狀態資料，`force execute` 可跳過 `playing/cd` gate 並可連續觸發，但仍保留保底解鎖。
- 新增統一事件 log：`[EVENT_TRIGGERED]` / `[EVENT_SKIPPED]` / `[EVENT_PLAY_FAIL]` / `[EVENT_STATE]`。
- Debug Panel（Event Tester）新增每事件可視化欄位：`state`、`cooldownRemaining`、`lastTriggeredAt`、`pre/post key`、`lastResult+reason`，並新增每事件 `Unlock`。
- 保留 `Reset Stuck State` 作為跨系統救援（event queue / qna / freeze / pause 全量清理），但事件音效卡死已可由狀態機自我恢復。
- 新增一次性 `Enable Audio`（使用者手勢）入口與 debug 狀態：`audioContextState`、`lastAudioUnlockResult`、`lastAudioUnlockAt`。

## 現況盤點（依程式碼實際路徑）
- 事件註冊 SSOT 與初始化來源：
  - `src/core/events/eventRegistry.ts`（事件 key、cd、lock、qna）
  - `src/events/eventEffectsRegistry.ts`（由 registry 推導 effect）
  - `src/app/App.tsx`（`startEvent()` 實際觸發）
- 舊 lock/cd/lastTriggered/reset stuck 呼叫鏈：
  - `lockStateRef`、`eventCooldownsRef`、`cooldownsRef`、`recoverFromStuckEventState()`、`forceUnlockDebug()` 皆在 `src/app/App.tsx`。
- Debug 與實際觸發是否同 registry：
  - Event Tester 使用 `EVENT_TESTER_KEYS + startEvent()`，觸發與正式流程一致。
  - Debug manifest 來源 `getEventManifest()` 亦來自 `eventRegistry`，非第二份 registry。

## SSOT 變更
- `src/core/events/eventRegistry.ts`：仍是事件定義 SSOT（未改定位）。
- `src/events/eventEffectsRegistry.ts`：仍由 registry 推導（未建立第二份來源）。
- 本次新增狀態機資料為執行態（runtime state），不取代 SSOT。

## Debug 欄位/按鈕變更
- 新增欄位：
  - `event.stateMachine[eventKey].state`
  - `event.stateMachine[eventKey].cooldownRemainingMs`
  - `event.stateMachine[eventKey].lastTriggeredAt`
  - `event.stateMachine[eventKey].preKey/postKey`
  - `event.stateMachine[eventKey].lastResult/lastReason`
  - `chat.system.audioContextState`
  - `chat.system.lastAudioUnlockResult`
  - `chat.system.lastAudioUnlockAt`
- 新增按鈕：
  - `Enable Audio`
  - `Unlock <eventKey>`（單事件）
  - `Force Execute Ghost SFX` / `Force Execute Footsteps SFX`
- Debug 三次 PR 規則檢查：
  - 以上欄位已在 README 與本 PR_NOTES 記錄（第 1 次）。

## Removed
- 無功能移除。

## Testing（實際執行）
1. `npm run build`：確認 TS 與打包可過。
2. Web 手動路徑（桌機）：
   - 開啟 Debug Panel，連按 Trigger 同事件，觀察 `[EVENT_SKIPPED] reason=cd/playing`。
   - 連按 Force Execute 同事件，觀察每次均可觸發並寫入 `[EVENT_TRIGGERED]`。
   - 驗證 `ghost_female` / `footsteps`：Trigger 與 Force Execute 皆可重複測試。
   - 若音訊被瀏覽器阻擋，按 `Enable Audio` 後檢查 `audioContextState` 與 `lastAudioUnlockResult`。
3. 行動裝置：本環境無實機，改以 responsive + 手勢解鎖邏輯與 debug 欄位作替代證據，於限制段落註記。

## 限制 / 風險
- CI/容器內無法提供實機音訊輸出，手機端採替代證據（狀態機欄位、console、build 通過）驗證。
