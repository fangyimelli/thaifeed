# 修正：Focus 模式日期判斷改用 dayKey，避免 HUD/狀態不更新

## Summary
- 目標：修正 Focus 模式在跨時區/交易所日切換時，HUD `TradeDay/BOS/FVG/Blue/Score` 被錯誤遮罩、alerts 與 session 顯示不同步。
- 策略：將「是否屬於 focus 日」改為 dayKey 比對；NY session 判斷仍保留 timestamp 區間。

## Changed
- [focus day detection]
  - `isInFocusDay` 由 `time >= focusDayStart && time < focusDayEnd` 改為 `barDayKey == focusDayKey`。
  - 新增/改用：
    - `focusDayKey = f_dayKey(focusAnchor, timezoneInput)`
    - `barDayKey = f_dayKey(time, timezoneInput)`
- [focus NY session filter]
  - 新增 `isInFocusNYSession = time >= focusNYStart && time < focusNYEnd`。
  - 藍燈、入場流程顯示與 alerts 的 focus filter 改用 `isInFocusNYSession`（focus mode 下僅顯示該日 NY session）。
- [HUD mask]
  - `focusMasked = focus_mode && !isInFocusDay`（改用 dayKey 版）。
- [debug]
  - HUD 新增 debug 行：`barDayKey=xxxx | focusDayKey=xxxx`，方便確認選定日期一致性。

## SSOT changed
- 無新增 SSOT 檔案；既有 focus/session 判定邏輯修正。

## Debug 欄位變更
- 新增：`barDayKey`、`focusDayKey`（HUD debug 行）。

## Removed
- 無功能移除（僅修正判定條件與顯示過濾）。

## Impact
- focus mode / HUD / alerts

## Validation / Acceptance
- Case A：focus 指定 1/30，當日所有 bar 的 `barDayKey == focusDayKey`。
- Case B：HUD 在 1/30 當天可正常顯示 `TradeDay/BOS/FVG/Blue/Score`。
- Case C：focus mode 下，alerts/藍燈僅在 `isInFocusNYSession` 內觸發。

## Test commands
1. 專案內策略/指標重算（focus 日期切換到 1/30）
2. 檢查 HUD debug 行（`barDayKey | focusDayKey`）與 alerts/session 行為一致
