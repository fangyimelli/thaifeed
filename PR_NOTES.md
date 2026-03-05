## Summary
- sandbox NIGHT_01 流程改為 `flow.questionIndex + flow.step` SSOT，新增 `introGate/preheat/answerGate/flow/last` 到 `SandboxStoryState`，避免隱性 phase 卡住。
- 實作 30 秒預熱：只閒聊、慢速進人、VIP 高頻 tag 玩家。
- 實作「玩家必回」：出題後進 `WAIT_ANSWER`，15 秒未回覆就硬停聊天室並顯示「等你回覆」，同時 SAN 增壓。
- 玩家回覆（含不知道）後，固定強制鏈：glitch flood → reveal word → riot → VIP 翻譯 → meaning guess → tag 玩家 → 下一題。
- 修正第 2 題後不跳單字：加上 `flow step` 單一推進與 `lastAskAt/lastRevealAt` 防重入。
- sandbox chat routing 調整：`awaitingAnswer` 偏 fear/observation/tag，glitch 時段可走 `san_idle`。
- debug 面板新增 flow/answerGate 欄位，便於驗證 step chain 與停聊狀態。

## Impact Scope
- 影響範圍：`src/modes/sandbox_story/*`、`src/app/App.tsx`、`src/sandbox/chat/chat_engine.ts`、文件（README/docs）。
- **classic mode sources were not modified**。

## Changed files
- src/modes/sandbox_story/sandboxStoryMode.ts
- src/app/App.tsx
- src/sandbox/chat/chat_engine.ts
- README.md
- docs/10-change-log.md
- docs/02-ssot-map.md
- docs/30-sandbox-story-mode.md
- PR_NOTES.md

## Validation / Acceptance
1. 進 sandbox 前 30 秒不出題，只出現預熱聊天/加入聊天室/VIP tag。  
2. 30 秒後才出第一題，並進入 WAIT_ANSWER。  
3. 玩家不回覆 15 秒：聊天室停刷，debug 可見 `answerGate.pausedChat=true`，且 SAN 增壓。  
4. 玩家回覆後固定進 glitch flood，再 reveal word，後續完整走完 VIP 翻譯與 tag 玩家再進下一題。  
5. 連續 3 題以上皆可 reveal，無第 2 題卡死。
