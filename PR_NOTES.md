## Summary
- sandbox 問答節奏改為嚴格 step 驅動：`PREHEAT -> ASK_CONSONANT -> WAIT_PLAYER_* -> GLITCH_BURST -> REVEAL_WORD -> ... -> ADVANCE_NEXT`。
- introGate 30 秒硬門檻確實生效；預熱期只閒聊，不出題、不顯示子音、不 tag 玩家進題。
- WAIT_PLAYER_CONSONANT / WAIT_PLAYER_MEANING 送出問句後立即 freeze，聊天室 0 output。
- 玩家回覆後才觸發 glitchBurst（10 則、250~450ms），刷完才繼續 reveal/後續鏈。
- 新增 sandbox 語料禁字過濾（`回頭`、`轉頭`），命中重抽最多 5 次，失敗 fallback。
- **classic mode 完全未修改**。

## Debug 欄位變更紀錄
- `sandbox.flow.step`（含 transition log：`prev -> next`）。
- `sandbox.introGate.passed/remainingMs`。
- `sandbox.freeze.frozen/reason/frozenAt`。
- `sandbox.glitchBurst.pending/remaining/lastEmitAt`。
- `sandbox.flow.questionIndex`。

## 驗收步驟
1. 進 sandbox，前 30 秒觀察：只預熱閒聊，不出題。
2. 30 秒到點：才出第一題子音。
3. 問玩家後：聊天室完全停止輸出，直到玩家回覆。
4. 玩家回覆：立即 glitch 10 則，再進 revealWord/riot/vipTranslate/guess/next。
5. 連跑 3 題：第 2 題後不再卡住，且每題都經過 revealWord。
6. 檢查語料：不出現「回頭/轉頭」。
