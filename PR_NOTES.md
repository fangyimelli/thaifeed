# 修正：Tag 後先置底再 pin，最後 freeze（避免置底消失）

## Summary
- 將 tag 起始流程改為單一入口 `runTagStartFlow`，固定順序：append → scrollToBottom → setPinnedReply → freeze。
- `forceScrollToBottom` 改為只操作 chat list 容器，加入 mobile 二次置底（rAF double-tap）。
- `sendQnaQuestion` 改走新 flow，避免 pause 太早造成置底被略過。
- Debug overlay 補齊 scroll/pause/pinned 可觀測欄位與 console 打點。

## Changed
- 新增 `src/chat/tagFlow.ts`
  - `runTagStartFlow(...)`
  - `nextPaint()`（雙 rAF）
- 新增 `src/chat/scrollController.ts`
  - `registerChatScrollContainer/getChatScrollContainer`
- `src/ui/chat/ChatPanel.tsx`
  - 統一 `chatScrollRef` 註冊容器
  - `forceScroll` 只讀取 scroll controller 容器
  - `forceScroll` 回報 `containerFound/result/metrics`
  - debug console 新增 `[SCROLL] force ...`
- `src/app/App.tsx`
  - `sendQnaQuestion` 改為 async + `runTagStartFlow`
  - pause debug 新增 `setAt/reason`
  - scroll debug 新增 `containerFound/lastForceReason/lastForceAt/lastForceResult/metrics`
  - ui debug 新增 `pinned.visible/textPreview`
  - debug console 新增 `[PIN]`、`[PAUSE]`

## Removed
- Item: 無（本次未刪除功能）
- Reason: N/A
- Impact: N/A
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [x] No SSOT changes
- [ ] SSOT changed (list files + reasons below)

## Debug 欄位變更
- 新增/調整：
  - `chat.scroll.containerFound`
  - `chat.scroll.lastForceReason`
  - `chat.scroll.lastForceAt`
  - `chat.scroll.lastForceResult`
  - `chat.scroll.metrics`
  - `chat.pause.setAt`
  - `chat.pause.reason`
  - `ui.pinned.visible`
  - `ui.pinned.textPreview`
- 三次 PR 規則：本次已明確記錄新增欄位，後續 PR 持續追蹤。

## Acceptance
- Case A（事件/觀眾 tag 一次）
  - 預期：先看到 tag 訊息 append，聊天室強制到最底，再看到 pinned reply，最後 freeze。
- Case B（玩家回覆後）
  - 預期：解除 freeze，觸發 `reason=reply` 的 force scroll，再恢復 FOLLOW。

## Checks
1. `npm run build`
2. `npm run dev` + `?debug=1` 手動檢視 debug overlay
3. mobile viewport 截圖（debug 模式）
