# Sandbox NIGHT_01 Audit Report（2026-03-06, AUDIT ONLY）

> 任務模式：audit-only。未修改任何 runtime code，僅追查送出/mention/parser/judge/prompt/flow 全鏈路。

## 1. Executive Summary

- 這次卡關不是「玩家答錯」主因，而是**sandbox consonant judge pipeline 根本沒被呼叫**。`submitChat()` 送出後只會執行 `consumePlayerReply()`（處理 WAIT_REPLY_1/2/3 或 classic qna），接著呼叫 `modeRef.current.onPlayerReply(outgoingText)`；但 sandbox mode 的 `onPlayerReply()` 目前僅 `syncFear()`，不做 parse/judge。結果是 `consonant.judge.lastInput`、`parse.inputRaw` 會維持空值。  
- `@behindyou 2jo` 有成功建立並 dispatch 成玩家訊息（`createPlayerMessage(outgoingText, activeUserHandle)`），不是送出失敗；中斷點在 **dispatch 之後、judge 之前**。  
- prompt 顯示來源有雙軌：`askSandboxConsonantNow()` 先建了 `prompt.current` 與 `consonant.promptText`，但實際 pinned 顯示卻用了 `line=@<player> 看到了嗎？先回我`（`runTagStartFlow(... pinnedText: line ...)`），不是真正要判題的子音 prompt。UI target 與 judge target 天然不一致。  
- `2jo` 對本題 `บ` 在 classic adapter 規則下本來就不合法（alias 只吃 `a/1/b/2/c/3` 或 keyword 命中）；但目前連 parser 都沒進，所以不能把本案歸類為「答錯導致沒推進」。

---

## 2. Reproduction Path

1. sandbox 進入 quiz loop 後，`askSandboxConsonantNow()` 建立當前 prompt：
   - `setConsonantPromptText("@<user> 請回覆本題子音（直接輸入：บ）...")`
   - `setCurrentPrompt({ kind:'consonant', consonant:'บ', ... })`
2. 同函式接著用 `runTagStartFlow()` 發出 tag 訊息，且 `pinnedText` 傳的是 `@<player> 看到了嗎？先回我`（不是子音題目本身）。
3. 玩家送出 `@behindyou 2jo`：
   - `submitChat()` 建立 player message 並 `dispatchChatMessage(...)`
   - 之後執行 `consumePlayerReply(outgoingText)`。
4. 若 flow 是 `WAIT_REPLY_1/2/3`，`consumePlayerReply` 直接切步、清 gate，不會 parse consonant。
5. `modeRef.current.onPlayerReply(outgoingText)` 在 sandbox 僅 `syncFear()`，未做 judge。
6. 因此 debug 會看到 parse/judge 欄位維持預設（空/none），流程是否前進只取決於 WAIT_REPLY step 切換，而非子音判題。

---

## 3. Data Trace

### A. 為什麼玩家送了訊息但 judge 沒吃到

1) 實際 message object
- `submitChat()` 送出的是 `dispatchChatMessage(createPlayerMessage(outgoingText, activeUserHandle), {source:'player_input'})`。
- `outgoingText` 在 lock 情境只做 mention rewrite（`@lockTarget + stripLeadingMentions(raw)`），不做子音 parser。

2) 是否進入 answer/judge pipeline
- 只進到 `consumePlayerReply(outgoingText)` + `mode.onPlayerReply(outgoingText)`。
- `consumePlayerReply` 只處理：
  - sandbox `WAIT_REPLY_1/2/3` 的步驟轉移
  - classic qna `parsePlayerReplyToOption`
- sandbox consonant parse/judge（`commitConsonantJudgeResult`）沒有任何 call site。

3) 為何 `lastInput`/`inputRaw` 空
- `commitConsonantJudgeResult` 是唯一會寫 `state.consonant.parse.*` / `state.consonant.judge.lastInput` 的入口；未被呼叫即保持預設值。

4) mention 前綴是否主因
- 本案主因不是 mention；即使無 mention，parser 也不會跑（因為整段 judge pipeline 未接線）。
- mention 只在 send rewrite 與 message mention mapping 使用。

5) `2jo` 是不合法還是沒進 parser
- 兩者同時成立：
  - 規則上它不在 `บ` 的 alias/keyword 可接受集合
  - 但這次更根本是 parser 未執行

6) 中斷點
- `submitChat -> dispatchChatMessage` 成功
- 中斷於 `consumePlayerReply/onPlayerReply` 之後，未接 `parseAndJudgeUsingClassic -> commitConsonantJudgeResult`

### B. 為何 prompt state 有值但 flow state 顯示空

- 在正常 sandbox mode，`flow.step/scheduler.phase/storyPhaseGate` 不應該是 `-`；debug 顯示 `-` 代表當次 UI 讀到的 debug 物件沒有被 sandbox tick 寫入（常見於非 sandbox mode、或 debug 來源已被覆寫/不是同一個 state 快照）。
- `consonant.prompt.current` 是由 `setConsonantPromptText()` 直接寫 state，可獨立存在；它不代表 flow machine 已在等待判題。
- 因此會出現「有 prompt 文案，但 flow/scheduler 幾乎空」的觀感：
  - 文案層（promptText/pinned UI）可先出現
  - 真正 flow waiting/judge 可能未建立或已被清掉

### C. pinned prompt 與 answer target 不一致

- 實作上已證實兩個來源：
  - 判題題目：`getClassicConsonantPrompt(...)` 產生 `請回覆本題子音（...บ）`
  - pinned 顯示：`runTagStartFlow(... pinnedText: line)`，`line` 是 `嗨嗨/先回我` 對話句
- 玩家看到 pinned `@21 嗨嗨...`，容易回覆聊天 target（`@behindyou 2jo`），不是明確的子音作答 target。

### D. mention 前綴是否阻斷答案解析

- pipeline 順序（實際有跑的）：
  1. `submitChat` 可能做 `stripLeadingMentions`（僅 lock rewrite 用）
  2. `dispatchChatMessage` 用 `parseMentionHandles` 寫 `message.mentions`
  3. `ChatPanel` render 時 `sanitizeMentions`（只影響顯示）
- sandbox consonant parser 並沒有在這條送出路徑被呼叫，所以不存在「mention 被 parser 判 invalid」的實際執行證據；答案遺失發生在 parser 前（未接線）。

### E. `2jo` 對 `บ` 是否本來不合法

- 規則追查（classic adapter）：
  - `tryParseClassicConsonantAnswer` 允許：
    - keyword 命中（`ctx.node.correctKeywords`）
    - option alias `a/1/b/2/c/3`（精確等於）
  - `2jo` 不等於 alias token（`2` 可，但 `2jo` 不可），也不會命中 `บ` 的 keyword。
- `allowedSetsHit` 全 false 的情況在這次其實是「parse 結果根本未寫入」造成的預設值，不是 normalize 真正算出的最終值。

### F. 為何 answer gate / pendingQuestions / flow 未等待

- `answerGate.waiting` 在 `onIncomingTag()` 進 WAIT_REPLY 會設 true，但 `consumePlayerReply()` 收到任何玩家回覆就會立刻設 false 並切到下一步。
- 這個 WAIT_REPLY 機制是「等玩家回覆一則」而非「等子音 judge 正確」；所以 pending queue 與 parser/judge 狀態可脫鉤。
- `pendingQuestions` 主要在 `resolveTagPlayerPhase(result)` 的 miss/revisit 邏輯更新，不在 ask/consonant send 當下自動 enqueue。

### G. NIGHT_01 engine 是否沒跑

- engine 有在跑（`askSandboxConsonantNow`、`setFlowStep`、chat engine context/tick 都存在）。
- 但回答判定不是由 NIGHT_01 consonant judge 驅動，而是由 WAIT_REPLY step 消費回覆字串直接推進；導致看起來像「有題目、無判題機器」。
- 可定義為：UI prompt writer 與 story answer engine 部分脫鉤。

### H. debug / isolated tag lock / autoPinFreeze 是否造成中斷

- 這次主要斷點不是 freeze/autoPin；`freeze.active=false` 只代表當下沒凍結。
- 真正根因仍是 judge pipeline 未接線 + pinned 文案來源與有效 prompt 不一致。
- autoPin/debug 會增加「畫面看起來像在問別題」的混淆，但不是 `lastInput='-'` 的直接原因。

---

## 4. Root Cause(s)

1. **RC-1（主因）**：sandbox player reply path 未接到 consonant parse/judge。
2. **RC-2**：`askSandboxConsonantNow` 將 pinned text 設為聊天句，不是有效判題 prompt。
3. **RC-3**：WAIT_REPLY step 的消費邏輯以「收到回覆」為完成條件，未與子音判題綁定。
4. **RC-4（觀測混淆）**：debug 顯示欄位同時混有 prompt 文案與 flow state，當 state 寫入來源不同步時會呈現「有題無流程」。

---

## 5. Scope of Impact

- NIGHT_01 sandbox 所有 consonant 題都可能出現「送出後不判題」或「流程靠 step 轉移而非判題」問題。
- 玩家體驗層面會誤判成：
  - 我是不是答錯了？
  - 或系統沒收到？
- 實際是系統收到訊息，但 judge 未執行，且 UI pinned target 可能誤導。

---

## 6. Recommended Fix Plan（P0 / P1 / P2）

### P0
- 將 sandbox `onPlayerReply()` 或 `submitChat()` sandbox 分支接上統一判題入口：
  `parseAndJudgeUsingClassic -> commitConsonantJudgeResult -> applyCorrect/hint/blockedReason`。
- 把 WAIT_REPLY 消費條件從「任意回覆」改為「完成判題分支（correct/unknown/wrong/pass）」。
- pinned 文案改為與 `prompt.current.pinnedText` 同源，不再使用 `line=先回我` 覆蓋。

### P1
- 建立單一 `answer target id`（promptId/messageId）並在 debug 顯示：
  - pinned source
  - prompt source
  - judge source
  三者必須一致。

### P2
- 增加回歸測試：
  1. `@behindyou 2jo` 會進 parser（即使 wrong）
  2. `consonant.judge.lastInput` 不得為 `-`
  3. pinned 與 prompt 文字來源一致
  4. flow step 不得在未判題時直接當作答完成

---

## 7. Guardrails / Regression Checklist

- [ ] 玩家每次送出在 sandbox 題目期間都必須觸發 parser（至少寫入 `parse.inputRaw`）。
- [ ] `consonant.judge.lastInput` 與玩家送出文字一致（含 mention 前綴處理規格）。
- [ ] `prompt.current.pinnedText` 與 UI pinned 顯示文案同源。
- [ ] WAIT_REPLY 不得僅依「收到任何字串」就完成題目。
- [ ] `allowedSetsHit` 若全 false，需可區分是「真 normalize 結果」還是「parser 未啟動」。
- [ ] debug panel 必須能顯示 `submit -> parser -> judge` 是否每段都執行。

---

## 8. File Map

- `src/app/App.tsx`
  - `submitChat()`（送出主管線）
  - `consumePlayerReply()`（目前只吃 WAIT_REPLY/classic qna）
  - `askSandboxConsonantNow()`（建立 prompt + tag flow + pinned）
  - `parseMentionHandles` / dispatch mention mapping / debug 寫入
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - `onPlayerReply()`（目前未判題）
  - `commitConsonantJudgeResult()`（存在但無 caller）
  - `setConsonantPromptText` / `setCurrentPrompt` / flow+scheduler 狀態
- `src/modes/sandbox_story/classicConsonantAdapter.ts`
  - `tryParseClassicConsonantAnswer` / `judgeClassicConsonantAnswer`（`2jo` 規則）
- `src/chat/tagFlow.ts`
  - `runTagStartFlow`（append->pin->freeze）
- `src/game/qna/qnaEngine.ts`
  - `markQnaQuestionCommitted` 與 `AWAITING_REPLY` 狀態語意
- `src/sandbox/chat/chat_engine.ts` / `src/sandbox/chat/chat_director.ts`
  - preheat 導演台詞與非判題聊天來源
- `src/ui/chat/ChatPanel.tsx` / `src/ui/chat/ChatMessage.tsx`
  - mention sanitize/render 與 pinned/reply 顯示層
