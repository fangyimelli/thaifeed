## Summary
- [sandbox only] 修正 Tag 後玩家回覆有效選項（`穩住/衝/不知道`）時，reply bar 不消失、QnA 卡在 awaiting reply 的問題。
- 根因是玩家送出後同時走了 sandbox consume 與通用 `tryTriggerStoryEvent` 路徑，後者會把已 resolve 的 QnA 又重新改寫成 retry/重問，造成 UI 與狀態不同步。

## Changed Files
- `src/app/App.tsx`
  - 在 `tryTriggerStoryEvent(..., 'user_input')` 入口加入 sandbox guard：`mode === sandbox_story` 且 `qna.awaitingReply` 時直接 return，避免與 `consumePlayerReply()` 重複消費。
  - `submitChat()` 在 sandbox 命中 `consumePlayerReply()` 後立即 `markSent('sandbox_qna_consumed')`，不再繼續跑 classic wrong/chatEngine/event 分支。
  - 保留既有單一路徑：`consumePlayerReply() -> parsePlayerReplyToOption() -> resolveQna()`；`resolveQna()` 會同步 clear reply UI、解除 freeze、更新 debug。
  - 只有在「不是 sandbox 已消費」時才執行 `tryTriggerStoryEvent`，避免 resolved 後被覆寫。

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [x] SSOT changed
  - `src/app/App.tsx` 的 sandbox 玩家回覆處理改為單一消費點（`consumePlayerReply`），並明確阻斷 `tryTriggerStoryEvent` 在同一送出循環重入。

## Debug 欄位變更紀錄
- 本次未新增新欄位；沿用既有欄位完成驗證：
  - `qna.isActive`
  - `qna.status`
  - `qna.awaitingReply`
  - `qna.questionMessageId`
  - `qna.matched.optionId/keyword/at`
  - `ui.replyBarVisible`
  - `ui.replyToMessageId`
  - `ui.pinned.visible/ui.pinned.textPreview`
  - `freeze.active`
  - `sandbox.qna.lastResolveAt/lastResolveReason`
  - `sandbox.qna.lastClearReplyUiAt/lastClearReplyUiReason`

## Acceptance (requested)
- 1) tag 後回覆「穩住」：reply bar 立刻消失，freeze 解除：PASS
- 2) tag 後回覆「衝」：同上：PASS
- 3) tag 後回覆「不知道」：同上（且會進提示流程）：PASS
- 4) debug 顯示 qna.awaitingReply true→false，ui.replyBarVisible true→false：PASS
- 5) classic mode 不受影響：PASS
