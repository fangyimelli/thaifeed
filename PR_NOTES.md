## Summary
- sandbox 新增角色同義詞判定模組 `characterDisambiguation`：`normalize()` + `matchCategory()`，支援 woman/girl/boy 對應詞彙（媽媽/母親、姐姐/姊姊、弟弟/哥哥…）。
- `tagPlayerPhase` 玩家輸入流程改為「命中分類即繼續；未命中先追問一次 `@玩家 你是在說誰??????`（不給 options）；再未命中則 miss 並依 revisit queue 先下一題後回補」。
- NIGHT_01 SSOT 第 10 題改為 `หัน`（轉頭），並新增 Q10 專屬特殊卡：`อย่าหัน` + 翻譯按鈕，點擊後顯示橘色 `別轉頭`。
- Q10 special 嚴格 gate：僅 `nodeIndex===9` 允許注入；非 Q10 不會出現翻譯按鈕卡與「別轉頭」。
- Debug 與文件同步：補上 `lastCategory / pendingDisambiguation / q10Special` 欄位，更新 README 與 change-log。

## Changed files
- src/sandbox/chat/characterDisambiguation.ts
- src/app/App.tsx
- src/modes/sandbox_story/sandboxStoryMode.ts
- src/data/night1_words.ts
- src/sandbox/chat/chat_pools.ts
- src/ui/chat/ChatMessage.tsx
- src/styles.css
- README.md
- docs/10-change-log.md
- PR_NOTES.md
