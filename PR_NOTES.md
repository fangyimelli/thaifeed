## Summary
- Debug Panel 改為 mode-aware：拆成 `Mode Debug`、`Classic Debug Tools`、`Sandbox Story Debug Tools`。
- 顯示條件互斥：classic 只顯示 classic tools；sandbox_story 只顯示 sandbox tools。
- classic runtime 行為不修改；僅調整 Debug UI 顯示邏輯與 mode 判定流程。

## Changed
- `src/app/App.tsx`（UPDATE：新增 `getActiveMode()`、`debug.modeOverride`、mode-aware debug 區塊顯示）
- `docs/10-change-log.md`（UPDATE：新增 mode-aware debug change log）
- `README.md`（UPDATE：Debug Panel mode-aware 說明）
- `PR_NOTES.md`（UPDATE）

## Impact Scope
- 只影響 Debug Panel 顯示邏輯（UI 層）。
- 不修改 `src/modes/classic/*` 與 classic engine runtime。

## Acceptance
- classic mode：PASS（只看到 Classic Debug Tools）
- sandbox_story：PASS（只看到 Sandbox Story Debug Tools）
- 兩者互斥：PASS（不會同時顯示）
- 播放器：PASS（build + app shell render）
- 音效：PASS（未改動音訊 engine 流程）
- 聊天室：PASS（未改動 chat engine / send flow）
- 手機版面：PASS（未改 layout 結構）
- 桌機版面：PASS（未改 layout 結構）
- Debug：PASS（Mode header + mode-aware tools）
- classic mode 0 變動：PASS

## Checks
1. `npm run build`
2. `git diff -- src/modes/classic`
3. `git diff -- src/app/App.tsx docs/10-change-log.md README.md PR_NOTES.md`
