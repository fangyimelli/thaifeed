# 修正 pinned reply 出現時未先置底就 pause 的時序問題

## Changed
- 將 tagged QNA 的 freeze 入口統一為 `scrollThenPauseForTaggedQuestion`：
  - 等待 `questionMessageId` 對應訊息 render（最多 500ms，每幀檢查）
  - 等待 ReplyPinBar mount 後再 double-force 置底
  - 完成置底後才 `pause=true`（hard freeze）
- `ChatMessage` 新增 `data-message-id`，供 `waitForMessageRendered` 精準判定 DOM 已落地。
- `ChatPanel` 新增 force-scroll debug 回傳與 reply-pin mount 回報，並輸出 debug only log：
  - `[SCROLL] forceBottom reason=... top=... height=... client=...`
- debug 面板同步新增：
  - `chat.scroll.lastForceToBottomReason`
  - `chat.scroll.lastForceToBottomAt`
  - `chat.scroll.scrollTop / scrollHeight / clientHeight`
  - `ui.qnaQuestionMessageIdRendered`
  - `ui.replyPinMounted`
  - `chat.pause.isPaused`

## Removed
- 移除 tagged question 的 countdown-then-freeze 舊邏輯（先 COUNTDOWN 再 FROZEN）。
- 移除「一出現 pinned reply 就先關自動置底」舊時序；改為 pause 之前仍可 force scroll。

## SSOT Impact
- 無 SSOT 檔案變更（`docs/02-ssot-map.md` 未修改）。
- 本次屬於 App/QNA/ChatPanel 時序整合與 debug 可觀測性補強。

## Debug 欄位變更 + 3 次 PR 規則
- 新增 debug 欄位（見 Changed 區塊）已完整列出。
- 這些欄位將依規則至少保留 3 次 PR 觀測週期後再評估移除。

## 驗收
- `npm run build` 通過（TypeScript + Vite build）。
- 已提供桌機畫面截圖（含 debug overlay）。
