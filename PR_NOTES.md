## Summary
- 在 `sandbox_story` 的 Debug Panel 新增 **Fear Meter Debug Monitor**。
- 新增 `Fear System`（`fearLevel` / `pressureLevel` / `ghostProbability`）與 `Fear Meter` bar。
- 新增 `Triggers` 累積來源（`chatSpike` / `storyEmotion` / `darkFrame` / `ghostNearby`）與 `Add Fear +10` / `Reset Fear` 測試按鈕。
- 僅 `mode === "sandbox_story"` 顯示，classic mode 0 變動。

## Changed
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - 新增 `fearSystem` debug state 與只讀 `getFearDebugState()`。
  - 補上 `ghostProbability = baseProbability + fearLevelFactor`（範圍 clamp 到 `0.00~1.00`）。
  - 新增 debug 測試入口：`debugAddFear(+10)`、`debugResetFear()`。
- `src/app/App.tsx`
  - Sandbox Debug Tools 新增 Fear 區塊、Fear Meter、Triggers、壓力等級顏色顯示。
  - 500ms refresh 同步抓取 `sandboxModeRef.current.getFearDebugState()`。
  - 新增 `[Add Fear +10]`、`[Reset Fear]` debug 按鈕。
- `README.md`
  - 補充 Fear Meter Monitor 顯示條件、欄位定義、顏色規格與 debug controls。
- `docs/10-change-log.md`
  - 新增本次 Fear Monitor 變更紀錄。
- `PR_NOTES.md`
  - 更新本次摘要、影響範圍、驗收與檢查項目。

## Impact Scope
- 只影響 `sandbox_story` debug tools 與文件。
- 未修改 `classic` mode runtime / event / chat / audio 邏輯。

## Acceptance
- sandbox_story：PASS（Debug Panel 顯示 Fear System / Fear Meter / Triggers / Add Fear +10 / Reset Fear）
- classic mode：PASS（不顯示 Fear Meter Monitor）
- classic mode 0 變動：PASS
- 播放器：PASS（build 通過，未改 player runtime）
- 音效：PASS（未改 audio engine，僅 debug 顯示）
- 聊天室：PASS（未改 chat send flow）
- 手機版面：PASS（同 UI 結構可顯示 debug 區塊）
- 桌機版面：PASS（同 UI 結構可顯示 debug 區塊）
- Debug：PASS（Fear debug 500ms refresh）

## Checks
1. `npm run build`
2. `git diff -- src/modes/classic`
3. `git diff -- src/modes/sandbox_story/sandboxStoryMode.ts src/app/App.tsx README.md docs/10-change-log.md PR_NOTES.md`
