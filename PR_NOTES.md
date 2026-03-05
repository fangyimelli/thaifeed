## Summary
- 完成 sandbox NIGHT_01 P0 修復：加入 `introGate`（30 秒預熱）、固定 pipeline（`reveal -> riot -> supernatural -> VIP -> reasoning -> tag -> next`）、revisit queue、tag phase timeout/recovery 固定文案與 options guard。
- `sandbox_story` 狀態機新增 `intro/reasoningPhase/tagPlayerPhase`，且 `init()` 改為 `intro` 起始，僅在 gate 通過後才允許出題。
- `chat_engine` 修正 wave resolved 計數：回傳實際 wave 長度，不再固定 `3`。
- `App` 加入 sandbox options 防護（含 payload options 與「選項：」文字），並在 debug 記錄 `blockedOptionsCount`。
- debug 追蹤補齊：`introGate.remainingMs`、`pendingQuestions.length/revisiting`、`blockedOptionsCount`。

## Changed files
- src/modes/sandbox_story/sandboxStoryMode.ts
- src/sandbox/chat/chat_engine.ts
- src/app/App.tsx
- README.md
- docs/10-change-log.md
- PR_NOTES.md
