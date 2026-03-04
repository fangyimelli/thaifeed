## 2026-03-04（sandbox_story only：submit gate + advance one-shot + classic hint shared）

### Changed
- [sandbox/submit] 在 sandbox 送出入口加上 submit gate：`sandbox.answer.submitInFlight` / `lastSubmitAt`；重複送出直接阻擋並寫入 `sandbox.advance.blockedReason=double_submit`。
- [sandbox/advance] `advancePrompt` 與 `markWaveDone` 新增 one-shot token（`sandbox.advance.inFlight` + `sandbox.advance.lastToken`），同 token 或 inFlight 重入會擋下 `double_advance`。
- [sandbox/prompt-ssot] prompt overlay 改為只讀 `sandbox.prompt.current`，確保「先更新 prompt.current，再渲染 UI」，修正切題時舊題閃回。
- [sandbox/hint] unknown/wrong 提示統一改由 shared builder `src/shared/hints/consonantHint.ts` 產生；classic adapter 同步改走 shared，輸出文字不變。
- [sandbox/input] ChatPanel 移除 Enter 與 fallback_click 的第二提交流程，Enter / 按鈕 / 手機輸入法 submit 全部統一走 form submit handler。
- [debug] 新增驗收欄位：`sandbox.answer.submitInFlight/lastSubmitAt`、`sandbox.judge.lastInput/lastResult`、`sandbox.advance.inFlight/lastAt/lastReason/blockedReason`、`sandbox.prompt.current.id/consonant/wordKey`、`sandbox.hint.lastTextPreview/source`。

### SSOT
- [x] SSOT changed
  - sandbox prompt 顯示單一真相改為 `sandbox.prompt.current`，overlay 不再接受外部獨立顯示狀態。

### Debug 欄位變更紀錄
- 新增：
  - `sandbox.answer.submitInFlight`
  - `sandbox.answer.lastSubmitAt`
  - `sandbox.judge.lastInput`
  - `sandbox.judge.lastResult`
  - `sandbox.advance.inFlight`
  - `sandbox.advance.lastAt`
  - `sandbox.advance.lastReason`
  - `sandbox.advance.blockedReason`
  - `sandbox.prompt.current.id / consonant / wordKey`
  - `sandbox.hint.lastTextPreview`
  - `sandbox.hint.source`（固定驗證 `classic_shared`）

### Acceptance
| Item | Result |
|---|---|
| 1) 任意一題送出一次答案，不會要求第二次、不會舊題閃回 | PASS |
| 2) correct：題目只切一次；單字 4 秒淡出可繼續跑 | PASS |
| 3) unknown：顯示提示且不跳題；提示與 classic 一致 | PASS |
| 4) PASS：只跳一次題 | PASS |
| 5) classic mode 不受影響 | PASS |

## 2026-03-04（sandbox only：judge gate + prompt/reveal SSOT + 4s reveal）

### Changed
- [sandbox/flow] 將 sandbox 推題時機收斂為「判定結果已建立後」才可前進；`parse.ok=false` 或 `parse.kind=none` 會降級為 `wrong|unknown`，並記錄 `sandbox.advance.blockedReason=parse_none`，禁止當作 correct 直推。
- [sandbox/ssot] 建立 prompt/reveal 單一真相：`sandbox.prompt.current`（`id/consonant/wordKey`）同時供 UI 子音、judge、word reveal 使用；reveal 改為只吃 current prompt，不再內部自行挑字或 fallback。
- [sandbox/guard] 若 prompt 與 reveal 來源不一致，寫入 `mismatch.promptVsReveal=true` 並阻擋 reveal，避免錯字內容曝光。
- [sandbox/ui] Word reveal 改為螢幕正中央固定顯示、純文字無底框，總時長固定 4000ms，動畫為 scale up + opacity down。
- [sandbox/debug] 新增/調整欄位：`sandbox.prompt.current.id/consonant/wordKey`、`word.reveal.active/wordKey/consonantFromPrompt/durationMs`、`advance.lastAt/lastReason/blockedReason`、`mismatch.promptVsReveal`。

### Acceptance
- 1) 任意亂打字不再「未判定就跳題」：PASS
- 2) 題目子音 = 單字內對應子音（同一 prompt）不錯位：PASS
- 3) 單字置中放大、4 秒慢慢消失：PASS
- 4) Classic mode 不受影響：PASS

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

## 2026-03-04（sandbox only：換題鎖定流程）

### Summary
- 修正 sandbox 任意輸入會跳題：現在只允許 `correct_done` 或 `debug_pass` 換題。
- 修正 unknown 分流：`不知道 / 不確定 / idk / ?` 一律判定 unknown，僅顯示 hint，不 reveal、不前進。
- 修正 reveal 規則：僅 correct 觸發，置中顯示完整單字，4000ms 放大淡出，結束後自動前進。
- Debug PASS 改為真正 skip：直接 `advancePrompt('debug_pass')`，並清理 reply/freeze/reveal 狀態。

### Changed Files
- `src/app/App.tsx`
- `src/modes/sandbox_story/sandboxStoryMode.ts`
- `src/modes/sandbox_story/classicConsonantAdapter.ts`
- `src/ui/overlays/SandboxWordRevealText.tsx`
- `src/ui/scene/SceneView.tsx`
- `README.md`
- `docs/10-change-log.md`

### SSOT
- [x] SSOT changed
  - sandbox prompt 單一真相維持 `sandbox.prompt.current`，題目/判定/hint/reveal 共用同一來源。

### Debug 欄位變更紀錄
- 新增 / 明確化：
  - `sandbox.prompt.current.id`
  - `sandbox.prompt.current.consonant`
  - `sandbox.prompt.current.wordKey`
  - `judge.lastInput`
  - `judge.lastResult`
  - `hint.active`
  - `hint.lastShownAt`
  - `word.reveal.active`
  - `word.reveal.wordKey`
  - `word.reveal.durationMs`
  - `advance.lastAt`
  - `advance.lastReason`
  - `advance.blockedReason`

### Acceptance
| Item | Result |
|---|---|
| 1) 玩家輸入「不知道」：出現提示，prompt 不變 | PASS |
| 2) 玩家亂打字（非正確、非不知道）：不換題 | PASS |
| 3) 玩家答對：置中單字放大 4 秒淡出，結束後自動換題 | PASS |
| 4) 按 PASS：立即換題（不需答對） | PASS |
| 5) Classic mode 不受影響 | PASS |
