## 2026-03-06 Sandbox pinned reply body 為空修復（sandbox only）

### 1) Root cause
- `triggerSandboxAutoPinFreeze()` 在 message append 前就被呼叫，且只靠 `state.messages.find(messageId)` 取 source message。
- 在該時序下可能抓不到訊息，`text` 變成空字串，導致 pinned UI 顯示 `「」`。

### 2) 修改檔案
- `src/app/App.tsx`
- `src/ui/chat/ChatPanel.tsx`
- `README.md`
- `docs/10-change-log.md`
- `docs/sandbox-flow-table.md`
- `PR_NOTES.md`

### 3) pinned text mapping 修正方式
- 在 auto pin 觸發點直接傳入 `sourceMessage: message`，確保同 tick 取得原訊息。
- pinned body 解析順序：`text -> content -> body -> displayText -> payload.text`，並對候選值 `trim()` 後取第一個非空字串。
- render 時改為直接顯示 body（非 `「${body}」`）；若 body 空，顯示 `（原始訊息已不存在）`。

### 4) 驗證結果
- VIP direct mention：pinned 顯示完整 `@ne 嗨嗨，第一次看這台嗎？`。
- pinned reply 不再只顯示 reason。
- pinned reply 不再出現 `「」`。
- classic mode 未受影響。

## 2026-03-06 Sandbox：Pinned reply schema/formatter/component parity（sandbox only）

### 本次修正重點
- sandbox pinned schema 對齊 Classic reply pin。
- sandbox pinned formatter 對齊 Classic（`↳ @author` + full body）。
- sandbox pinned component 對齊 Classic 呈現，不再顯示 internal metadata。
- sandbox pinned pipeline 與 lifecycle 對齊 Classic（建立 / 顯示 / 清除）。

### Sandbox vs Classic pinned pipeline 差異（修正後）
1. **Message schema**
   - Classic：以 chat message + `questionMessageId` 對應 reply pin。
   - Sandbox：auto pin 建立 `sandboxPinnedEntry(messageId/author/body)`，並透過 messageId 回指原訊息。
2. **Pinned entry schema**
   - 修正前：含 `reason/sourceEventType/metadata`。
   - 修正後：收斂為 Classic 同語意欄位 `id/messageId/createdAt/expiresAt/visible/author/body`。
3. **Pinned creation**
   - VIP direct mention / GHOST_HINT follow-up：同一 auto pin route 建立 pin，並同步 freeze。
4. **Pinned formatter/component**
   - 改為 Classic 同格式（不顯示 reason、不截斷 body）。
5. **Pinned clear lifecycle**
   - 沿用 `clearReplyUi` + timeout/expiresAt，自動解除 pin/freeze。

### 驗證
1. VIP direct mention：highlight + pinned + freeze（PASS）
2. GHOST_HINT_EVENT follow-up：pinned + freeze（PASS）
3. sandbox pinned 與 Classic 外觀一致（PASS）
4. Classic Mode 完全不受影響（PASS）


## 2026-03-06 Sandbox：VIP direct mention + GHOST_HINT follow-up 節奏修復（sandbox only）

### root cause
- sandbox 只有既有 `runTagStartFlow`（題目提問）會走 pinned/freeze，chat engine 的 VIP 訊息（即使 `@玩家`）未進入這條 pipeline。
- `[GHOST_HINT_EVENT]` 佇列缺少 VIP story-critical follow-up，導致事件後常被 casual crowd 稀釋。

### 修改策略
- 在 sandbox `dispatchChatMessage` 新增 direct interaction routing：`VIP + @activePlayer` 命中 `vip_direct_mention` 規則，觸發 auto pin+freeze。
- 在 `chat_engine` 的 ghost hint queue 強制插入 VIP follow-up，並標記 `chatType=sandbox_story_critical_hint_followup` 供 App routing。
- 以單一路徑整合 pin/freeze（沿用既有 reply pin UI 與 freeze state），避免雙軌 UI。

### 影響範圍
- `src/sandbox/chat/chat_engine.ts`
- `src/app/App.tsx`
- `src/core/state/types.ts`
- `README.md`
- `docs/10-change-log.md`
- `docs/sandbox-flow-table.md`

### 驗證情境
1. VIP 直接 `@玩家`：應 pin + freeze（PASS）
2. 一般 VIP 閒聊：不應 pin（PASS）
3. `GHOST_HINT_EVENT` 後 VIP 主線接續：應 pin + freeze（PASS）
4. freeze timeout 後聊天室恢復（PASS）
5. sandbox 其餘流程（WAIT_REPLY / tag flow）維持可運作（PASS）
6. classic mode 無影響（PASS）

### 是否有移除/整合舊邏輯
- 整合：將 sandbox chat engine 輸出納入既有 pinned/freeze 路徑（非另開 UI）。
- 移除：無額外刪除；以 routing 補強避免舊行為分裂。

### 尚未處理但相關風險點
- 目前 `focus/spotlight` 無獨立 state machine，本次以 freeze + pinned 強化節奏；若後續要做視覺 spotlight，建議新增明確 state 與 timeout guard。

## SSOT / debug 欄位變更紀錄（本次）
- 新增 `sandbox.audit.autoPinFreeze`：
  - `lastMessageId/lastReason/freezeMs/freezeUntil/freezeRemainingMs`
  - `lastHintFollowUpEvent`
  - `evaluation.{directToPlayer,hitVipDirectMentionRule,hitStoryCriticalRule,shouldPin,failureReason,pinnedReason,freezeReason}`
- 新增 message schema 欄位：`hintEventName`（sandbox hint follow-up 追蹤）。


## 2026-03-06 Sandbox Flow SSOT Hardening (sandbox only)

### Scope
- 僅修改 sandbox 相關程式碼與文件。
- classic mode 未修改。

### Validation Checklist
1. PREHEAT 30 秒內不會出現 final fear / ending pressure：**PASS**（PREHEAT final_fear 權重=0）。
2. TAG_PLAYER_1 只出 1 則，然後立刻 freeze：**PASS**（`tagAskedThisStep` guard + wait freeze helper）。
3. TAG_PLAYER_2 只出 1 則，然後立刻 freeze：**PASS**（同上）。
4. TAG_PLAYER_3 只出 1 則，然後立刻 freeze：**PASS**（同上）。
5. 任一 WAIT_REPLY_* 期間聊天室完全 0 output：**PASS**（reply-to active 全域 freeze + scheduler pause）。
6. TAG#1 回覆後固定「短討論 -> VIP summary -> TAG#2」：**PASS**（`CROWD_REACT_WORD -> VIP_SUMMARY_1 -> TAG_PLAYER_2_PRONOUNCE`）。
7. TAG#2 回覆後固定「短討論 -> VIP summary -> TAG#3」：**PASS**（`DISCUSS_PRONOUNCE -> VIP_SUMMARY_2 -> TAG_PLAYER_3_MEANING`）。
8. 只有 WAIT_REPLY_3 會累積 tech backlog：**PASS**。
9. 回覆 TAG#3 後才 flush tech backlog（<=8）：**PASS**（最後一則為分鐘數格式）。
10. classic mode 未修改：**PASS**。

### Notes
- sandbox-flow-table 已同步更新。
- README / docs/10-change-log.md 已同步更新。



## 2026-03-06 Patch Request：Sandbox Audit 三項修補（reply preview / WAIT_REPLY scheduler / ADVANCE_NEXT dedupe）

### 變更摘要（sandbox only）
- `ChatPanel` reply preview 查找改為 full message list（仍保留最後 100 則 render optimization）。
- `chat_engine` 在 `WAIT_REPLY_1/2/3` 期間改為真正 pause scheduler（timer clear + stop scheduling）；離開 WAIT_REPLY 後 resume。
- `App.tsx` 在 `ADVANCE_NEXT` 移除外層重複 `setFlowStep('TAG_PLAYER_1')`，由 `forceAdvanceNode()` 單一來源管理 step transition。
- classic mode 未修改。

### 驗收
1. reply preview：原訊息在 state 仍存在時可正確顯示，不再誤報不存在。
2. WAIT_REPLY：期間無 `scheduleNext()` 持續排程。
3. flow transition：不再出現 `ADVANCE_NEXT -> TAG_PLAYER_1` 雙重寫入。
4. classic mode smoke：行為不變。

## 2026-03-06 — Sandbox pinned reply root-cause fix（VIP direct mention highlighted but not pinned）

### root cause
- 直接提及（VIP + @玩家）雖命中 auto pin/freeze 判定，但 pinned 寫入實際仍經過 `setPinnedQuestionMessage()` writer guard。
- 該 guard 原本只允許 `sandboxPromptCoordinator`，導致 auto pin 路徑被擋（`writerNotAllowed/phaseBusy`），形成「highlight 有、pinned 區塊無」的錯位。

### 修改策略
1. 保留舊 highlight/freeze 行為（仍必要），補上獨立 sandbox pinned entry model（最小資料結構）。
2. 打通 auto pin writer path（允許 `autoPinFreeze` source）。
3. 在 ChatPanel 掛載 sandbox 專用 pinned 區塊，不再依賴 qna AWAITING_REPLY 才顯示。
4. 補齊 debug 可觀測欄位，能定位 pinned 掉在哪個階段（判定、寫入、渲染、cleanup、覆寫）。

### 影響範圍
- `src/app/App.tsx`：sandbox pin state / auto pin pipeline / debug。
- `src/ui/chat/ChatPanel.tsx`：sandbox pinned 區塊 render。
- `src/styles.css`：sandbox pinned 樣式與層級。
- 文件：`README.md`、`docs/10-change-log.md`、`docs/sandbox-flow-table.md`。
- **classic mode 無改動。**

### 驗證情境
1. VIP 一般聊天：不 pin。
2. VIP direct mention：message highlight + pinned 區塊 + freeze。
3. GHOST_HINT_EVENT follow-up：story-critical pinned + freeze。
4. pinned 非瞬間消失（有 expiresAt/remaining）。
5. 到期後 pinned 正常清除。

### 是否有移除/整合舊邏輯
- 整合：保留舊 highlight/freeze。
- 淘汰：不再以 qna reply preview 充當 sandbox direct mention 的 pinned 呈現。

### 尚未處理但相關風險點
- 目前 sandbox pinned 與 qna reply pin 仍並存兩條 UI（語義不同）；後續可評估抽象單一 pin presenter 以降低認知成本。

## 2026-03-06 Patch Request：Sandbox join 後先 PREHEAT（移除 join 即時強制回覆）

### 變更摘要（sandbox only）
- 調整 Step：`PREJOIN`、`PREHEAT`。
- 刪除流程：移除「玩家一 join 就立刻發 tag + 綁定 reply-to + freeze」的舊邏輯。
- 整合流程：join 後改為先清理 reply/freeze 狀態，直接進 30 秒 `PREHEAT`，保留既有 `TAG_PLAYER_1 -> WAIT_REPLY_* -> ...` 主流程。
- `reply-to` 規格不變：仍沿用 classic reply-to UI，且 active 時 0 output。
- `tech backlog` 規格不變：仍只允許 `WAIT_REPLY_3` 累積、`FLUSH_TECH_BACKLOG` 一次 flush。
- classic mode 未修改。

### Sandbox Flow Table 變更說明
- 影響 Step：`PREJOIN`、`PREHEAT`（描述與訊息範例同步更新）。
- 新增 Step：無。
- 刪除 Step：無。
- Message Examples：有更新（含 PREJOIN 無訊息、PREHEAT 寒暄示例，並補齊各 step 範例）。

### 驗證（Debug Consistency Rule）
1. flow step 與 `docs/sandbox-flow-table.md` 一致：PASS。
2. reply-to 行為符合表格規格（active 時 0 output）：PASS。
3. tech backlog 僅在 `WAIT_REPLY_3` 出現：PASS。
4. classic mode smoke 行為未改：PASS。

## Summary
- 新增 `src/sandbox/chat/chat_director.ts`，以 Director 作為 sandbox chat 的唯一節奏來源（mode / directed line / pool weights / shouldEmitJoin）。
- `src/sandbox/chat/chat_engine.ts` 改為 Director 驅動，並落實 freeze 0 output 與 glitch burst 優先邏輯。
- PREHEAT 改為「軟編排保證 + 隨機填充」：保證 VIP 出場、保證一次 VIP `@玩家`，其餘走隨機池。
- `src/app/App.tsx` 同步傳入 `flow.step + stepStartedAt` 至 chat engine，且 preheat join 改用 Director 判斷。
- `src/modes/sandbox_story/sandboxStoryMode.ts` 強化 30 秒 gate：force ask API 在 PREHEAT 不可越權出題。
- classic mode 未修改。

## SSOT / Debug 欄位變更紀錄
- SSOT：sandbox chat orchestration 收斂到 Director（避免 engine / app 多點決策衝突）。
- debug：沿用 `sandbox.flow.*`, `sandbox.freeze`, `sandbox.glitchBurst`；無新增破壞性欄位。

---

## Summary
- 新增 sandbox VIP 身份 SSOT `src/sandbox/chat/vip_identity.ts`，固定唯一 VIP 為 `👑 behindyou`（`id=sandbox_vip_behindyou`、`role=vip`、`badge=crown`）。
- 新增 sandbox 固定暖場腳本 `PREHEAT_SCRIPT`（12 條、0~20 秒），不再依賴隨機池決定開場戲。
- sandbox chat engine 在 `PREHEAT` 階段改為按時間逐條派發固定序列（每條只發一次），腳本播完後才回到 `casual/observation` 隨機聊天。
- 固定序列保證包含：`👑 behindyou` 主動 `@玩家`、VIP 熟客台詞、觀眾與 `@behindyou` 接話、以及「我覺得應該是假的吧」質疑句。
- 前 30 秒維持硬 gate：禁止出題、禁止子音 overlay；30 秒到點後才允許第一題子音。
- sandbox 初始化與 context 持續使用 `state.player.handle`（fallback `000`）做 `{{PLAYER}}` 替換，玩家不需先發言即可被 VIP @。
- **classic mode 未修改**。

## Debug 欄位變更紀錄
- 本次沿用既有 debug 欄位進行驗收：
  - `sandbox.introGate.startedAt/minDurationMs/passed/remainingMs`
  - `sandbox.player.handle`
  - `sandbox.prompt.overlay.consonantShown`
- 補充：preheat 固定序列為 chat engine 內部 cursor 控制（`preheatScriptCursor`），不新增外部 debug schema，避免破壞既有面板相容性。

## 2026-03-06（sandbox only：audit debug fields + emit spam detection）

### Changed
- [sandbox/debug] 新增 audit debug 欄位並輸出到 debug 面板：
  - `introGate.startedAt/minDurationMs/passed`
  - `flow.step + stepEnteredAt + questionIndex`
  - `freeze.frozen/reason/frozenAt`
  - `glitchBurst.pending/remaining`
  - `tagAskedThisStep + askedAt`
  - `lastEmitKey + lastSpeaker`
  - `recentEmitKeys`（ring buffer 20）
  - `transitions`（ring buffer 20）
  - `thaiViewer.lastUsedField/count`
- [sandbox/chat] `chat_engine` 新增 audit 記錄，不阻擋 emit：
  - 同 key 連續 >2：`duplicateSpamCount++`
  - 同 speaker 連續 >3：`speakerSpamCount++`
  - `WAIT_PLAYER_*` 且 freeze 期間仍有 emit：`freezeLeakCount++`

### Scope Guard
- 只改 sandbox，classic 無變更。

## 驗收步驟
1. 進 sandbox 後觀察 0~20 秒：一定出現 VIP 主動 `@玩家` 打招呼。
2. 同一段預熱內可見 2~3 則觀眾和 VIP 互動，且至少 1 則質疑「我覺得應該是假的吧」。
3. 0~30 秒確認沒有子音題問句，debug `sandbox.prompt.overlay.consonantShown` 維持空字串。
4. 30 秒到點後才會進 `ASK_CONSONANT` 並顯示第一題子音。
5. classic mode 跑一般流程，行為不變。


## 2026-03-06 Patch Request：Sandbox 最小修補（P0/P1）

### 變更摘要
- 新增 freeze 外層總閘（dispatch 前）：WAIT_PLAYER_* 期間除了 glitch burst 之外全面禁發。
- `san_idle` 在 engine 內部分流為 general/glitch，避免一般時段污染 glitch 語氣。
- anti-spam guard 改為硬阻擋（非僅記錄）：emitKey cooldown / speaker run / tag_player 重入擋。
- `ASK_PLAYER_MEANING` 問句改為 once-per-step（成功送出即標記 `tagAskedThisStep=true`）。
- 修正 `WORD_RIOT` 第二題卡死：wave lock 每題離開必 reset，且僅保留 timer 單一路徑推進到 `VIP_TRANSLATE`。
- force/debug ask 入口統一走 `canAskConsonantNow()`（intro gate + step 合法性）。
- classic mode 未修改。

### 驗收步驟（必測）
1. WAIT_PLAYER_CONSONANT / WAIT_PLAYER_MEANING 期間觀察聊天室：非 glitch 訊息 0 output。
2. 一般時段連跑：不出現「回個1/lag/送不出去/聊天室卡住」等 glitch 口吻。
3. 連續重入 ASK_PLAYER_MEANING：tag 問句仍為 once-per-step，不洗版。
4. 玩家回覆後才看到 glitch burst，且約 10 則後才繼續流程。
5. 連跑至少 3 題：第 2 題後仍能顯示 REVEAL_WORD，不會卡在 WORD_RIOT。
6. classic mode smoke run：行為不變。

### 修復證據（debug 欄位）
- `sandbox.flow.step/stepStartedAt/questionIndex`
- `sandbox.freeze.frozen/reason`
- `sandbox.glitchBurst.pending/remaining`
- `sandbox.audit.flow.tagAskedThisStep`
- `sandbox.audit.emit.lastEmitKey/recentEmitKeys`
- `sandbox.audit.transitions`（最近 20 筆）
- `sandbox.introGate.startedAt/passed/remainingMs`

## 2026-03-06 Patch Request：Sandbox 沿用 classic reply-to + 強制回覆 gate + Riot 上限

### 變更摘要（sandbox only）
- `WAIT_PLAYER_CONSONANT`：詢問訊息改為 commit `questionMessageId`，沿用 classic reply-to bar 顯示。
- `WAIT_PLAYER_MEANING`：改為同樣走 `runTagStartFlow`（append→scroll→pin→freeze），用同一個 reply-to render path。
- 新增 sandbox forced-reply dispatch gate：只要 reply-to active，非玩家訊息全阻擋（0 output）。
- 玩家回覆後才 clear reply-to / unfreeze，再進 `GLITCH_BURST_AFTER_*`。
- `WORD_RIOT` 固定最多 5 則，並加入 step token 防止跨 step timer 誤推進。
- classic mode 未修改。

### 驗收步驟（必測）
1. 進 sandbox，觸發 `WAIT_PLAYER_CONSONANT`：
   - 輸入框上方看到 classic 同款回覆條（speaker + 摘要）。
   - 回覆條存在期間聊天室完全不再出新訊息（0 output）。
2. 驗證回覆條不可取消：
   - 不出現 X / Cancel / 取消回覆。
   - 只能送出一則訊息解除。
3. 送出回覆後，流程順序：
   - `glitch burst≈10 -> REVEAL_WORD -> WORD_RIOT(<=5) -> VIP_TRANSLATE -> MEANING_GUESS -> 再建立 reply-to -> 再 freeze`。
4. 連跑至少 3 題：確認第 2 題後仍會正常顯示單字、不會卡在 WORD_RIOT。
5. classic smoke：切回 classic 跑一般答題，行為不變。

### debug 欄位（觀測建議）
- `ui.replyBarVisible`
- `ui.replyToMessageId`
- `event.qna.active.status`
- `sandbox.flow.step / sandbox.flow.stepStartedAt`
- `sandbox.freeze.frozen/reason`
- `chat.lastBlockedSendAttempt.blockedReason`（期待可見 `sandbox_forced_reply_gate_active`）
- `sandbox.lastWave.count`（WORD_RIOT 期望 5）


## 2026-03-06 Patch Request：Join 前 0 output + Join 後未發言可被 @ + classic reply-to 強制 gate（sandbox only）

### 變更摘要（sandbox only）
- 新增 `PREJOIN` 與 `joinGate`，sandbox 初始化為 `joinGate.satisfied=false`、`player=null`、flow 停在 `PREJOIN`。
- 新增 `onSandboxJoin(name)`：提交名稱即 sanitize 並立即建立 `player.id/player.handle`，同步寫入 active user（不再依賴玩家第一則訊息）。
- join 完成後立刻由 VIP 發一則 `@玩家` 訊息，並用 classic 既有 reply-to path（`runTagStartFlow` + `ChatPanel.replyPinBar`）鎖定回覆。
- 新增 sandbox 單一輸出總閘 `canSandboxEmitChat()`：
  1) joinGate 未滿足 => 0 output
  2) reply-to active => 0 output
  3) 其他照既有 freeze/glitch 規則
- 玩家回覆後才解除 reply-to/freeze，PREHEAT 才開始正常跑。
- classic mode 未修改。

### 驗收步驟（可重現）
1. 進入 sandbox，不提交名稱：聊天室應維持 0 output（完全不動）。
2. 提交名稱（尚未送任何聊天）：立即可見 VIP/mod `@玩家` 訊息（有 messageId，出現在聊天列表）。
3. 同步出現 classic reply-to 回覆條（不可取消）；此時聊天室維持 0 output。
4. 玩家送出一則非空回覆：reply-to 條消失，聊天室才開始 PREHEAT 正常節奏。
5. 驗證根治：玩家 handle 建立時機在 join，不再依賴第一則玩家聊天訊息。
6. 驗證 classic mode 未修改（行為不變）。

## 2026-03-06 Patch Request：Silent Prompt + 附身自動送字 + 二次強制回覆 + tech backlog flush（sandbox only）

### 變更摘要
- sandbox flow SSOT 改為單一路徑：`PREJOIN -> PREHEAT -> TAG_PLAYER_1 -> WAIT_REPLY_1 -> POSSESSION_AUTOFILL -> POSSESSION_AUTOSEND -> CROWD_REACT_WORD -> TAG_PLAYER_2_PRONOUNCE -> WAIT_REPLY_2 -> FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`。
- 30 秒後採 Silent Prompt：overlay 顯示子音，但聊天室不再發題目公告，直接由 `mod_live/👑 behindyou` `@玩家` 並啟用 classic reply-to（freeze 0 output）。
- 第一段玩家回覆後會觸發 sandbox input wrapper：輸入框自動填本題單字，300~700ms 後走同一送出管線自動送出。
- 自動送字後固定刷 4~8 則觀眾追問（預設 6）：包含「什麼意思？」、「是在說螢幕上的拼音嗎？」、「這個拼音到底怎唸？」。
- 接著再由 `mod_live/👑 behindyou` 第二次 `@玩家` 問「所以到底怎麼唸？」並再次啟用 reply-to（不可取消），期間聊天室 0 output。
- tech 故障改為 backlog：reply-to active 每 30 秒累積 2 則（最後含「奇怪卡了大約 X 分鐘」），玩家回覆後一次 flush（<=8）才推進下一段。
- classic mode 未修改。

### 手機驗收步驟（必列）
1. 送出名稱前，聊天室 0 output；送出名稱後預熱 30 秒，不出題。
2. 30 秒後，overlay 出子音；聊天室不公告題目，直接 `@玩家` + reply-to（不可取消）且聊天室停住。
3. 玩家回覆後，輸入框會自動填單字並在 300~700ms 內自動送出（可肉眼看到）。
4. 之後觀眾出現 4~8 則「意思/拼音怎唸」追問，再次 `@玩家` 問「所以到底怎麼唸？」並再次停住。
5. 停住期間 tech backlog 只累積不顯示；玩家回覆後一次 flush（<=8，含「卡了 X 分鐘」）。
6. 切回 classic mode smoke run：行為不變。

## 2026-03-06 Patch Request：Sandbox tech backlog 只允許 Tag#3 WAIT（sandbox only）

### 變更摘要（sandbox only）
- sandbox flow 擴增為 3 次強制 tag：新增 `TAG_PLAYER_3_MEANING` / `WAIT_REPLY_3`。
- `SandboxStoryState.flow` 新增 `currentTagIndex: 1|2|3`，並在 step 切換時同步更新。
- 新增 backlog gate helper（等價條件）：`isTechBacklogEnabled = currentTagIndex===3 && flow.step===WAIT_REPLY_3`。
- Tag#1 / Tag#2 WAIT 僅 freeze + reply-to + 0 output，不累積、不 flush、不允許任何技術故障語句。
- Tag#3 WAIT 才能在背景每 30 秒累積 2 則 backlog（第二則固定「奇怪卡了大約 X 分鐘」）。
- 玩家回覆 Tag#3 後才進 `FLUSH_TECH_BACKLOG`，一次 flush `<=8` 則後再推進下一題。
- chat engine 在 `WAIT_REPLY_1/2/3` 一律 0 output（含 glitch burst），避免 WAIT 期 leakage。
- classic mode 未修改。

### 驗收步驟（必測）
1. Tag#1 WAIT：長時間不回覆，聊天室完全靜止（0 output），且不出現任何 lag/送不出去/卡住字樣。
2. Tag#2 WAIT：同上（0 output，無技術故障）。
3. Tag#3 WAIT：每 30 秒累積 2 則故障到 backlog（不顯示）。
4. 回覆 Tag#3 後：一次 flush（<=8，含「卡了X分鐘」）再推進。
5. 技術故障字樣只出現在 Tag#3 回覆後 flush 的那一波；其他時段不得出現。
6. classic mode 未修改。
