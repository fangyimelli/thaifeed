# Sandbox NIGHT_01 Chat Pipeline Audit Report（2026-03-06, audit-only）

> Scope: sandbox story/chat/mention/reply/prompt/debug render。此次為稽核，不修改功能邏輯。

## 1. Executive Summary

- `behindyou` 的 `@玩家` 訊息本質是 **mention chat message**，不是 reply message object。訊息建立於 `SandboxChatDirector.getNextDirectedLine()`，經 `ChatEngine.formatLine()` 與 `App.convertSandboxChatMessage()` 後，仍只含一般 chat 欄位（無 `replyTo*` / `parent*` / `quoted*`）。
- 畫面出現 `↳ @mod_live` 與 `（原始訊息已不存在）` 的來源是 **全域 reply pin bar**（`ChatPanel`），不是該則 `behindyou` 訊息本體被畫成 reply。
- fallback `（原始訊息已不存在）` 由 `ChatPanel` 在 `qnaStatus==='AWAITING_REPLY' && questionMessageId` 且查不到 `questionMessageId` 對應訊息時觸發。
- 造成 lookup miss 的主要可證路徑：`runTagStartFlow()` 不檢查 `appendMessage` 成功與否，後續仍會 `markQnaQuestionCommitted(messageId)`，可把「未成功 append 的 id」寫入 `qna.active.questionMessageId`。
- `@t` 並非 render truncation。來源是訊息建立時就使用 `@${state.playerHandle}`，而 `playerHandle` 直接來自 join 名稱正規化（可為單字元），因此輸出 `@t` 屬資料源值。
- sandbox prompt state (`consonant.promptText`, `prompt.current`, `reveal`) 未直接混入 `ChatMessage` schema；但 reply/pin UI 與 classic QnA state 共用，存在 cross-mode coupling（非欄位混流）。
- debug action 有污染正式視覺流程風險：可直接寫 lock/pin 相關 state，且部分路徑在 sandbox 被 writer guard 擋下後仍保留 lock 變更，造成「pin header 與 message source 不一致」。

## 2. Reproduction Path

1. 進入 `?mode=sandbox_story`，提交使用者名稱（例如 `t`）。
2. `bootstrapAfterUsernameSubmit()` 會把 phase gate 設為 `N1_INTRO_CHAT` 並啟動 PREHEAT。
3. PREHEAT 期間 `SandboxChatDirector` 固定發一則 VIP directed line：`@${playerHandle} 嗨嗨，第一次看這台嗎？`。
4. 同時若已有殘留/並行 QnA reply state（`qna.active.status='AWAITING_REPLY'` + `questionMessageId`），`ChatPanel` 會顯示全域 reply pin bar。
5. 若該 `questionMessageId` 在 `messages` 查無，pin bar body 會顯示 `（原始訊息已不存在）`，形成「上方 mention、下方 reply fallback」的視覺並存。
6. 可用 debug actions 進一步放大：`Emit NPC Tag @You` / `Inject NPC Tag @You` / `Toggle TagLock(Self)` 會直接動 lock 或 push 測試訊息，與正式 flow 並存。

## 3. Data Trace

### A. `behindyou` mention 訊息鏈路

1) 建立來源
- `src/sandbox/chat/chat_director.ts#getNextDirectedLine`
  - PREHEAT 內建立：`@${state.playerHandle} 嗨嗨，第一次看這台嗎？`。

2) chat engine 包裝
- `src/sandbox/chat/chat_engine.ts#nextMessage -> formatLine`
  - VIP line 轉為 `text: "behindyou: @<player> ..."`，並標記 `vip/role/badge`。

3) App 轉型
- `src/app/App.tsx#convertSandboxChatMessage`
  - 以 `split(': ')` 去除 `behindyou:` 前綴，最終 `ChatMessage.text` 為 `@<player> 嗨嗨...`。

4) mention 判定
- `src/app/App.tsx#dispatchChatMessage`
  - `parseMentionHandles()` 抓 `@token`，映射 `usersByHandleRef -> user.id`，寫入 `message.mentions`。
- `src/ui/chat/ChatMessage.tsx`
  - `message.mentions.includes(activeUserId)` 時加上 mention highlight class。

5) reply 判定/渲染（獨立於訊息本體）
- `src/ui/chat/ChatPanel.tsx`
  - `shouldRenderReplyPreview = qnaStatus==='AWAITING_REPLY' && questionMessageId`。
  - reply pin bar 顯示 `↳ @{lockTarget}` 與 preview text。

> 結論：`behindyou` 訊息本身沒有 reply schema；reply UI 為全域 overlay state。

### B. 欄位稽核（指定欄位）

針對該 mention 訊息可證欄位：
- 有：`id/username/text/language/type/isVip/role/badge/mentions`。
- 無：`replyTo/replyToMessageId/parentMessageId/quotedMessageId/targetMessageId/mentionTargets/targetUser/displayHandle`。

### C. `（原始訊息已不存在）` 觸發鏈

1) 觸發位置
- `src/ui/chat/ChatPanel.tsx`
  - `replyPreviewText = originalMessage ? truncate(...) : '（原始訊息已不存在）'`。

2) `originalMessage` 查找
- 以 `questionMessageId` 到 `sanitizedMessagesById` 查找。

3) lookup miss 可證原因
- `src/chat/tagFlow.ts#runTagStartFlow`
  - `appendMessage(tagMessage)` 之後 **不檢查成功狀態**。
- `src/app/App.tsx`（多個 sandbox tag 路徑）
  - `appendMessage` 內呼叫 `dispatchChatMessage(...)`，其回傳 `{ok:false}` 可能被忽略。
  - `setPinnedReply` 仍會 `markQnaQuestionCommitted(messageId)`，把可能不存在的 id 寫入 qna。

## 4. Root Cause(s)

### RC-1：全域 reply pin 與 mention line 並列，造成「像被畫成 reply」的誤判
- 證據：reply pin bar 渲染條件只看 `qnaStatus/questionMessageId`，不看當前 message row。
- 結論：這是 UI 層「全域狀態並列」，不是 `behindyou` message type 被改寫。

### RC-2：reply target id 可被提交但未落地，導致 fallback 文案
- 證據：`runTagStartFlow` 未檢查 append success；`markQnaQuestionCommitted` 在後續無條件寫入 `questionMessageId`。
- 結論：message store lookup miss 可由流程寫入時序造成，不需假設資料被刪除。

### RC-3：`@t` 來源是 player handle 本身，不是 render truncation
- 證據：directed line 模板直接用 `@${state.playerHandle}`；player handle 由 join 輸入 normalize 後保存，允許單字元。
- 結論：若玩家名為 `t`，輸出 `@t` 為預期資料結果。

### RC-4：sandbox 與 classic reply/QnA state 共用，形成 cross-mode leakage 風險
- 證據：sandbox chat 使用 `qnaStateRef.active` 與 `lockStateRef` 來驅動 reply pin 顯示與 freeze guard。
- 結論：雖非 classic 功能直接跑進 sandbox message schema，但 UI control plane 共享造成干擾面。

### RC-5：debug actions 可直接寫 lock/pin 相關 state，可能污染正式畫面
- 證據：`Emit NPC Tag @You`、`Inject NPC Tag @You`、`Toggle TagLock(Self)` 等不經完整 schema/flow 交易。
- 結論：debug 按鈕可製造「header 指向 A、question id 指向 B」等不一致狀態。

## 5. Scope of Impact

- mention：影響觀感（與 reply bar 並列時誤認為 reply）。
- reply preview：受 `qna.active.questionMessageId` 正確性影響，會出現 fallback。
- sandbox prompt：未直接污染 chat schema，但其流程與 qna/reply 共用控制面。
- debug inject：會污染 lock/pin 狀態，可在正式畫面可見。
- NIGHT_01 flow：phase gate 與 intro gate 有跑，但 debug 強制動作可讓觀感偏離主流程。
- mobile rendering：reply pin/inject/debug tool 疊加時更容易造成視覺誤讀（overlay 層資訊密度高）。

## 6. Recommended Fix Plan（不實作）

### P0 必修
1. `runTagStartFlow` 改為交易式提交：append 成功才 commit `questionMessageId`。
   - 檔案：`src/chat/tagFlow.ts`, `src/app/App.tsx`
   - 風險：需補齊所有 append caller 回傳值型別。
2. reply pin 顯示 guard 增加 `questionMessageId` 可查性與 source consistency。
   - 檔案：`src/ui/chat/ChatPanel.tsx`, `src/app/App.tsx`
   - 風險：可能影響既有 debug 觀察習慣。
3. debug actions 加 sandbox-safe gate（預設不改 lock/qna 正式欄位，或加 isolate namespace）。
   - 檔案：`src/app/App.tsx`
   - 風險：調試操作需更新說明文件。

### P1 結構修正
1. 拆分 sandbox reply control plane 與 classic qna control plane（避免 cross-mode coupling）。
   - 檔案：`src/app/App.tsx`, `src/game/qna/*`, `src/modes/sandbox_story/*`
2. 統一 pin presenter：明確區分「global question pin」與「event auto pin」。
   - 檔案：`src/ui/chat/ChatPanel.tsx` + adapter 層。

### P2 清理與防呆
1. 為 debug inject path 加 schema validator + invariant assert。
2. 新增 e2e：mention/reply/prompt 三路同時存在時的 UI 斷言。
3. 補 dead code/legacy adapter 掃描（特別是 classic 事件 API 在 sandbox 的殘留橋接）。

## 7. Guardrails / Regression Checklist

- mention 不得被畫成 reply（row 與 pin bar 來源要可追蹤）。
- reply target 缺失 fallback 僅在「真 reply 且 target 缺失」時出現。
- sandbox prompt 欄位不可進入 `ChatMessage` schema。
- debug action 不可污染正式資料流（或需明確隔離標記）。
- mobile viewport 下 chat/input/debug panel 不得互相遮擋造成誤判。
- `@You/@you/@mod_live/@<activeUser>` mapping 在 parser/normalizer/formatter 一致。

## 8. File Map

- `src/sandbox/chat/chat_director.ts`：PREHEAT 定向 VIP mention 來源。
- `src/sandbox/chat/chat_engine.ts`：訊息包裝、VIP 前綴、排程。
- `src/app/App.tsx`：核心 normalize/dispatch/mention map/auto pin/freeze/debug action。
- `src/ui/chat/ChatPanel.tsx`：reply pin fallback 文案與渲染條件。
- `src/ui/chat/ChatMessage.tsx`：mention highlight 判定與 row render。
- `src/chat/tagFlow.ts`：tag append->pin->freeze 序列（目前未檢查 append 成功）。
- `src/game/qna/qnaEngine.ts`：`questionMessageId` commit 與 AWAITING_REPLY 狀態。
- `src/modes/sandbox_story/sandboxStoryMode.ts`：prompt/reveal/introGate/flow state（sandbox SSOT）。
- `src/ui/scene/SceneView.tsx`：consonant bubble 與 debug 可視化欄位。

