## Summary
- 為 sandbox story mode 新增 NIGHT_01 `story.phase` gate，開場固定 `N1_INTRO_CHAT` 30 秒，第一題 challenge 必須等 intro 完成後才可進入。
- 將 sandbox challenge 入口改為雙閘門：`story.phase` + `scheduler.phase`，防止提早發題與錯 phase 回答。
- 擴充 NIGHT_01 故事 phase 到結尾（VIP 最終 tag -> 消失 -> 鬼動升級 -> 聊天室崩壞 -> 黑畫面 -> guest_house typing）。
- 更新 NIGHT_01 題庫為 1-9 + Q10 特殊題（`ห/หัน`）並加入 woman/girl/boy 同義詞 fallback 關鍵字。
- README / docs/10-change-log 已同步記錄，debug 新增 `sandbox.story.*` 欄位。

## Changed files
- src/modes/sandbox_story/sandboxStoryMode.ts
- src/app/App.tsx
- src/sandbox/chat/chat_engine.ts
- src/data/night1_words.ts
- README.md
- docs/10-change-log.md
- PR_NOTES.md
