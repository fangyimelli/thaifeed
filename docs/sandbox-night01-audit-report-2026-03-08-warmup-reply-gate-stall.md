# Sandbox NIGHT_01 Warmup Reply Gate Stall Audit（2026-03-08, AUDIT ONLY）

## 1. Executive Summary

- 本次問題主因不是「玩家訊息沒送出」，而是**相同文案的 preheat 導演台詞與正式 warmup gate 共存**，導致 UI 呈現看起來像暖場等待，但 flow 並未進入 `WARMUP_TAG_REPLY`。
- `@<player> 嗨嗨，第一次看這台嗎？` 目前有兩條來源：
  1) 正式 warmup pipeline（`askSandboxWarmupTagNow()`）
  2) preheat 導演台詞（`SandboxChatDirector.getNextDirectedLine()`）
- preheat 導演台詞會被 `autoPinFreeze(vip_direct_mention)` pin/freeze，視覺效果與正式 gate 高度相似；玩家回覆 `@behindyou 24` 會被當一般 free chat，**不會 consume warmup**。
- 結論：本案更接近 **gate 沒 armed（或 armed target 非該 pinned source）**，不是「armed 後 consume 格式失敗」。

---

## 2. Reproduction Path

1. 透過 `Debug -> Simulate Username Submit` 或正常進 sandbox 進入 `PREHEAT`。
2. 在 `PREHEAT` 5~25 秒內，`SandboxChatDirector` 可能吐出 `@player 嗨嗨，第一次看這台嗎？`。
3. 該訊息由 `dispatchChatMessage()` 命中 `vip_direct_mention`，觸發 `triggerSandboxAutoPinFreeze()`，造成 pinned + freeze。
4. 玩家送出 `@behindyou 24`，訊息會 append 成功。
5. `submitChat()` 內 `consumePlayerReply()` 讀到當前 step 非 `WARMUP_TAG_REPLY` 時，回傳 `false`，該訊息被視為 free chat。
6. 因未命中 warmup consume，後續 `WARMUP_NPC_ACK -> WARMUP_CHATTER -> TAG_PLAYER_1` 不會由此次 reply 觸發。

---

## 3. Data Trace

### A. 玩家暖場回覆是否成功送出並落地

- message object 由 `createPlayerMessage()` 建立：
  - `id = crypto.randomUUID()`
  - `username = activeUser`
  - `text = outgoingText`
  - `isSelf = true`
  - `language = zh`
- 送出來源：`dispatchChatMessage(..., { source: 'player_input', sourceTag: <submit/debug/fallback> })`。
- append 行為：`dispatch({ type: 'PLAYER_MESSAGE', payload: { ...message, createdAtMs, seq, source } })`，確實進 chat store。
- mention 資訊：`dispatchChatMessage()` 會 parse mention handles 並寫入 `mentions` user-id 陣列（若 handle 未註冊可能是空陣列）。

### B. submit pipeline 與字串重寫

- `submitChat()` 先做 lock rewrite：
  - `stripLeadingMentions()` 去除前綴 mention。
  - 若 lock target 存在且不是 self，輸出 `@lockTarget <stripped>`。
- `consumePlayerReply()` 使用 `outgoingText`（不是 raw input），並再次做 leading mention strip（Unicode regex）。

### C. warmup gate 實作存在性

- warmup steps 已存在：`TAG_PLAYER_WARMUP -> WARMUP_TAG_REPLY -> WARMUP_NPC_ACK -> WARMUP_CHATTER -> TAG_PLAYER_1`。
- `consumePlayerReply()` 有專門分支：僅在 `flow.step === 'WARMUP_TAG_REPLY'` 時，非空回覆即可 consume。
- consume 成功後會：
  - `setWarmupState(replyReceived/replyAt/normalizedReply)`
  - clear freeze + clear reply UI
  - `setFlowStep('WARMUP_NPC_ACK', 'warmup_reply_consumed')`

### D. pinned source 衝突（關鍵）

- 正式 warmup 問句來源：`askSandboxWarmupTagNow()`，sourceTag=`sandbox_warmup_tag_prompt`，並於成功後呼叫 `onIncomingTag()` + `sandboxFreezeAndWaitForReply(..., 'WARMUP_TAG_REPLY')`。
- 但 preheat 導演台詞也會發出**同句** `@player 嗨嗨，第一次看這台嗎？`。
- 該 preheat 訊息會觸發 `triggerSandboxAutoPinFreeze()`，它會建立 lock/pin/freeze，但**不會把 flow step 切到 `WARMUP_TAG_REPLY`**。

### E. 為何回覆未推進 flow

- 當玩家回覆時若 `flow.step !== 'WARMUP_TAG_REPLY'`：
  - warmup consume 分支不會執行。
  - 也不會進 `WAIT_REPLY_* + prompt.current.kind==='consonant'` judge consume。
  - 最終走 `sandbox_free_chat_sent`。
- 故現象是：訊息有送出、UI看得到，但 flow 不前進。

### F. 判定條件是否過嚴

- 針對**已 armed 的 warmup gate**，條件其實寬鬆：只要 strip mention 後非空即可。
- `@behindyou 24` 在 `WARMUP_TAG_REPLY` 理論上會被判定有效（strip 後 `24`）。
- 本案不屬於格式過嚴；是步驟/來源錯位。

### G. Debug / 可觀測性

目前 debug 已有：
- `sandbox.warmup.gateActive/replyReceived/judgeArmed`
- `sandbox.flow.step`
- `sandbox.autoPinFreeze.*`（含 `lastReason`, `pinnedReason`）

仍缺：
- 「當前 pinned 對應的 consume gate 類型」(warmup_gate / wait_reply / auto_pin_only)
- 「玩家最近一次 reply 被哪個 gate evaluate」與結果（consumed_by/free_chat/blocked_reason）

### H. Debug entry 路徑比對

- `Debug -> Simulate Username Submit` 與正式 username submit 共用 `bootstrapAfterUsernameSubmit() -> onSandboxJoin()`，主幹一致。
- 問題點不在 debug entry 初始化函式本身，而在 PREHEAT 階段導演台詞可提前發出與正式 warmup 同文案 tag，導致誤判。

---

## 4. Root Cause(s)

1. **雙來源同文案衝突（主要）**
   - preheat directed line 與 warmup gate prompt 文案相同，且前者也會觸發 pin/freeze，UI 體感等同「正在等暖場回覆」。
2. **consume 綁定 flow step，不綁定 pinned UI**
   - `consumePlayerReply()` 只看 `flow.step`，不看 pinned 來源；故 UI 等待態與 flow 等待態可能脫鉤。
3. **legacy autoPinFreeze 與新 warmup gate 並存**
   - 都會 pin/freeze + lock，但只有 warmup gate 會推動 `WARMUP_*` 轉移。

---

## 5. Scope of Impact

- 影響 sandbox NIGHT_01 開場與任何會觸發 `vip_direct_mention` 的情境。
- classic mode 無直接影響。
- 影響層：`chat_director`（台詞來源）/ `App.dispatch autoPinFreeze`（UI pin/freeze）/ `submit->consume`（flow consume）。

---

## 6. Recommended Fix Plan

### P0
- 讓 preheat directed mention 與 warmup gate 文案/語義不可混淆（移除重句或改成非提問句）。
- 在 debug 面板明確顯示 pinned source type 與 consume target type，避免誤判為 warmup waiting。

### P1
- `submitChat` 後新增 consume trace：`lastReplyEval = {flowStep, gateType, consumed, reason, messageId}`。
- autoPinFreeze 建立 pin 時，不應偽裝成回覆 gate（可保留 highlight/freeze，但不要與 reply gate 同 source channel）。

### P2
- 收斂 reply gate：建立單一 gate registry（armedBy/sourceMessageId/targetActor/consumePolicy），由 UI 與 consume 共用，避免雙軌。

---

## 7. Guardrails / Regression Checklist

- [ ] PREHEAT 任意 VIP mention 不可被 debug/玩家誤認為 warmup gate（可觀測欄位可辨識）。
- [ ] 只有 `flow.step==='WARMUP_TAG_REPLY'` 時，`@behindyou 24` consume -> `WARMUP_NPC_ACK`。
- [ ] `WARMUP_NPC_ACK` 後固定進 `WARMUP_CHATTER`，2~4 句後進 `TAG_PLAYER_1`。
- [ ] pinned UI 必須標示 source（warmup_prompt / auto_pin_freeze / qna）。
- [ ] `submitChat` trace 可回放每次 reply 是否被 consume 與原因。

---

## 8. File Map

- `src/app/App.tsx`
  - `submitChat()` / `consumePlayerReply()` / `askSandboxWarmupTagNow()`
  - `dispatchChatMessage()` auto pin freeze 判斷
  - `triggerSandboxAutoPinFreeze()`
  - `bootstrapAfterUsernameSubmit()`
- `src/modes/sandbox_story/sandboxStoryMode.ts`
  - flow step SSOT / `onIncomingTag()` / warmup state
- `src/sandbox/chat/chat_director.ts`
  - PREHEAT directed line（與 warmup 同句）
- `src/sandbox/chat/chat_engine.ts`
  - director line emission & wait-reply scheduler pause set
- `src/chat/tagFlow.ts`
  - tag append->pin->freeze transaction
- `src/ui/chat/ChatPanel.tsx` / `src/ui/chat/ChatMessage.tsx`
  - sanitize/mention render 與 pinned/reply preview 渲染分層
- `src/core/systems/chatSystem.ts`
  - player message schema (`id/text/username/isSelf`)
