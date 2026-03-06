# Sandbox Reply / Mention / Pin Pipeline Audit Report（2026-03-06, audit-only）

> Scope: sandbox only（不修改 code，不含 classic 修復）

## 1. Executive Summary

- `@me`（或任何「tag 到自己」）的直接來源是送出路徑的 `lockStateRef.target`：當 lock target 被設成 active user handle 時，`submitChat()` 會強制把 outgoing text 重寫為 `@{lockTarget} ...`，因此玩家會自 tag。  
- 在 sandbox auto-pin 路徑中，`triggerSandboxAutoPinFreeze()` 會把 `lockStateRef.target` 設成 active user（不是提問 NPC），這與一般 QnA/tag flow（`target = speaker/questionActor`）不同，是「自 tag」最關鍵分歧點。  
- pinned preview 出現在 chat panel 頂部是結構性行為：`ChatPanel` 先渲染 `replyPinBar-sandbox`（在 message list 之前），而原始 message row 仍照常渲染在 `renderedMessages.map(...)`，因此必然會同時看到「頂部 pin + 時間軸原訊息」。  
- inline reply preview（`↳ @lockTarget`）其實在 composer 上方；頂部那個是另一條 sandbox pin pipeline。兩條 pipeline 並存會造成視覺上的「雙重 preview」。  
- reply / mention / pinned preview / sandbox prompt state 並未完全隔離：至少共用 `lockStateRef`、`qnaStateRef.active.questionMessageId`、message store 與 sandbox prompt writer guard，屬同一控制面耦合。  
- 目前 debug actions 大多已「isolated」，但 `Emit NPC Tag @You` 仍走事件發送路徑（非純 UI mock），可間接影響正式 lock/pin 判定流程（尤其在 event/qna 有效時）。

---

## 2. Reproduction Path

1. Sandbox 啟動並完成 join（玩家 handle 可能是 `me` 或其他）。
2. 系統進入 sandbox tag / auto pin 流程，建立 pin 與 lock。
3. 若走 `triggerSandboxAutoPinFreeze()`，`lockStateRef.target` 會被寫成 active user handle。
4. 使用者送出訊息時，`submitChat()` 在 lock 啟動下會重寫輸入為 `@{lockTarget} ...`。
5. 因 lockTarget 是自己，送出結果就是 `@me ...`（或 `@<自己的handle> ...`）。
6. 同一時間，UI 會渲染：
   - 頂部 sandbox pin（`replyPinBar-sandbox`）
   - 聊天流中的原始訊息 row
   - （若 `qnaStatus===AWAITING_REPLY`）composer 上方 inline reply pin（`replyPinBar-inline`）

---

## 3. Data Trace

### A) Reply start → composer prefill → send → mention parse → dispatch

1. **Reply start（sandbox tag/QnA）**
   - `runTagStartFlow()` 在 append 成功後呼叫 `setPinnedReply`，由 App 端寫入 `markQnaQuestionCommitted()` + `lockStateRef.current`。  
   - 一般 tag flow 會把 `lockStateRef.target` 指向 `speaker/questionActor`。  

2. **Auto-pin 分支（差異點）**
   - `triggerSandboxAutoPinFreeze()` 將 `lockStateRef.target` 設為 `normalizeHandle(activeUser...) || 'activeUser'`，即玩家自身 handle。  

3. **Composer / send 重寫**
   - `submitChat()`：若 lock 啟動，`outgoingText = @lockTarget + stripLeadingMentions(raw)`。
   - 這是強制 rewrite，不依賴使用者真的輸入誰。

4. **Mention parse / mapping**
   - `dispatchChatMessage()` 用 `parseMentionHandles()` 抽 `@token`。
   - 再用 `usersByHandleRef` map 成 user id（active user id 為 `activeUser`）。
   - 寫入 `message.mentions`，供 highlight/autoscroll/reply guard 使用。

5. **Render / sanitize**
   - `ChatPanel` 顯示前會做 `sanitizeMentions(text, activeSet)`；非 activeSet 的 mention token 會被清除，不會改寫成別名。

> 結論：`@me` 不是 parser/formatter 自動 alias；是 lock target upstream 寫成「自己」後，send path 強制前綴造成。

### B) Pinned preview render pipeline

1. **頂部 sandbox pin**
   - `shouldRenderSandboxPinned = sandboxControl.enabled && sandboxPinnedEntry.visible`
   - 位置：`<header>` 之後、`chat-messages` 之前（panel top）。

2. **message row**
   - `renderedMessages.map(...)` 永遠照 store 渲染，不會因 sandbox pin 而隱藏同 id message。

3. **inline reply preview（靠 composer）**
   - `shouldRenderReplyPreview = AWAITING_REPLY + questionMessageId + originalMessage + lock consistency`
   - 位置在 `chat-messages` 之後、`<form className="chat-input">` 之前。

> 結論：目前設計就是三個區塊可同時存在，沒有 mutual exclusion guard，所以會看到「頂部 pin + 時間軸原訊息 + composer 上方 reply pin」。

### C) 狀態控制面（是否混線）

- **reply state**：`qnaStateRef.current.active.status/questionMessageId` + `lockStateRef`。
- **mention state**：`parseMentionHandles` + `usersByHandleRef` + `message.mentions`。
- **pinned preview state**：
  - inline pin：`qnaStateRef.active.questionMessageId`
  - sandbox top pin：`sandboxPinnedEntry`
- **sandbox prompt state**：`sandboxModeRef.current.state.prompt.*`（含 writer guard、pinned writer）

以上在 App 同檔集中協調，非獨立 store；會互相讀寫 guard（尤其 `setPinnedQuestionMessage` + lock/qna/prompt writer）。

### D) Debug tools contamination audit

- `Simulate Send`：已改 isolated（送 debug system message，不走正式 submit pipeline）。
- `Inject NPC Tag @You`：送 debug_tester chat 訊息，不直接改 lock/qna。
- `Toggle TagLock(Self)`：目前只 toggle `debugIsolatedTagLock` flag，未接到正式 lock。
- `Toggle isComposing`：只改 UI composing override。
- `Emit NPC Tag @You`：走 `dispatchEventLine(...)`，屬事件送出路徑，並非純 UI mock；可在 event 條件下與正式 state 互動。

> 結論：debug 污染風險較早期低很多，但 `Emit NPC Tag @You` 仍非完全隔離路徑。

### E) Mobile UI layout / overlay anchor

- `chat-panel` 是 column flex。
- `replyPinBar-sandbox` 在 DOM 上位於 message list 前面，天然固定在 panel 內上方。
- `replyPinBar-inline` 在 message list 後、composer 前，貼近輸入區。
- mobile media query 未改變 pin anchor，只調整邊框圓角與外觀。

> 結論：手機上看到「pin 在上方」不是 breakpoint bug，而是 DOM 結構本身決定。

---

## 4. Root Cause(s)

1. **RC-A（Self tag）**  
   Auto-pin 路徑把 `lockStateRef.target` 設為 active user，`submitChat()` 又無條件用 lockTarget 重寫前綴，導致玩家自 tag。

2. **RC-B（Top pinned preview）**  
   sandbox pin UI anchor 在 chat panel top，而非 composer 區，且與 message row 無排他條件。

3. **RC-C（Double display）**  
   sandbox pin 是「額外摘要層」，不是引用 row 替換；原訊息不會從時間軸移除。

4. **RC-D（State coupling）**  
   reply/mention/pin/prompt guard 共用 App 內 refs/state（`qnaStateRef`、`lockStateRef`、`sandboxPinnedEntry`、message store），存在跨流程交互影響。

5. **RC-E（Debug residual coupling）**  
   雖多數 debug action 已隔離，仍有 `Emit NPC Tag @You` 使用事件管線，可能與正式 reply/pin 規則同時作用。

---

## 5. Scope of Impact

- **Sandbox reply correctness**：高（會直接影響玩家送出文字前綴）。
- **Mention UX**：高（玩家誤以為系統要求 tag 自己）。
- **Pinned preview UX**：高（頂部 pin + 原訊息並存造成重複感）。
- **Classic mode**：本次 trace 未見直接 classic 修改需求，但控制面在 App 共用，後續修復需嚴格 sandbox gating。
- **Debug tooling**：中（特定 action 仍可能介入正式狀態）。

---

## 6. Recommended Fix Plan（P0 / P1 / P2，僅建議不實作）

### P0
- 將 auto-pin lock target 改為「提問者/發話者」而非 active user。
- 在 send rewrite 前新增 guard：若 `lockTarget` 等於 active user handle，拒絕或降級為不重寫。
- 為 sandbox top pin 與 inline pin 建立互斥規則（同一 messageId 只呈現一種 preview）。

### P1
- 拆分 sandbox pin state 與 qna reply state（避免 `sandboxPinnedEntry` 與 `qnaStateRef.active.questionMessageId` 彼此影響）。
- 抽離 reply presenter：明確定義 `panel-top pin` vs `composer-near reply` 使用場景。

### P2
- 讓 debug actions 全面 schema-isolated（含 `Emit NPC Tag @You`）。
- 補 e2e 回歸案例：
  - auto pin 後 send 不可 `@self`
  - 同 message 不可雙 preview
  - mobile 下 pin anchor 與 composer 距離符合規格

---

## 7. Guardrails / Regression Checklist

- [ ] lock target 不可等於 active user（或至少不進 send rewrite）。
- [ ] `submitChat` rewrite 後，第一個 mention token 必須是「非 self」或為空。
- [ ] sandbox top pin 與 inline reply pin 同 id 不可同時顯示。
- [ ] pinned row 與 source row 的關係需有明確規則（replace / summarize 二選一）。
- [ ] `dispatchChatMessage` mention mapping 應保持 handle→id 單向，不得產生 `@me` 類 alias 重寫。
- [ ] debug actions 不得直接改 `qnaStateRef/lockStateRef/sandboxPinnedEntry`（除非顯式 debug-only namespace）。

---

## 8. File Map

- `src/app/App.tsx`：lock/qna/send rewrite、auto pin、debug actions、state coordination。
- `src/ui/chat/ChatPanel.tsx`：sandbox top pin / inline reply pin / message list render order。
- `src/ui/chat/ChatMessage.tsx`：mention highlight row。
- `src/core/systems/mentionV2.ts`：mention sanitize 與 active set。
- `src/chat/tagFlow.ts`：reply start pipeline（append→scroll→pin→freeze）。
- `src/game/qna/qnaEngine.ts`：question commit 狀態機。
- `src/sandbox/chat/chat_engine.ts`：sandbox 訊息發送主引擎。
- `src/sandbox/chat/chat_director.ts`：sandbox directed line（含 @player）。
- `src/modes/sandbox_story/sandboxStoryMode.ts`：sandbox prompt/pinned writer state。
- `src/styles.css`：pin/composer/chat panel 的 layout anchor。
