## Why
- debug 面板目前只顯示 `currentMode: classic`，且缺少可直接切到 `sandbox_story` 的明確入口。
- 既有 sandbox 區塊內曾有 `<select>` 形式切換，但不在共用外殼頂部、可見性低，也沒有持久化 + 立即重載保證。
- 本次需求是加入 debug-only mode switcher，且不能改動 classic 遊戲/事件/流程邏輯。

## What changed
- `src/app/App.tsx`
  - 新增共用元件 `DebugModeSwitcher`，放在 Debug Panel 最上方，顯示 `currentMode` 與兩顆按鈕：
    - `Switch to Classic`
    - `Switch to Sandbox (sandbox_story)`
  - mode 切換流程改為：
    1. 寫入 `localStorage['app.currentMode']`
    2. 寫入 debug 欄位 `debug.modeOverride` 與 `debug.modeOverrideSource=debug_mode_switcher`
    3. 更新 URL `?mode=` 後 `window.location.href` reload，立即重走對應 mode 初始化。
  - 啟動 mode 解析改為單一路徑 `resolveInitialMode(debugEnabled)`：
    - 優先讀 query `?mode=classic|sandbox_story`
    - 僅 `debug=1` 時允許讀 `localStorage['app.currentMode']`
    - fallback `classic`
  - 移除 sandbox 區塊內舊 `Mode Switcher <select>`，避免雙入口並存。
- `README.md`
  - 新增「Debug：切換模式（classic / sandbox_story）」規格與驗收步驟。
  - 同步 README Removed/Deprecated Log：移除舊 select 型 mode switcher。
- `docs/10-change-log.md`
  - 新增本次變更條目（debug-only 影響範圍、風險、回退方向）。

## SSOT / debug fields
- Mode SSOT 仍為既有 `mode` query param（不新增第二套 mode state）。
- debug 持久化 key：`localStorage['app.currentMode']`（僅 debug 開啟時讀取）。
- 新增 debug 欄位：
  - `debug.modeOverride`
  - `debug.modeOverrideSource`

## Validation
1. `?debug=1&mode=classic` 開啟 Debug Panel：可見頂部 Mode Switcher 與 `currentMode: classic`。
2. 點 `Switch to Sandbox (sandbox_story)`：頁面 reload 後 `currentMode: sandbox_story`，且顯示 Sandbox Story Debug Tools。
3. 點 `Switch to Classic`：頁面 reload 後 `currentMode: classic`，Classic Debug Tools 可正常使用。
4. classic event tester / QnA pin / audio unlock 入口仍存在、未變更控制邏輯。

## Risk
- 風險低：變更限定於 debug UI 與 mode 設定持久化流程。
- classic runtime/event/chat/audio 主流程未修改。

## Rollback
- 移除 `DebugModeSwitcher` 與 `switchDebugMode`。
- 回復 `resolveInitialMode` 到先前 query-only 行為。
- 移除 `localStorage['app.currentMode']` 寫入與 `debug.modeOverrideSource` debug 欄位。
