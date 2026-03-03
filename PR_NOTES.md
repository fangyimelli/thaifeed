# 修正：@mention 後聊天室未自動滾到底

## Summary
- 修正「被 tag 會高亮但不自動滾動」：當新訊息（非自己）`mentions` 命中 activeUser 時，加入 mention autoscroll 流程。
- 採用**策略 B（Twitch-like）**：
  - 使用者接近底部（threshold=100px）時：自動滾到底。
  - 使用者正在往上看舊訊息（超過 threshold）時：不強制跳，改為強化「跳到最新」提示（顯示 `@你・跳到最新`）。
- 新增 debug：
  - console logs：`[MENTION_AUTOSCROLL] ...`、`[AUTOSCROLL_SKIPPED] ...`
  - URL 開關：`forceMentionAutoscroll=1`（強制每次 mention 都 auto scroll）
  - debug 按鈕：`Inject NPC Tag @You`

## Strategy 選擇理由
- 採策略 B 可避免使用者正在閱讀舊訊息時被強制打斷，符合 Twitch 常見 UX。
- 同時在 mention 事件時強調「跳到最新」按鈕，保留一鍵回到底部的能力，降低漏訊息風險。

## Changed
- `ChatPanel` 新增 mention autoscroll 判斷：僅針對「新進訊息 + 非自己 + mentions 命中 activeUser」。
- `ChatPanel` 新增雙階段滾動（`requestAnimationFrame` + `setTimeout(0)`）確保 Android Chrome / 行動版 DOM 更新後仍穩定到底。
- `ChatPanel` 新增 mention 提示脈衝狀態：未在底部時將「最新訊息」按鈕高亮與改文案。
- `App` debug 模式新增注入測試訊息按鈕（帶 `@activeUserHandle`）。
- `styles` 新增 `jump-bottom.mention-active` 與 debug 說明樣式。

## Debug 欄位變更
- 新增 debug 控制：
  - URL param: `forceMentionAutoscroll=1`
  - 按鈕: `Inject NPC Tag @You`
- 三次 PR 規則檢查：
  1. 本節已記錄新增 debug 控制。
  2. README 已同步寫入 debug 驗證方式。
  3. Change Log 已記錄行為與 debug 變更。

## Testing（驗收）
1. **我停在底部 → 別人 @我**
   - 結果：立即 autoscroll 到最新；該 row 維持 mention highlight。
2. **我往上滑看舊訊息（離底部 > threshold）→ 別人 @我（策略 B）**
   - 結果：不強制跳到底，顯示/高亮 `@你・跳到最新`。
   - 點擊後可一鍵到底；該 mention row 仍高亮。
3. **連續多則訊息快速進來**
   - 結果：mention 命中時仍穩定觸發判斷；採雙階段排程滾動，未觀察到抖動/漏滾。

## Test commands
1. `npm run build`
2. `npm run dev` + 手動驗證（`?debug=1`）
3. `?debug=1&forceMentionAutoscroll=1` 驗證強制自動置底
