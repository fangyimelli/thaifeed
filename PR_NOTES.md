## Summary
- 新增/重建 `src/sandbox/chat/chat_pools.ts`，以 **靜態可審查** entries 定義 sandbox chat SSOT：10 個 pools、總數 2050（無 runtime 動態生句）。
- `CHAT_POOLS` 型別明確區分：9 個 pool 為 `string[]`，`thai_viewer_pool` 為 `{ user, text, thai, translation }[]`。
- `THAI_USERS` 內聚於 `chat_pools.ts`，`thai_viewer_pool.user` 僅使用該名單，避免重複來源。
- 新增 `assertChatPoolsCounts()`，可在 dev/測試驗證每池長度與 total=2050；`chat_engine` 僅在 DEV 初始化呼叫一次。
- `src/sandbox/chat/chat_engine.ts` 完整改為 consume `CHAT_POOLS`，移除平行舊池依賴（不再依賴 `vip_translate` / `ghost_hint_reasoning` pool key）。
- `tag_player` 模板改為 `{{PLAYER}}` / `${playerHandle}` 佔位符，emit 時統一替換為當前 `@playerHandle`。
- 新增簡短 phase-driven routing：
  - `theory_pool`：`awaitingAnswer` 與 `revealingWord` 階段提高機率。
  - `final_fear`：僅 ending 或高壓（低 SAN / supernatural phase）提高機率。
- Thai viewer emission 保留結構化欄位（`thai`、`translation`）供 UI/debug 顯示與後續擴充。

## Impact Scope
- 影響範圍：sandbox chat corpus 與 sandbox chat routing（`src/sandbox/chat/*`）。
- 文件：README、change-log、SSOT map 同步更新。
- **classic-mode sources were not modified**。

## Changed files
- src/sandbox/chat/chat_pools.ts
- src/sandbox/chat/chat_engine.ts
- docs/02-ssot-map.md
- docs/10-change-log.md
- README.md
- PR_NOTES.md

## Validation / Acceptance
1. 啟動 sandbox 後，觀察一般觀眾訊息持續輸出（來自 9 個 `string[]` pools）。
2. Thai viewer 訊息可見，且訊息資料保留 `thai/translation` 結構欄位。
3. `awaitingAnswer` / `revealingWord` 期間，`theory_pool` 發言為非 0 且明顯提升。
4. 後段/高壓（ending 或 SAN 低）可見 `final_fear`，前段不大量出現。
5. 在 dev console 呼叫 `assertChatPoolsCounts()` 通過（10 池 + total=2050）。
6. `npm run build` 通過（typecheck + build）。
