## Summary
- 修正 sandbox NIGHT_01 進房立即出題問題：新增 30 秒 `N1_INTRO_CHAT` gate，倒數後才進 `N1_QUIZ_LOOP` 出第一題。
- 修正 sandbox 同題多次輸入僅第一次有反應：加入 input lock 回覆與同題 prompt recover 機制，避免沉默/卡題。
- 修正 sandbox 混入 classic 「選項模板」：新增 sandbox emit gate，阻擋任何 `（選項：...）` 話術。
- 新增 message emit source debug：`chat.lastEmit.source/sourceTag/sourceMode`，並在 sandbox debug 顯示 `storyPhaseGate`。

## Changed files
- src/app/App.tsx
- README.md
- docs/10-change-log.md
- PR_NOTES.md
