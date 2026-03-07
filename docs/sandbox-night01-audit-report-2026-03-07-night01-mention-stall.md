# Sandbox NIGHT_01 Audit Report（2026-03-07, AUDIT ONLY）

> 任務模式：audit-only。未修改 runtime code，僅追查 send/mention/parser/judge/prompt/state/flow 全鏈路。

## 1. Executive Summary

- 這次案例主因不是「玩家答錯」，而是**玩家回覆當下不在有效的 sandbox consonant 等待狀態**。`submitChat()` 有送出並 append 訊息，但 `consumePlayerReply()` 只有在 `flow.step === WAIT_REPLY_1/2/3` 且 `prompt.current.kind === consonant` 時才會進 `parseAndJudgeUsingClassic()`；否則只會當一般 free chat。  
- `@behindyou 對` / `@behindyou 怎?` 這類訊息會成功進 `dispatchChatMessage`，但若不符合上面條件，`commitConsonantJudgeResult()` 不會被呼叫，因此 `consonant.judge.lastInput`、`sandbox.consonant.parse.inputRaw/inputNorm` 會維持預設值。  
- UI 同時存在兩種來源：
  1. preheat 導演台詞 `@<player> 嗨嗨，第一次看這台嗎？`（`SandboxChatDirector`）
  2. 真正子音題 prompt `@<player> 請回覆本題子音（直接輸入：บ）...`（`askSandboxConsonantNow -> getClassicConsonantPrompt`）  
  玩家很可能在回覆 (1) 的對話 target，而非 (2) 的 judge target。
- `consonant.prompt.current/promptText` 可能殘留，但 `prompt.current.id` 為空時其實表示「目前沒有有效 prompt object」，屬於 prompt 文案層與 flow waiting 層不同步的可觀測現象。

## 2. Reproduction Path

1. sandbox join 後，flow 進 PREHEAT，導演可發出 preheat direct line：`@<player> 嗨嗨，第一次看這台嗎？`。  
2. 真正題目只會在 `canAskConsonantNow()` 成立時發出（需 `introGate.passed` + `storyPhaseGate=N1_QUIZ_LOOP` + `flow.step=TAG_PLAYER_1`）。  
3. 玩家送出 `@behindyou 對` / `@behindyou 怎?` 時，`submitChat()` 先 append 玩家訊息，再呼叫 `consumePlayerReply(outgoingText)`。  
4. 若當下不在 `WAIT_REPLY_1/2/3 + prompt.current.consonant`，就不會進 parser/judge，訊息被視為 free chat。

## 3. Data Trace

### A. 玩家訊息物件與 send pipeline

- 玩家訊息由 `createPlayerMessage(outgoingText, activeUserHandle)` 建立，結構包含 `id/username/text/language/isSelf`。  
- `submitChat()` 會呼叫 `dispatchChatMessage(..., {source:'player_input'})`；`dispatchChatMessage` 仍會 append 進 state 並回傳 `{ok:true,messageId}`。  
- 所以本案不是「訊息沒送出」，而是「送出後沒進 judge 條件分支」。

### B. `submitChat -> dispatch -> parser -> judge` 中斷點

- judge 分支存在於 `consumePlayerReply()`：
  - 先讀 `sandboxState.flow.step` 與 `sandboxState.prompt.current`
  - 只有 `(WAIT_REPLY_1|2|3) && currentPrompt.kind==='consonant'` 才跑 `parseAndJudgeUsingClassic()`
  - 並呼叫 `commitConsonantJudgeResult()` 寫入 parse/judge debug state。  
- 若條件不成立，`consumePlayerReply()` 直接回傳 false（sandbox free chat path），`submitChat()` 也不會補跑 parser。

### C. 為何 `lastInput='-'`, `parse.inputRaw=''`, `parse.ok=false`

- 這些欄位只有在 `commitConsonantJudgeResult()` 被呼叫才更新。
- 本案顯示值代表該次玩家回覆沒有進到 `commitConsonantJudgeResult()`，而非 parser 後被覆蓋。

### D. mention 前綴是否阻斷解析

- parser 本身會先 `normalizeSandboxConsonantInput()`，其中 `strippedLeadingMentions` 會移除前置 `@...`；理論上 mention 前綴不會單獨造成阻斷。  
- send/display mention 流程：
  1. `submitChat`（lock rewrite 用 `stripLeadingMentions`）
  2. `dispatchChatMessage`（`parseMentionHandles` 寫 `message.mentions`）
  3. `ChatPanel`（`sanitizeMentions` 只影響顯示）
  4. judge parser（僅在 `consumePlayerReply` 條件成立時）  
- 因此本案重點不是 mention sanitize，而是 parser 觸發條件未滿足。

### E. `บ` 題目允許答案集合與 parser啟動狀態

- 目前 classic adapter 的可接受集合是：
  - `ctx.node.correctKeywords`（或 fallback `nodeChar`）
  - option alias 精確值：`a/1/b/2/c/3`
  - unknown：`?`、`？`、`unknownKeywords`
  - pass：`pass/skip/p`。
- `thai/latin/bopomofo/cjk` 的 `allowedSetsHit` 只作 normalize debug 標記，不直接決定對錯。
- `@behindyou 對` / `@behindyou 怎?` 在 parser 有啟動時會被 normalize；是否 correct/wrong 取決於 keyword/alias，但本案核心是 parser 未啟動。

### F. 為何 prompt 有痕跡，但 flow/answer gate 幾乎空

- `setConsonantPromptText()` 會寫 `consonant.promptText/promptCurrent`，但 reset 路徑並不保證同步清空這兩欄。
- 有效題目狀態看 `prompt.current`（尤其 `promptId`），不是看 `promptText` 字串是否還在。
- `answerGate.waiting=false`、`pendingQuestions.length=0`、`flow.*` 無等待，代表 engine 當下並未正式等待作答。

### G. pinned 與真正 answer target 是否一致

- preheat 的 `@<player> 嗨嗨...` 來自 `SandboxChatDirector`（聊天導演）。
- 子音題 `@<player> 請回覆本題子音（...บ）` 來自 `askSandboxConsonantNow`。
- 兩者來源不同；玩家回覆 preheat mention 不等於回覆有效 consonant prompt。

### H. debug / autoPinFreeze / freeze 是否中斷流程

- 依目前程式，autoPinFreeze/freeze 影響聊天節奏與 pin 顯示，但不會直接替代 consonant judge。
- `freeze.active=false`、`autoPinFreeze` 空值更支持「不是 freeze 卡住」，而是當下根本不在 answer gate。

## 4. Root Cause(s)

1. **RC-1（主要）**：玩家回覆發生在非 `WAIT_REPLY_* + prompt.current.consonant` 狀態，judge pipeline 條件未命中。  
2. **RC-2**：preheat mention 與 consonant 題目 prompt 不同源，造成使用者回覆 target 認知錯位。  
3. **RC-3（可觀測混淆）**：`consonant.promptText/promptCurrent` 可殘留，與 `prompt.current/flow/answerGate` 不同步，讓 debug 看起來像「有題但沒流程」。

## 5. Scope of Impact

- NIGHT_01 sandbox 任何「玩家把 preheat/direct mention 當成題目回覆」的情境都可能重現。  
- 影響體驗：玩家誤以為系統不判題，實際是回覆未對應到有效等待中的 answer target。

## 6. Recommended Fix Plan（P0 / P1 / P2）

### P0
- 在 debug 與 UI 明確區分「聊天 mention」vs「有效題目 prompt」：
  - 顯示 active answer target id（`prompt.current.promptId`）
  - 無 active prompt 時，輸入欄提示「目前非作答階段」。
- 在 `submitChat()` 補可觀測 guard：當 sandbox 非等待作答時，寫入 `judge_not_armed` debug marker（audit only建議）。

### P1
- 收斂 prompt 顯示來源：避免 preheat line 視覺上與題目 pin 樣式混淆。
- 在 `setConsonantPromptText` / reset 之間建立一致清理策略，避免殘留字串誤導。

### P2
- 自動化回歸檢查：
  1. 非 WAIT_REPLY 送出訊息不得寫 judge 欄位，但要有明確 reason。  
  2. WAIT_REPLY + valid prompt 時必須寫入 `lastInput/inputRaw`。  
  3. UI pinned target 與 `prompt.current.promptId` 必須可對照。

## 7. Guardrails / Regression Checklist

- [ ] `submitChat` 每次回覆都可在 debug 看見「judge armed / not armed」原因。  
- [ ] `prompt.current` 為 null 時，UI 不得呈現為可作答題目。  
- [ ] `consonant.promptText` 若僅為歷史字串，需有 stale 標記。  
- [ ] mention sanitize 只影響 render，不得影響 parser raw input 追蹤。  
- [ ] `WAIT_REPLY_*` 與 `answerGate.waiting` 必須一致。

## 8. File Map

- `src/app/App.tsx`
  - `submitChat()` / `dispatchChatMessage()` / `consumePlayerReply()` / `askSandboxConsonantNow()` / `canAskConsonantNow()`。
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - `setConsonantPromptText()` / `setCurrentPrompt()` / `commitConsonantJudgeResult()` / flow+answerGate state。
- `src/modes/sandbox_story/classicConsonantAdapter.ts`
  - `normalizeSandboxConsonantInput()` / `tryParseClassicConsonantAnswer()` / `judgeClassicConsonantAnswer()`。
- `src/sandbox/chat/chat_director.ts`
  - preheat `@<player> 嗨嗨，第一次看這台嗎？` 來源。
- `src/chat/tagFlow.ts`
  - 題目 tag/pin/freeze 交易流程。
- `src/ui/chat/ChatPanel.tsx`
  - `sanitizeMentions`（render 層）與 sandbox pinned 顯示。
- `src/ui/chat/ChatMessage.tsx`
  - mention highlight（視覺層）。
