## 2026-03-04（debug_disabled mode switch guard fix）

## Why
- 現況可見 `Mode Switch Debug` 已有 click 訊號，但 `result=blocked / reason=debug_disabled`，代表 mode switch guard 的 debug 判定與 overlay 可見狀態不一致。
- 需求要求：只要 debug overlay 可見，就必須允許 mode override / storage 寫入 / reload（或 reinit）生效。

## What changed
- `src/debug/debugGate.ts`（新增）
  - 建立共用 debug gate SSOT：`isDebugEnabled()`。
  - 判定來源：`?debug=1`、`#debug=1`、`sessionStorage['app.debug.enabled']`、`window.__THAIFEED_DEBUG_ENABLED__`。
  - 提供 `setDebugOverlayEnabled(enabled)` 給 overlay 掛載狀態同步使用。
- `src/app/App.tsx`
  - `debugEnabled` 改走共用 gate，並加上 `debugOpen` 直接視為 enabled（overlay 可見即 debug enabled）。
  - 新增 effect：overlay 開關時同步 `setDebugOverlayEnabled(true/false)`。
  - `switchDebugMode` guard 因此不再在 overlay 可見時誤擋 `debug_disabled`。
- `src/ui/chat/ChatPanel.tsx`、`src/ui/scene/SceneView.tsx`
  - debug 判定統一改用 `isDebugEnabled()`，避免各處 query-only 判定分岔。

## SSOT / debug fields
- Debug Gate SSOT：`src/debug/debugGate.ts`。
- Mode Switch Debug 可視化欄位沿用：
  - `lastModeSwitch.clickAt`
  - `lastModeSwitch.requestedMode`
  - `lastModeSwitch.persistedMode`
  - `lastModeSwitch.action`
  - `lastModeSwitch.result`
  - `lastModeSwitch.reason`

## Validation
1. 進入可見 debug overlay 的畫面後點 `Switch to Sandbox (sandbox_story)`：
   - `reason` 不再是 `debug_disabled`
   - `persistedMode.storage` 應為 `sandbox_story`
   - `action=reload` / `result=ok`
   - reload 後 `currentMode=sandbox_story`
2. 關閉 debug/overlay 且無 debug query 時：
   - 啟動 mode 不應被 `localStorage['app.currentMode']` 強制覆寫（仍需 `isDebugEnabled()` gate）。

## Rollback
- 移除 `src/debug/debugGate.ts` 並回退各檔改回 query-only debug 判定。
- 還原 `App.tsx` overlay->debug enabled 同步邏輯（`setDebugOverlayEnabled` 與 `debugOpen` override）。

## Why
- `DebugModeSwitcher` 的 `Switch to Sandbox (sandbox_story)` 在部分情境「看起來沒反應」，缺少 UI 可視化回饋，無法快速判斷是 click 未觸發、持久化未寫入，還是被 guard 擋住。
- 需求要求 debug-only 修正：按下後必須明確顯示 click/request/persist/action/result/reason，並保證 mode SSOT 寫入 + 觸發生效（reinit/reload 其一）。

## What changed
- `src/app/App.tsx`
  - 強化 `DebugModeSwitcher`：新增 `Mode Switch Debug` 區塊，顯示：
    - `lastModeSwitch.clickAt`
    - `lastModeSwitch.requestedMode`
    - `lastModeSwitch.persistedMode`
    - `lastModeSwitch.action`
    - `lastModeSwitch.result`
    - `lastModeSwitch.reason`
  - 點擊切換按鈕時，先更新 `lastModeSwitch.clickAt/requestedMode`，確保「click 真的有觸發」可在 UI 即時看到。
  - mode 切換仍走既有 SSOT：
    1. 寫入 `localStorage['app.currentMode']`
    2. 維持 `debug.modeOverride` / `debug.modeOverrideSource`
    3. 更新 URL query `?mode=`
    4. debug-only 立即 `window.location.assign(...)` reload 生效
  - 新增 `persistedMode` 回讀字串（`query/storage/store`）顯示，避免誤判寫入成功。
  - 新增 `Switching…`（debug-only）提示，切換過程可視化。
  - 新增 guard/error UI reason：`debug_disabled`、`already_current_mode`、`invalid_mode`、例外訊息。
  - `lastModeSwitch` 以 `sessionStorage['app.debug.lastModeSwitch']` 暫存，reload 後仍可追蹤上一筆切換結果。
- `README.md`
  - 補充「Debug 模式切換與排障」：如何看 `lastModeSwitch.result/reason` 判斷失敗原因。
- `docs/10-change-log.md`
  - 新增本次 no-response 修正條目（debug-only）。

## SSOT / debug fields
- Mode SSOT 不變：`mode` query param + `localStorage['app.currentMode']`（debug-only 讀取 storage）。
- 新增/強化 debug 可視化欄位：
  - `lastModeSwitch.clickAt`
  - `lastModeSwitch.requestedMode`
  - `lastModeSwitch.persistedMode`
  - `lastModeSwitch.action`
  - `lastModeSwitch.result`
  - `lastModeSwitch.reason`

## Validation
1. `?debug=1&mode=classic` 開啟 Debug Panel，點 `Switch to Sandbox (sandbox_story)`：
   - UI 立即更新 `lastModeSwitch.clickAt/requestedMode`
   - `persistedMode` 顯示 storage 已寫入 `sandbox_story`
   - 顯示 `Switching…`，並執行 reload
   - reload 後 `currentMode=sandbox_story`
2. 在 sandbox 點 `Switch to Classic`：流程同上，reload 後 `currentMode=classic`。
3. 若無法切換，UI 需顯示 `result=blocked/error` 與 `reason`（不再無反應）。
4. classic event / qna / chat / audio 流程不變。

## Risk
- 低風險：變更侷限於 debug overlay mode switch 與 debug 狀態顯示；classic 正式流程未改。

## Rollback
- 移除 `DebugModeSwitcher` 的 `Mode Switch Debug` 區塊與 `lastModeSwitch` 狀態追蹤。
- 移除 `sessionStorage['app.debug.lastModeSwitch']` 暫存。
- 回退 `switchDebugMode` 到舊版（僅寫 localStorage + query + reload，無 UI status）。
- 或直接關閉 debug override（移除 `debug.modeOverride` / `debug.modeOverrideSource` 寫入）。
