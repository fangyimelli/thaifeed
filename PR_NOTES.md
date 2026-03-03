# 修正：@你 高亮需先發言才生效（bootstrap / mention registry 解耦）

## Summary
- 目標：使用者在輸入名稱按 Confirm 後，**不必先發言**也能立即被 `@name` 解析，且聊天室訊息可立刻 row highlight。
- 本次把「使用者註冊」與「訊息發送」解耦：activeUser registry 在 bootstrap 建立，不再等第一則 player message。
- mention 判斷與高亮改為使用 `message.mentions[]`（解析後 token），不再靠字串 includes。

## Root-cause inventory（全 repo 搜尋與衝突點）
- `registerActiveUser / usersById / usersByHandle`：確認已在 startup Confirm 流程，但 mention 高亮仍以文字比對為主，造成 registry 與 UI 判斷斷裂。
- `parseMentions / resolveMention`：原本沒有在 message model 保存解析結果，UI 只做 `text.includes("@name")`，容易因 sanitize / 大小寫 / 尚未出現在 messages 而誤判。
- `highlight`：原先 `ChatMessage` 以 `message.text.includes(@activeUser)` 套字色，沒有 row 背景，且不排除 self-message。
- `usersByHandle`：原先 key 未統一 lowercase，`@Name`/`@name` 可能 resolve 漏失。

## Changed
- [bootstrap/chat]
  - `bootstrapAfterUsernameSubmit(name)` 仍在同一 user gesture 完成：register activeUser + audio unlock + bootstrap ready。
  - `registerActiveUser` 改為寫入 `usersByHandle(lowercase)`，activeUser `displayName/handle` 於 Confirm 當下可用。
- [mention parser]
  - 新增 mention token 解析（`parseMentionHandles`）並在 `dispatchChatMessage` 統一 resolve 為 `message.mentions: userId[]`。
  - resolve 規則先查 registry（`usersByHandle`），找不到才不寫入 mentions（保留原文字）。
- [highlight/UI]
  - `ChatMessage` 高亮改為：`message.mentions` 含 `activeUserId` 且訊息作者非 activeUser。
  - 新增 row 背景高亮（底色 + 左側線），system 訊息不高亮。
- [qna/freeze/pin]
  - tagged-question 判斷改讀 `questionMessage.mentions`，與現有 pinned reply / freeze 流程一致，不再依賴先前字串判斷。
- [chat sanitize]
  - `ChatPanel` 產生 active mention set 時加入 `activeUserInitialHandle`，避免「尚未在 messages 出現」時 mention 被 sanitize 掉。

## SSOT changed
- 無新增 SSOT 檔案；沿用既有 chat runtime state 與 event registry。

## Debug 欄位變更
- 新增：
  - `chat.activeUser.displayName`
  - `chat.activeUser.registryHandleExists`
  - `chat.mention.lastParsedMentions`（`messageId + mentions[]`）
  - `chat.mention.lastHighlightReason`（`mentions_activeUser | none`）
  - `chat.mention.tagHighlightAppliedCount`
- 三次 PR 規則檢查：以上欄位已於本 PR_NOTES 與 README 記錄（第 1 次）。

## Removed
- 無功能移除（無按鈕/路由/行為刪除）。

## Impact
- chat/events/debug/docs

## Validation / Acceptance
- Case A（不發言）
  - Confirm 後 activeUser 名稱與 You badge 立即顯示。
  - NPC `@你` 訊息可立即 resolve 並 row highlight。
- Case B（連續多次被 tag）
  - 每次皆以 mentions 判斷高亮。
- Case C（自己 @別人）
  - 不觸發「你被 tag」row highlight。

## Test commands
1. `npm run build`
2. Browser manual flow（debug=1）
   - Confirm 名稱
   - 點 `Emit NPC Tag @You`
   - 觀察 row highlight + debug mention 欄位遞增
