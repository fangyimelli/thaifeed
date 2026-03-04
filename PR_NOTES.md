## Summary
- 在 `sandbox_story` 的 Debug Panel 新增 **Ghost Event Monitor**，可即時監看 7 個鬼動事件狀態。
- 新增 **Trigger Random Ghost**，可隨機觸發一個 `ready` 事件做快速測試。
- 新增 **Ghost System** 摘要區塊，顯示 active/queue/last/cooldown 統計。
- classic mode 維持 0 邏輯變動（僅 `sandbox_story` 顯示）。

## Changed
- `src/app/App.tsx`
  - 新增 ghost event debug state 型別與 state。
  - 新增唯讀 debug state 函式（`getGhostEventManagerDebugState()`）。
  - 新增 500ms refresh（只在 `mode === "sandbox_story"` 生效）。
  - 在 Sandbox Story Debug Tools 中新增：
    - `Ghost Event Monitor`
    - `Ghost System`
    - `Trigger Random Ghost`
- `README.md`
  - 補充 sandbox_story Debug Panel 的 Ghost Event Monitor / status 色彩 / Ghost System / Trigger Random Ghost 說明。
- `docs/10-change-log.md`
  - 新增本次變更紀錄（Ghost Event Debug Monitor）。
- `PR_NOTES.md`
  - 更新本次摘要與驗收。

## Impact Scope
- 只影響 Debug Panel（sandbox_story 分支）與文件。
- 未修改 `classic` mode 事件流程與 engine。

## Acceptance
- sandbox_story：PASS（Debug Panel 顯示 Ghost Event Monitor + Trigger Random Ghost + Ghost System）
- classic mode：PASS（不顯示 Ghost Event Monitor 工具）
- classic mode 0 變動：PASS
- 播放器：PASS（build 通過，未改 player runtime）
- 音效：PASS（未改 audio engine，僅 debug 監看）
- 聊天室：PASS（未改 chat send flow）
- 手機版面：PASS（layout 結構未變）
- 桌機版面：PASS（layout 結構未變）
- Debug：PASS（sandbox_story 新增監看工具且 500ms 更新）

## Checks
1. `npm run build`
2. `git diff -- src/modes/classic`
3. `git diff -- src/app/App.tsx docs/10-change-log.md README.md PR_NOTES.md`
