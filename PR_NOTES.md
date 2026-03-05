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
