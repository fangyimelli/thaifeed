## Summary
- 為 sandbox story 新增 Supernatural Event System，整合 `SUPERNATURAL_EVENTS` 事件池與權重分配。
- 答對題目後流程改為 `REVEAL_WORD_FRAGMENT -> CHAT_RIOT -> SUPERNATURAL_EVENT -> VIP_TRANSLATE`。
- 新增 `GHOST_HINT_EVENT`（非答題時可觸發）與三句推理聊天室文案。
- 新增 `footsteps` 距離層級（far/mid/near）事件輸出。
- 保持 NIGHT_01 與 quiz flow 可並行運作（僅 sandbox_story 改動）。

## Changed files
- src/sandbox/chat/chat_pools.ts
- src/sandbox/chat/chat_engine.ts
- src/modes/sandbox_story/sandboxStoryMode.ts
- src/app/App.tsx
- README.md
- docs/10-change-log.md
