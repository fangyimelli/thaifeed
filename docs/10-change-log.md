## 2026-03-07 Sandbox NIGHT_01 mention/flow 脫鉤稽核（AUDIT ONLY）

- 本次僅新增 audit report：`docs/sandbox-night01-audit-report-2026-03-07-night01-mention-stall.md`。
- 未修改 runtime code；classic mode 無改動。
- 結論重點：
  1. 玩家送出成功，但若未處於 `WAIT_REPLY_* + prompt.current.consonant`，sandbox judge 不會啟動。
  2. preheat mention 與子音題 prompt 來源不同，可能造成玩家回覆 target 錯位。
  3. `consonant.promptText/promptCurrent` 可殘留，不能單獨視為有效作答狀態。

### SSOT / Debug 欄位變更紀錄
- SSOT：無變更（audit only）。
- Debug：無新增欄位；補充 trace/根因文件化。

## 2026-03-06 Sandbox NIGHT_01 卡關稽核（AUDIT ONLY）

- 本次僅新增 audit report：`docs/sandbox-night01-audit-report-2026-03-06-night01-stall.md`。
- 未修改 runtime code；classic mode 無改動。
- 結論重點：
  1. 玩家送出成功，但 sandbox consonant parser/judge 未接線（judge 欄位維持預設值）。
  2. pinned 文案來源與有效子音 prompt 非同源，造成 UI target 誤導。
  3. `2jo` 對 `บ` 依現規則本來不合法，但本案先是 parser 沒跑。

### SSOT / Debug 欄位變更紀錄
- SSOT：無變更（audit only）。
- Debug：無新增欄位；補充 trace/根因文件化。

## 2026-03-06 Sandbox P0 Fixes（self-tag guard / pin preview mutex / composer-near preview / debug-safe）

- `src/app/App.tsx`
  - auto pin lock target 改以 source actor（提問者）為準，不再寫成 active user。
  - `submitChat()` 新增 self-target 防呆：`lockTarget === activeUserHandle`（大小寫/等價 handle）時，不做 mention rewrite，並清掉 lock。
  - `Emit NPC Tag @You` 改為 isolated debug chat injection（不走 event pipeline，不干擾正式 qna/lock/pin）。
- `src/ui/chat/ChatPanel.tsx`
  - 建立 preview 互斥：reply preview 顯示時，sandbox pinned preview 隱藏，避免 top pin + inline pin 雙重焦點。
  - sandbox pinned preview 改顯示於 composer 前方（非 chat panel 頂部）。
- `src/styles.css`
  - 調整 sandbox pin bar spacing，確保 preview 與 input/composer 相鄰且不遮擋 message list。

### Debug consistency
- 新增/使用 `self_lock_target_guard` anomaly 標記，追蹤自鎖定防呆降級。
- `sandbox.debug.isolatedActions.lastEmitNpcTag*` 保持為 debug-only，不寫入正式流程 state。

## 2026-03-06 Sandbox P0 Fixes（transactional commit / reply pin source guard / debug isolation）

- `src/chat/tagFlow.ts`：append 改為 success-or-abort；回傳 resolved messageId，只有成功才進 pin/freeze。
- `src/app/App.tsx`：
  - `dispatchChatMessage` 回傳 `{ ok: true, messageId }`。
  - qna/sandbox tag flow 一律以 append 成功回傳的 messageId commit `markQnaQuestionCommitted`。
  - 新增 `AWAITING_REPLY` source guard：source 缺失或 lock/source 不一致即清除 reply UI + freeze，並標記 aborted。
  - debug actions（Emit NPC Tag / Simulate Send / Toggle TagLock）改 isolated path，不再直接寫正式 qna/lock/pin。
- `src/ui/chat/ChatPanel.tsx`：reply pin render guard 升級（status + id + source + consistency），移除全域 pin bar 的 missing-source fallback。

### Debug consistency
- 新增 `sandbox.debug.isolatedTagLock`。
- 新增 `sandbox.debug.isolatedActions.*`，明確標示 debug-only injection 路徑。

## 2026-03-06 — Sandbox NIGHT_01 mention/reply/prompt/debug 全鏈路稽核（audit only）

### Scope
- 稽核範圍：sandbox story / chat / mention / reply / prompt / debug render。
- 本次不實作修復，不改功能邏輯。

### Audit artifacts
- 新增：`docs/sandbox-night01-audit-report-2026-03-06.md`。

### Confirmed findings
- `behindyou` 的 `@玩家` 由 `SandboxChatDirector` 建立，經 `ChatEngine -> App.convertSandboxChatMessage -> dispatchChatMessage` 進入 mention pipeline，訊息本體無 reply 欄位。
- `↳ @mod_live` / `（原始訊息已不存在）` 來自 `ChatPanel` 全域 reply pin bar（`qnaStatus + questionMessageId`），非該則 mention message 被畫成 reply。
- `@t` 來源是玩家 handle 值（資料建立時即為單字元），非 UI truncation。
- 已定位 fallback 觸發路徑：tag flow append 失敗仍可 commit `questionMessageId`，導致 lookup miss。
- 已標記 cross-mode leakage：sandbox 與 classic 共享 reply/qna 控制面造成干擾。

### SSOT / Debug 欄位變更
- SSOT：無變更（audit only）。
- Debug 欄位：無 runtime 欄位新增/刪除（僅文件化稽核證據鏈）。

## 2026-03-06 — Sandbox pinned reply body 空字串修復（sandbox only）

### Root cause
- auto pin 觸發點發生在訊息 append 前，`triggerSandboxAutoPinFreeze()` 以 `state.messages.find(messageId)` 取 source message 時可能拿不到資料。
- 取得失敗時 pinned body 寫入 `''`，在 `ChatPanel` 被渲染為 `「」`。

### Changed
- `src/app/App.tsx`
  - `triggerSandboxAutoPinFreeze()` 新增 `sourceMessage` 參數，優先使用 dispatch 當下 message，避免 stale read。
  - 新增 sandbox pinned body 欄位解析 fallback：`text -> content -> body -> displayText -> payload.text`（與 Classic 以 `text` 為主一致，並補防呆）。
- `src/ui/chat/ChatPanel.tsx`
  - sandbox pin body 不再包 `「」`，直接顯示完整文字；空值時統一 fallback `（原始訊息已不存在）`。

### Validation
1. VIP direct mention pinned body 顯示完整訊息：PASS。
2. 不再出現 `「」` 空字串 pinned：PASS。
3. classic mode：未變更。

## 2026-03-06 — Sandbox pinned reply parity hardening（sandbox only）

### Root cause
- sandbox pinned entry 使用獨立欄位（`sourceMessageId/sourceEventType/reason/actor/text/metadata`），與 Classic reply pin schema/formatter 不一致。
- sandbox pin bar 顯示 `reason` 並截斷 `text`，造成 UI 與 Classic 不一致且外露 internal metadata。

### Changed
- `src/app/App.tsx`
  - 將 sandbox pinned schema 收斂為 `id/messageId/createdAt/expiresAt/visible/author/body`。
  - 自動 pin 建立與清除流程改用新 schema，並保留既有 freeze + clear lifecycle。
  - debug 顯示調整：`pinnedSourceReason` 取自 audit state，不從 pinned entry 讀取。
- `src/ui/chat/ChatPanel.tsx`
  - sandbox pin formatter 改與 Classic 一致：`↳ @author` + `「完整 body」`。
  - 移除 `reason`/metadata 直接渲染。

### Validation
1. VIP direct mention：highlight + pinned + freeze（PASS）
2. GHOST_HINT_EVENT follow-up：pinned + freeze（PASS）
3. sandbox pin bar 視覺與 Classic reply pin 一致（PASS）
4. classic mode 無改動（PASS）


## 2026-03-06 — Sandbox：修復 VIP direct mention 只有 highlight、未顯示 pinned reply 區塊（sandbox only）

### Root cause
- `dispatchChatMessage()` 雖然已正確判定 `VIP + @玩家` 並觸發 auto pin/freeze。
- 但 auto pin 寫入仍走 `setPinnedQuestionMessage()`，該 writer guard 只允許 `sandboxPromptCoordinator`，導致 direct mention 的 pin 請求被 `writerNotAllowed/phaseBusy` 擋下。
- 結果是：聊天室 row highlight（mention style）仍生效，但 pinned reply UI（獨立區塊）沒有可渲染狀態。

### Changed
- [sandbox/pin state] `src/app/App.tsx`
  - 新增 sandbox 專用 pinned entry model：`sandboxPinnedEntry`，最小欄位含 `id/sourceMessageId/sourceEventType/reason/createdAt/expiresAt/visible/actor/text/metadata`。
  - `triggerSandboxAutoPinFreeze()` 改為同時建立 `sandboxPinnedEntry` + freeze，並支援 TTL 到期清除與覆寫追蹤。
  - `setPinnedQuestionMessage()` 新增 `autoPinFreeze` 來源白名單（sandbox only），避免 direct mention pin 被 writer guard 錯殺。
- [sandbox/render] `src/ui/chat/ChatPanel.tsx`
  - 新增 sandbox pinned 區塊渲染條件：`sandboxControl.enabled && sandboxPinnedEntry.visible`。
  - pinned 區塊改為獨立於 reply preview，確保 highlight / pinned 不再混用同一個判斷。
- [sandbox/ui style] `src/styles.css`
  - 新增 `.replyPinBar-sandbox`，確保 pinned 區塊不被聊天室列表或 input overlay 覆蓋。
- [sandbox/debug observability] `src/app/App.tsx`
  - 補齊 autoPinFreeze 可追蹤欄位：
    - `lastDirectMentionDetected`
    - `lastPinnedCandidateMessageId`
    - `lastPinnedCreatedAt`
    - `lastPinnedRenderVisible`
    - `pinnedStateKey/pinnedStateSummary`
    - `pinnedSourceReason`
    - `pinnedExpiresAt/pinnedRemainingMs`
    - `lastPinnedDroppedReason`
    - `highlightWithoutPinned`
    - `cleanupClearedPinned`
    - `pinnedOverwrittenByMessageId`
    - `pinnedComponentMounted`

### Integration decision（舊邏輯整合/淘汰）
- 保留既有 highlight 與 freeze 邏輯（仍有必要）。
- 淘汰「用 qna reply preview 代替所有 pinned 顯示」的隱性依賴：sandbox direct mention 改走獨立 pinned entry，不再受 qna AWAITING_REPLY gating 限制。

### Validation
- VIP 一般聊天：不建立 pinned（PASS）。
- VIP direct mention：聊天高亮 + pinned 區塊出現 + freeze 生效（PASS）。
- GHOST_HINT_EVENT follow-up：可建立 story-critical pinned，不再只剩 highlight（PASS）。
- pinned 不瞬間消失，具 `expiresAt` 與 remaining ms（PASS）。
- pinned 到期後正常清除（PASS）。
- classic mode 無變更（PASS）。

## 2026-03-06 — Sandbox：VIP direct mention pin/freeze + GHOST_HINT_EVENT 主線接續修復（sandbox only）

### Root cause
- sandbox chat engine 輸出的 VIP 訊息雖然帶有 `vip=true`，但 App 端只有既有 QnA tag flow（`runTagStartFlow` / `sandboxPromptCoordinator`）會進入 pinned + freeze。
- 一般 sandbox chat 訊息（包含 VIP `@玩家`）未進入 forced-reply pipeline，因此被當成 casual chat，不會 pin、不會 freeze。
- `GHOST_HINT_EVENT` 事件佇列原本是 `system + 3 則觀眾推理`，沒有 VIP follow-up 主線位階，導致提示被一般訊息稀釋。

### Changed
- [sandbox/chat] `src/sandbox/chat/chat_engine.ts`
  - `buildGhostHintQueue()` 改為：`[GHOST_HINT_EVENT]` 後強制插入 1 則 VIP 主線 follow-up（標記 `chatType=sandbox_story_critical_hint_followup` + `hintEventName`），再接 1 則觀眾推理。
  - 新增每種 ghost hint 對應的 VIP follow-up 文案池，確保 NIGHT_01 提示節奏可見。
- [sandbox/routing] `src/app/App.tsx`
  - 在 `dispatchChatMessage()` 新增 sandbox 專屬判定：`VIP + @玩家` => `vip_direct_mention`。
  - 命中 `vip_direct_mention` 或 `story_critical_hint_followup` 時，統一走自動 pin+freeze 路徑（可配置區間 5~8 秒，預設 6s/7s）。
  - freeze 到期後自動解除（並 guard：若仍在既有 WAIT_REPLY forced-reply，不會誤解除）。
- [sandbox/debug] `src/app/App.tsx`
  - 新增 `sandbox.audit.autoPinFreeze.*`：
    - `evaluation.directToPlayer`
    - `evaluation.hitVipDirectMentionRule`
    - `evaluation.hitStoryCriticalRule`
    - `evaluation.shouldPin`
    - `evaluation.failureReason`
    - `evaluation.pinnedReason`
    - `evaluation.freezeReason`
    - `freezeRemainingMs`
    - `lastMessageId / lastReason / lastHintFollowUpEvent`
- [schema] `src/core/state/types.ts`
  - `ChatMessage` 新增 `hintEventName`（供 debug 與主線 follow-up 追蹤）。

### Validation
- 1) VIP `@玩家` 訊息：會進 pin + freeze（sandbox only）：PASS
- 2) 一般 VIP 閒聊（未 @玩家）不會 auto pin：PASS
- 3) `[GHOST_HINT_EVENT]` 後會出 VIP 主線 follow-up，且 pin + freeze：PASS
- 4) freeze 到時可自動恢復，不會卡死：PASS
- 5) classic mode 無變更：PASS


## 2026-03-06 — Sandbox Flow SSOT Hardening (sandbox only)

- 新增硬步驟：`VIP_SUMMARY_1`、`DISCUSS_PRONOUNCE`、`VIP_SUMMARY_2`，取代原本依賴隨機池的 summary 行為。
- 修正 WAIT_REPLY freeze：reply-to active 時全域 0 output，並暫停 sandbox scheduler。
- 修正三段 tag 防重送：每 step 只允許一次 tag emit，重跑直接 return。
- 修正 PREHEAT routing：`final_fear` 權重在 PREHEAT 固定為 0。
- 修正 tech backlog：僅 `WAIT_REPLY_3` 累積、`FLUSH_TECH_BACKLOG` 才 flush（<=8；尾行分鐘數固定格式）。
- 修正 step transition：同 step 不再重覆 set（避免多來源重推進）。
- classic mode 無變更。


## 2026-03-06（sandbox only：reply preview lookup / WAIT_REPLY scheduler pause / ADVANCE_NEXT transition dedupe）

### Changed
- [sandbox/ui] `src/ui/chat/ChatPanel.tsx`
  - reply preview 查找改為使用完整訊息集合（full `messages` sanitize 後索引），不再只查 `slice(-MAX_RENDER_COUNT)`。
  - 聊天列表仍只 render 最後 `MAX_RENDER_COUNT`；僅 reply preview lookup 改為 full list。
- [sandbox/chat] `src/sandbox/chat/chat_engine.ts`
  - `WAIT_REPLY_1/2/3` 新增 scheduler hard pause（清除 timer 並停止下一輪排程），不再只靠 emit gate 丟棄輸出。
  - 離開 WAIT_REPLY step（玩家回覆後）自動 resume scheduler。
- [sandbox/flow] `src/app/App.tsx`
  - `ADVANCE_NEXT` 移除外層重複 `setFlowStep('TAG_PLAYER_1')`，避免與 `forceAdvanceNode()` 雙重寫 transition log。

### Validation
- 1) reply preview：只要 target 仍在 `state.messages` 即可正常顯示，不再誤顯示「原始訊息已不存在」：PASS
- 2) WAIT_REPLY 期間 scheduler 不再持續 `scheduleNext()`：PASS
- 3) flow transition log 不再出現 `ADVANCE_NEXT -> TAG_PLAYER_1` 雙寫：PASS
- 4) classic mode 行為未修改：PASS

## 2026-03-06
Sandbox Flow Update

- 修改 Step：`PREJOIN`、`PREHEAT`。
- 修改流程：sandbox 玩家提交名稱後不再立刻進入 join 強制回覆；改為先解除任何 reply/freeze 狀態並進入 30 秒 PREHEAT，待 PREHEAT 結束才進 `TAG_PLAYER_1`。
- 修改原因：對齊 sandbox 固定流程（名稱提交後先預熱、預熱期間不得出題），並避免 join 當下就卡入 reply-to 導致流程衝突。
- 影響範圍：僅 sandbox path（`src/app/App.tsx`）；classic mode 行為未改動。

## 2026-03-06（sandbox only：classic reply-to 強制回覆 gate + riot 上限）

- 僅調整 sandbox（`src/app/App.tsx` sandbox 路徑）與文件；classic mode 未修改。
- [sandbox/reply-to] `WAIT_PLAYER_CONSONANT` / `WAIT_PLAYER_MEANING` 改為共用 classic reply-to UI path（`AWAITING_REPLY + questionMessageId`），不再使用獨立 pinned/notice 分流。
- [sandbox/freeze] 新增 forced-reply dispatch 總閘：reply-to active 時，非玩家訊息一律 blocked（0 output，包含 join/idle/觀眾聊天/故障字串）。
- [sandbox/flow] 子音詢問與意思詢問都改成 once-per-step：詢問訊息送出後立刻綁定 reply-to 並 freeze；玩家回覆後才 clear reply/freeze，接續 glitch burst。
- [sandbox/riot] `WORD_RIOT` 每次固定 5 則（上限控制 4~6 區間之預設值）；加入 step token 檢查，避免 timer 與 step 雙軌推進造成卡題。
- [sandbox/qa] 意思等待回覆流程改用 `runTagStartFlow(append->scroll->pin->freeze)`，與 classic tagged-question 互動一致。

## 2026-03-05（sandbox only：Hybrid Chat Director + Freeze/Glitch SSOT）

### Scope / Isolation
- 僅調整 sandbox（`src/sandbox/*`、`src/app/App.tsx` 的 sandbox 路徑）與文件；classic mode 未改。

### Changed
- [sandbox/director] 新增 `src/sandbox/chat/chat_director.ts`，作為唯一節奏來源，統一輸出 mode / directed line / random 權重 / preheat join 判斷。
- [sandbox/chat] `src/sandbox/chat/chat_engine.ts` 改為 director 驅動：優先 directed line，其次依權重抽池；`freeze` 外層 hard gate；`tag_player` 不再隨機抽。
- [sandbox/preheat] 改為軟編排保證：0~20 秒至少一次 VIP 出場、5~25 秒至少一次 VIP `@玩家`。
- [sandbox/flow] `App.tsx` 將 `flow.step` 與 `stepStartedAt` 傳入 chat engine；preheat join 由 director `shouldEmitJoin()` 決定。
- [sandbox/gate] `forceAskConsonantNow/forceAskComprehensionNow` 新增 30 秒 gate（`introGate.passed` 前不允許強制出題）。

### SSOT / Debug
- SSOT：chat 節奏來源由 engine 分散判斷整併為 director。
- debug：沿用既有 `sandbox.flow.* / freeze / glitchBurst`，無破壞性 schema 變更。

## 2026-03-05（sandbox only：intro gate / freeze 0 output / player-reply glitchBurst / banned lexicon）

### Scope / Isolation
- 僅調整 sandbox flow/chat/docs；**classic mode 無任何修改**。

### Changed
- [sandbox/gate] `ASK_CONSONANT` 入口新增 `introGate.passed` 硬 gate；30 秒前只做 PREHEAT，禁止出題與子音顯示。
- [sandbox/step] `setFlowStep()` transition debug 修正為 `prev -> next`，每次 step 切換記錄一行。
- [sandbox/freeze] chat engine 最外層 emit gate：`freeze.frozen && !glitchBurst.pending => return null`，確保 WAIT_PLAYER 階段 0 output。
- [sandbox/glitch] glitch burst 只在玩家回覆後啟動（`pending=true, remaining=10`），以 250~450ms 連發 10 則，發完才進 `REVEAL_WORD/ADVANCE_NEXT`。
- [sandbox/filter] 新增 `SANDBOX_BANNED_PATTERNS = [/回頭/, /轉頭/]`，pool 抽字串命中即重抽（最多 5 次），失敗 fallback observation 安全文案。
- [sandbox/preheat] 預熱 VIP 文案改為不 tag 玩家，避免 30 秒內被引導進題。

### Acceptance
- 1) 前 30 秒只預熱不出題：PASS
- 2) 30 秒到點才出第一題：PASS
- 3) 問玩家後聊天室 freeze 0 output：PASS
- 4) 玩家回覆後先 glitch 10 則再 reveal：PASS
- 5) 語料不再輸出「回頭/轉頭」：PASS
- 6) 連跑 3 題第 2 題後不卡住且每題都 reveal：PASS

## 2026-03-05（sandbox only：NIGHT_01 節奏根治 + step SSOT + 第2題卡住修復）

### Scope / Isolation
- 僅調整 sandbox flow/chat/debug 與文件；classic mode 無任何邏輯變更。

### Changed
- [sandbox/state] `SandboxStoryState` 新增並整合 `preheat`、`answerGate`、`flow(questionIndex/step/stepStartedAt)`、`last(lastAskAt/lastAnswerAt/lastRevealAt)`，以 `questionIndex + step` 作為主流程 SSOT。
- [sandbox/flow] 進場固定 `step=0` 預熱 30 秒；預熱中只做閒聊/進人，且 VIP 高頻 tag 玩家。
- [sandbox/flow] 出題後固定進 `WAIT_ANSWER(step=2)`；15 秒未回覆時硬停聊天（`answerGate.pausedChat=true`）並顯示「等你回覆」。
- [sandbox/flow] 玩家回覆（包含不知道）後固定走：`ANSWER_GLITCH_FLOOD -> REVEAL_WORD -> WORD_RIOT -> VIP_TRANSLATE -> MEANING_GUESS -> ASK_PLAYER_MEANING -> ADVANCE_NEXT`，每題強制經過 reveal。
- [sandbox/bugfix] 修正「第 2 題後不跳單字卡住」：以 flow step 單一路徑推進，並用 `last*` 時戳避免同 step 重入重複 ask/reveal。
- [sandbox/chat] `chat_engine` 路由調整：`awaitingAnswer` 偏 fear/observation/tag，glitch 時段可走 `san_idle`。
- [debug] 新增 debug 欄位顯示：`flow.*`、`answerGate.*`。

### SSOT / Debug 記錄
- SSOT changed：sandbox story 推進真相由 phase 轉為 `flow.step`；phase 僅作渲染/路由表象。
- debug changed：新增 `sandbox.flow.*`、`sandbox.answer.gateWaiting/gateAskedAt/gatePausedChat`。

### Acceptance
- 1) 進 sandbox 前 30 秒不出題：PASS
- 2) 30 秒後才出題：PASS
- 3) 玩家不回覆會停聊 + SAN 上升：PASS
- 4) 玩家回覆後固定 glitch->reveal->riot->VIP->guess->tag->next：PASS
- 5) 連跑多題皆可 reveal，不再卡第 2 題：PASS

## 2026-03-05（sandbox only：CHAT_POOLS SSOT 2050 + phase routing）

### Scope / Isolation
- 僅調整 sandbox chat（`src/sandbox/chat/*`）與文件；classic mode sources 未修改。

### Changed
- [sandbox/chat] `src/sandbox/chat/chat_pools.ts` 改為靜態語料檔，`CHAT_POOLS` 僅保留 10 個 pool，數量固定：`casual_pool(500)`、`observation_pool(300)`、`theory_pool(250)`、`thai_viewer_pool(200)`、`fear_pool(200)`、`guess_character(150)`、`tag_player(100)`、`san_idle(150)`、`vip_summary(120)`、`final_fear(80)`，total=2050。
- [sandbox/chat] `thai_viewer_pool` 統一為結構化 entries：`{ user, text, thai, translation }`；`user` 僅來自 `THAI_USERS`。
- [sandbox/chat] 新增 `assertChatPoolsCounts()`（dev/測試可呼叫）驗證 10 池與 total，並在 chat engine DEV 初始化時檢查一次。
- [sandbox/chat] `src/sandbox/chat/chat_engine.ts` 全面改用 `CHAT_POOLS`；移除對舊 pool key（`vip_translate`、`ghost_hint_reasoning`）的依賴，改由引擎內固定小型事件文案常數處理。
- [sandbox/chat] `tag_player` 改用 `{{PLAYER}}` / `${playerHandle}` 模板，emit 時替換成當前玩家 handle。
- [sandbox/chat] 新增簡短 phase routing：`theory_pool` 在 `awaitingAnswer/revealingWord` 提高權重；`final_fear` 只在 ending/高壓（低 SAN 或 supernaturalEvent）提高機率。

### SSOT / Debug 記錄
- SSOT changed：sandbox chat corpus 單一來源收斂到 `CHAT_POOLS`。
- Debug 欄位無新增；系統狀態變更為「Thai viewer message 保留 `thai/translation` 結構欄位供 UI/debug 使用」。

### Acceptance
- 1) 10 pools 長度與 total=2050：PASS（`assertChatPoolsCounts()`）
- 2) sandbox 正常輸出一般觀眾、Thai viewer、VIP、tag player：PASS
- 3) meaning guess/reveal 時 `theory_pool` 出現率上升（非 0）：PASS
- 4) 後段/高壓才明顯出現 `final_fear`：PASS
- 5) classic mode sources 未修改：PASS

## 2026-03-05（sandbox only：P1-D/G 角色同義詞追問 + Q10 翻譯特例）

- [sandbox/tag-player] 新增 `src/sandbox/chat/characterDisambiguation.ts`，提供 `normalize()`（全半形/大小寫/空白與常見標點清理）與 `matchCategory()`，支援 woman/girl/boy 同義詞分類。
- [sandbox/tag-player] `tagPlayerPhase` 玩家輸入改為同義詞判定：命中即記錄 `sandbox.lastCategory` 並 `resolveTagPlayerPhase('hit')`；首次未命中送固定追問 `@玩家 你是在說誰??????`（無 options）；再次未命中改走 P0 revisit queue（enqueue 當前題並先下一題）。
- [sandbox/ssot] NIGHT_01 第 10 題改為 `consonant=ห / word=หัน / meaning=轉頭`（對應 `NIGHT1_WORDS` 最後一題）。
- [sandbox/q10-special] 新增 Q10 專屬注入：僅在 `nodeIndex===9 && phase=vipTranslate` 且 `q10Special.armed` 時送出 `VIP: อย่าหัน`（含翻譯按鈕）；點擊翻譯後顯示橘色 `別轉頭`（`[橘色]別轉頭[/橘色]`）。
- [sandbox/guard] 非 Q10 不注入 `อย่าหัน〔翻譯〕`；泰文池原先 `อย่าหันหลังนะ` 改為 `อย่ามองกลับไป`，避免非 Q10 出現「不要轉頭」語義。
- [debug] 新增欄位：`sandbox.lastCategory`、`sandbox.pendingDisambiguation.active/attempts/promptId`、`sandbox.q10Special.armed/revealed/currentQuestion/allowInject`。

## 2026-03-05（sandbox NIGHT_01 P0：intro gate + forced pipeline + revisit queue + timeout copy + options guard）

### Scope / Isolation
- 僅調整 sandbox_story 與 sandbox chat engine；classic mode 無邏輯變更。

### Changed
- [sandbox/state] `SandboxStoryState` 新增 `introGate`（`startedAt/minDurationMs/passed/remainingMs`）、`pendingQuestions`（FIFO queue + revisiting）、`pipeline`（reasoning/tag 追蹤）；`init()` phase 改為 `intro`。
- [sandbox/intro] `tick()` 內更新 intro gate；僅 gate 通過才會進入 `awaitingTag` 並觸發出題。
- [sandbox/pipeline] 新增 `reasoningPhase`、`tagPlayerPhase`，`vipTranslate` 後固定經過 `reasoning -> tag -> next`，不再隨機缺步。
- [sandbox/revisit] tag 回覆未命中 `woman/girl/boy` 時 enqueue 當前題；`next` 前優先回補 pending 題，命中後才 dequeue。
- [sandbox/timeout] `tagPlayerPhase` 新增 8~12 秒 timeout 固定文案（卡住四連）；玩家回覆後固定 recovery 文案（終於三連）。
- [sandbox/options-guard] sandbox emit 層阻擋 `options payload` 與 `選項：` 句型，並累積 debug `blockedOptionsCount`。
- [sandbox/chat-engine] `onWaveResolved` 改回傳實際 wave 長度；新增 `emitReasoningWave()` / `emitTagPlayerPrompt()`。

### SSOT / Debug 欄位變更
- SSOT changed：sandbox flow 新增 `intro/reasoning/tagPlayer` 狀態節點，移除「推理/tag 玩家隨機噴」分叉。
- Debug 新增/調整：
  - `sandbox.introGate.*`
  - `sandbox.pendingQuestions.length/revisiting`
  - `sandbox.blockedOptionsCount`
  - `sandbox.scheduler.phase` 可見 `reasoningPhase/tagPlayerPhase`

### Removed / Deprecated
- Deprecated（sandbox）：所有 options 型輸出（payload `options` 或 `選項：...`）在 sandbox 一律 blocked。

### Acceptance
- 1) intro 30 秒內不出題：PASS
- 2) 每輪固定經過 reasoning + tag：PASS
- 3) 未命中分類會先跳題後回補直到命中：PASS
- 4) tag timeout/recovery 固定文案：PASS
- 5) sandbox 不再出現「選項：...」：PASS

## 2026-03-06（sandbox only：audit debug fields + non-blocking spam/leak audit）

### Changed
- [sandbox/debug] debug 面板新增 audit 區塊欄位：
  - `introGate.startedAt/minDurationMs/passed`
  - `flow.step/stepEnteredAt/questionIndex`
  - `freeze.frozen/reason/frozenAt`
  - `glitchBurst.pending/remaining`
  - `tagAskedThisStep/askedAt`
  - `lastEmitKey/lastSpeaker`
  - `recentEmitKeys`（ring buffer 20）
  - `transitions`（ring buffer 20）
  - `thaiViewer.lastUsedField/count`
- [sandbox/chat] `chat_engine` 新增 audit counters（偵測到只記錄，不阻擋）：
  - `duplicateSpamCount`：同 key 連續 emit > 2
  - `speakerSpamCount`：同 speaker 連續 emit > 3
  - `freezeLeakCount`：`WAIT_PLAYER_*` + freeze 期間仍發生 emit

### Scope
- classic mode 無修改。

## 2026-03-05（sandbox only：chat pools corpus expansion）

### Changed
- [sandbox/chat] 新增 `src/sandbox/chat/chat_pools.ts`，建立 10 類聊天室語料池：`casual_pool(500)`、`observation_pool(300)`、`theory_pool(250)`、`thai_viewer_pool(200)`、`fear_pool(200)`、`guess_character(150)`、`tag_player(100)`、`san_idle(150)`、`vip_summary(120)`、`final_fear(80)`。
- [sandbox/chat] `src/sandbox/chat/chat_engine.ts` 改為使用 `CHAT_POOLS` 作為單一語料來源，移除本地小型硬編碼池，避免新舊語料邏輯並存。
- [sandbox/chat] 泰文觀眾訊息改用 `thai_viewer_pool` 物件格式（`user/text/thai/translation`），直接輸出中泰翻譯欄位。

### SSOT
- [x] SSOT changed
  - sandbox 聊天語料改由 `CHAT_POOLS` 集中管理，`chat_engine` 不再維護第二套內嵌池。

### Acceptance
- 1) 語料池數量符合目標（總量 2050）：PASS
- 2) `thai_viewer_pool` user 來源符合指定名單：PASS
- 3) classic mode 無檔案變更：PASS

## 2026-03-05（sandbox only：classic consonant parity + debug override isolation）

### Changed
- [sandbox/classic-adapter] `src/modes/sandbox_story/classicConsonantAdapter.ts` 新增 `parseAndJudgeUsingClassic()`，統一輸出 classic parse/judge/hint，作為 sandbox 唯一判定入口。
- [sandbox/judge] sandbox 子音送出流程改為直接採用 classic result；移除正常輸入路徑中會誤導成 `debug_apply_correct` 的捷徑影響。
- [sandbox/debug] 新增 parity 與 override 驗收欄位：`sandbox.judge.result`、`classic.judge.result`、`sandboxClassicParity`、`sandbox.judge.debugOverride.active/source/consumedAt`。
- [sandbox/debug-tester] 保留 ForceCorrect，但改為「按鈕觸發一次性 override」，consume 後自動清除，避免污染一般玩家輸入。
- [sandbox/hint/pinned] unknown hint 與 prompt text 由 classic adapter 輸出，sandbox 僅顯示不改寫。

### SSOT
- [x] SSOT unchanged（仍以 classic consonant core 為唯一真相來源；sandbox 僅 adapter）

### Debug 欄位變更紀錄
- 新增：
  - `sandbox.judge.result`
  - `classic.judge.result`
  - `sandboxClassicParity`
  - `sandbox.judge.blockedReason`（parity mismatch 時為 `parity_mismatch`）
  - `sandbox.judge.debugOverride.active`
  - `sandbox.judge.debugOverride.source`
  - `sandbox.judge.debugOverride.consumedAt`

### Acceptance
- 1) 題目=ร，輸入=บ => wrong：PASS
- 2) unknown（不知道）=> classic 同款提示且留在同題：PASS
- 3) correct => 與 classic 同步流程（reveal/節奏）：PASS
- 4) 未按 debug 按鈕不會出現 `debug_apply_correct`：PASS
- 5) `sandboxClassicParity` 維持 true：PASS
- 6) classic mode 行為不變：PASS

## 2026-03-04（sandbox only：currentPrompt SSOT + parser PASS + unknown 不跳題）

### Changed
- [sandbox/ssot] 新增驗收別名 `sandbox.currentPrompt`（`id/consonant/wordKey`），並與既有 `sandbox.prompt.current` 同步，題目 UI / parser / hint / reveal / debug 共用同一題資料。
- [sandbox/parser] 子音 parser/judge 新增 PASS keyword：`pass` / `skip` / `p`；命中時 `judge=pass`，立即走 `advancePrompt('debug_pass')`，不再顯示 hint。
- [sandbox/unknown] `不知道 / 不確定 / idk / ?` 固定只顯示 hint 並保持同一題，不會 advance。
- [sandbox/hint] hint builder 改為只讀 `currentPrompt.consonant` 產生提示，避免與 UI 子音來源分裂。
- [sandbox/debug] 新增/補齊欄位：`sandbox.currentPrompt.id/consonant/wordKey`、`sandbox.parser.result`、`sandbox.advance.lastReason`。

### Acceptance
- 1) 輸入 `pass` 立即下一題：PASS
- 2) UI 子音與 hint 子音一致：PASS
- 3) unknown 只顯示提示不跳題：PASS
- 4) classic mode 不受影響：PASS

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


## 2026-03-04（sandbox only：QnA consume/retry 雙路徑衝突修正）

### Changed
- [sandbox/qna] 修正玩家送出有效選項後，`consumePlayerReply()` 與 `tryTriggerStoryEvent('user_input')` 重複消費造成的狀態回滾；sandbox 在 awaitingReply 期間禁止再進 `tryTriggerStoryEvent` user-input 分支。
- [sandbox/send] 當 `consumePlayerReply()` 命中有效選項時，`submitChat()` 立即短路 `markSent('sandbox_qna_consumed')`，不再執行 classic wrong/chatEngine/event 分支。
- [sandbox/state-ui] 維持單一路徑 resolve：`consume -> parse -> resolve`，並確保 resolve 後 reply UI 與 freeze 不會被後續邏輯覆寫回等待狀態。

### Acceptance
- 1) tag 後回覆「穩住」：reply bar 立刻消失、freeze 解除：PASS
- 2) tag 後回覆「衝」：reply bar 立刻消失、freeze 解除：PASS
- 3) tag 後回覆「不知道」：reply bar 立刻消失、freeze 解除、進提示流程：PASS
- 4) debug 欄位 `qna.awaitingReply true->false`、`ui.replyBarVisible true->false` 可觀測：PASS
- 5) classic mode 不受影響：PASS

## 2026-03-04（sandbox only：QnA reply bar stuck fix）

### Changed
- [sandbox/qna] 修正玩家回覆有效選項（穩住/衝/不知道）後仍卡在 awaiting reply 的問題；玩家送出入口改為單一路徑 `consumePlayerReply() -> parsePlayerReplyToOption() -> resolveQna()`。
- [sandbox/ui] resolve 後強制清空 reply UI（`replyToMessageId/questionMessageId/lastQuestionMessageId`）並解除 freeze，避免 reply bar 殘留。
- [sandbox/debug] 新增 `sandbox.qna.lastResolveAt/lastResolveReason/lastClearReplyUiAt/lastClearReplyUiReason/lastAnomaly`，以及 `ui.replyToMessageId`。
- [sandbox/debug tester] 新增 `ForceResolveQna`、`ClearReplyUi` 兩個按鈕，便於驗證「resolve + clear」與 UI 隔離。

### Acceptance
- 1) tag 後回覆「穩住」：reply bar 立刻消失、freeze 解除：PASS
- 2) tag 後回覆「衝」：reply bar 立刻消失、freeze 解除：PASS
- 3) tag 後回覆「不知道」：reply bar 立刻消失、freeze 解除、流程繼續：PASS
- 4) debug 欄位 `qna.awaitingReply true->false`、`ui.replyBarVisible true->false` 可觀測：PASS
- 5) classic mode 不受影響：PASS

## 2026-03-04（sandbox consonant prompt integration）

### Changed
- [sandbox/qna] `unknown`、`wrong` 兩種結果都改為「同題重答 + 一定產生提示文字」，提示改由 `classicHintAdapter`（透過 adapter）提供，避免 sandbox 與 classic 文案漂移。
- [sandbox/reveal] Overlay 改為顯示 `baseConsonant + appended`；`correct` 顯示完整補字、`wrong/unknown` 顯示 hint appended，動畫調整為 fadeIn → scaleUp → fadeOut，並掛在螢幕子音旁。
- [sandbox/scheduler] `correct` 流程改為 reveal 完成後先送 related wave（3~6 則、不可 tag 玩家），wave 結束才進下一題；`wrong/unknown` 不推進題目。
- [sandbox/ssot+debug] `night1_words` 與 `WordNode` 新增 hint appended 欄位；debug 新增 `sandbox.hint.*`、`word.reveal.base/appended/phase`、`sandbox.prompt.current.consonant/wordKey` 與 `lastWave.*` 觀測。
- [sandbox/audio] 發音音效保留介面但不播放，`audio.pronounce.state=idle`（reserved no side effect）。

### Docs
- README、PR_NOTES 同步更新本次 sandbox 強制整合內容、Removed/Deprecated log、SSOT 與 debug 欄位變更紀錄。

## 2026-03-04（sandbox_story PromptCoordinator 單一真相來源）

### Changed
- [sandbox_story/prompt] 新增 `sandbox.prompt.current`（PromptCoordinator）作為 prompt SSOT，Overlay 與 pinned 統一由此渲染，移除各自讀舊 state 的分叉來源。
- [sandbox_story/overlay] `SceneView` 的 `targetConsonant` 在 sandbox 改讀 `sandbox.prompt.current.consonant`，並寫入 `sandbox.prompt.overlay.consonantShown`。
- [sandbox_story/pinned] 新增 sandbox pinned writer guard：僅 `sandboxPromptCoordinator` 可寫入 pinned；`qnaEngine/eventEngine` 寫入會被阻擋並記錄 debug。
- [sandbox_story/unknown] 「不知道」流程保持同一 promptId，不切換到 comprehension 題；僅發送提示訊息。
- [debug] 新增題目一致性檢查欄位：`sandbox.prompt.current.kind/promptId`、`sandbox.prompt.overlay.consonantShown`、`sandbox.prompt.pinned.promptIdRendered`、`sandbox.prompt.mismatch`、`pinned.lastWriter.*`。

### Docs
- README 新增 PromptCoordinator、writer guard 與一致性 debug 欄位說明。
- PR_NOTES 新增 root-cause 排查與本次驗收 PASS/FAIL。

## 2026-03-04（sandbox_story Consonant QnA true pass flow）

### Changed
- [sandbox_story/qna] 子音題改為 sandbox keyword 判定：題目由 `correctKeywords`/`unknownKeywords` 驅動，玩家回覆統一走 normalize + parse + judge（correct/wrong/unknown；timeout debug 先標示未啟用）。
- [sandbox_story/freeze] 發題仍走 `runTagStartFlow` 單一路徑（append → scroll → pin → freeze），確保 pinned render 後才 freeze。
- [sandbox_story/pipeline] `Judge=correct` 才會觸發既有 WordRevealPipeline（無新增音效）：reveal → related wave → preNextPrompt → 下一題/awaitingTag。
- [sandbox_story/recovery] `Judge=unknown` 與 `Judge=wrong` 均有可持續路徑，避免流程卡死。
- [debug] 補齊欄位：`scheduler.phase`、`consonant.prompt.current`、`consonant.judge.lastInput/lastResult`、`word.reveal.phase/wordKey`、`lastWave.count/kind`、`blockedReason`。

### Docs
- README 更新 sandbox 子音回答規則與 debug 欄位。
- PR_NOTES 更新本次 PASS/FAIL。

## 2026-03-04（sandbox_story Night1 word reveal pipeline）

### Changed
- [sandbox_story/ssot] Night 1 改為 10 個拼圖字結構稿（子音→單字→理解題→talkSeeds），並接入 `src/data/night1_words.ts`、`src/data/chat_templates.ts` 與 `src/ssot/sandbox_story/night1.ts`。
- [sandbox_story/pipeline] correct 後流程改為 `revealingWord -> chatWaveRelated -> preNextPrompt -> awaitingTag`，reveal 與聊天波互斥，busy phase 會回報 `blockedReason=phaseBusy`。
- [ui/overlay] `WordRevealOverlay` 改為「左側 baseConsonant + 右側逐字補齊」並支援霧化散去動畫。
- [audio] 發音播放固定使用 `/assets/phonetics/${audioKey}.mp3`，缺檔不拋錯。
- [debug] 新增可觀測欄位：`word.reveal.phase`、`word.reveal.wordKey`、`audio.pronounce.lastKey/state`、`scheduler.phase`、`lastWave.count/kind`、`blockedReason`；Tester 新增 ForceRevealWord / ForcePlayPronounce / ForceWave(kind)。

### Docs
- README 新增 Word Reveal Pipeline 與 phonetics 路徑/命名規範。
- PR_NOTES 更新驗收 PASS/FAIL 表格。

## 2026-03-04（debug gate ssot + mode switch debug_disabled fix）

### Changed
- [debug/ssot] 新增 `src/debug/debugGate.ts` 作為共用 debug gate SSOT，統一 `isDebugEnabled()` 判定（query/hash/session/window flag）。
- [debug/overlay] App debug overlay 開啟時會同步設定 shared debug enabled 狀態；因此只要 overlay 可見，mode switch guard 會視為 debug enabled，不再誤回 `debug_disabled`。
- [debug/mode-switch] `Switch to Sandbox` 維持既有流程：寫入 `localStorage['app.currentMode']`、更新 mode override 與 URL、執行 reload；並維持 `Mode Switch Debug` 可視化欄位。
- [debug/safety] 啟動時從 storage 覆寫 mode 仍受 `isDebugEnabled()` gate 控制，非 debug 不受 localStorage 影響。

### Docs
- README 補充 Debug Gate SSOT 與「overlay 可見即 debug enabled」規則。
- PR_NOTES 補充本次 root cause、驗收與 rollback。

## 2026-03-04（debug mode switcher no-response fix）

### Changed
- [debug/ui] `DebugModeSwitcher` 新增 `Mode Switch Debug` 狀態區塊，點擊後立即回寫 `lastModeSwitch.clickAt/requestedMode/persistedMode/action/result/reason`，不再只靠 console 判斷。
- [debug/ssot] Mode 切換沿用既有 SSOT（`mode` query + `localStorage['app.currentMode']`）；切換時會回讀 query/storage/store 並顯示在 `persistedMode`，可直接確認是否真的寫入。
- [debug/bootstrap] 切換成功時固定走 debug-only `reload` 生效，並在 UI 顯示 `Switching…` 與 `action=reload`。
- [debug/guard] 新增阻擋/錯誤可視化（例如 `debug_disabled` / `already_current_mode` / `invalid_mode` / 例外訊息），避免按鈕看起來「無反應」。
- [classic] 無事件/流程/遊戲邏輯變更。

### Docs
- README 補充 Debug 模式切換排障（優先看 `lastModeSwitch.result/reason`）。
- PR_NOTES 新增本次驗收流程與 rollback（移除 mode switcher 或關閉 debug override）。

## 2026-03-04（debug mode switcher classic/sandbox_story）

### Changed
- [debug/ui] 在共用 Debug Panel 頂部新增 `DebugModeSwitcher`（`Switch to Classic` / `Switch to Sandbox (sandbox_story)`），並顯示 `currentMode`。
- [debug/ssot] Mode 切換不新增第二套狀態：沿用既有 `mode` query param，切換時同步寫入 `localStorage['app.currentMode']` 供 debug session 持久化。
- [debug/bootstrap] 切換 mode 後立即 reload 生效，確保 App 重新走對應 mode 初始化（classic 或 sandbox_story）。
- [debug-only] 啟動時僅在 `debug=1` 允許從 `localStorage['app.currentMode']` 覆寫 mode；非 debug 維持既有 mode 決策行為。
- [classic] 無 runtime/event/chat/audio 邏輯變更。

### Docs
- README 新增 Debug Mode Switcher 使用方式（位置、按鈕、reload、生效條件）。
- PR_NOTES 記錄驗收步驟、風險與回退。

## 2026-03-04（sandbox_story fear meter debug monitor）

### Changed
- [sandbox_story/debug] Debug Panel 新增 `Fear System` 區塊（`fearLevel` / `pressureLevel` / `ghostProbability`），且僅在 `mode === "sandbox_story"` 顯示。
- [sandbox_story/debug] 新增 `Fear Meter` 視覺化 bar（`fearLevel / maxFear`）與 `Triggers`（`chatSpike` / `storyEmotion` / `darkFrame` / `ghostNearby`）。
- [sandbox_story/debug] 新增 debug controls：`Add Fear +10`、`Reset Fear`，透過 `fearSystem.getDebugState()`（`getFearDebugState()`）每 500ms refresh。
- [classic] 無邏輯變更（classic mode 0 變動）。

### Docs
- README、PR_NOTES 同步 Fear Meter Monitor 規格、顯示條件與驗收結果。

## 2026-03-04（debug panel mode-aware tools）

### Changed
- [debug] Debug Panel 拆分為 `Mode Debug`、`Classic Debug Tools`、`Sandbox Story Debug Tools` 三塊。
- [debug] 新增 `getActiveMode()` 顯示/判定（優先序：`debug.modeOverride` → `urlMode` → `defaultMode`）。
- [debug] classic / sandbox_story 改為互斥顯示工具，避免 classic runtime 誤觸 sandbox debug controls。

### Docs
- README、PR_NOTES 同步本次 mode-aware debug 行為。

## 2026-03-04（sandbox classic consonant adapter）

### Changed
- [sandbox_story] phase 改為先 `awaitingConsonantTagPrompt -> pinnedFreezeAwaitConsonant`，答對才進 `revealingWord`。
- [sandbox_story] 新增 `classicConsonantAdapter`，parser 直接重用 classic `isAnswerCorrect` 與 `normalizeInputForMatch` 規則。
- [sandbox_story/debug] 新增 `sandbox.consonant.*`、`freeze.active / pinned.text`，並加入 `ForceAskConsonantNow`、`SimulateConsonantAnswer(text)`。

### Docs
- 更新 `docs/30-sandbox-story-mode.md`：補 classic 子音系統 repo mapping、reuse/adpater/fallback 說明。
- README、PR_NOTES 同步本次 sandbox-only 整合內容。

## 2026-03-03（sandbox story mode engine stage 1）

### Changed
- [modes] 新增 `GameMode` 介面與 mode routing 基礎，加入 `classicMode` wrapper（不改 classic 行為）與 `sandbox_story` 模式骨架。
- [sandbox_story] 新增 story engine phase scheduler：`boot → awaitingQuestionReady → revealingWord → chatWaveRelated → awaitingComprehensionTag → pinnedFreezeAwaitAnswer → resolvingComprehension → ghostMotionPlaying → postMotionWrapUp`。
- [ssot] 新增 `src/ssot/sandbox_story/types.ts` 與 `night1.ts`，建立 Story Mode SSOT（含 3 個測試 `WordNode`）。
- [debug] Debug 面板新增 `mode.id`、`sandbox.nodeIndex`、`sandbox.scheduler.phase`、`sandbox.currentNode.word/char`。

### Docs
- 新增 `docs/30-sandbox-story-mode.md`（Repo Mapping / Story Engine 架構 / SSOT 結構）。
- README 補充 Sandbox Story Mode Stage 1 說明與文件索引。

# 10｜Change Log（變更紀錄規範）

## 這份文件在管什麼

記錄維護手冊層級的重要變更，特別是會影響既有流程、驗收方式、或團隊認知的調整。

## 分類規則

- **Breaking**：會影響既有實作或驗收腳本，需要團隊同步調整。
- **Changed**：既有行為調整，但不一定破壞介面。
- **Docs**：文件結構或規範更新。

## 目前已知關鍵變更

### Breaking

- 移除 `loop4` 作為循環/排程成員，主循環改為 loop3、插播僅 loop 與 loop2。
- Ghost 流程改為事件化，禁止分散在多處硬觸發。

### Changed

- 事件流程明確規範為 **pre-effect → starter tag**。
- fan_loop 採 WebAudio 排程作為主路徑，降低循環接縫。
- README 由「現況長文」改為「維護手冊入口索引」，規格改由 `/docs` 維護。

## 未來新增條目格式（請照抄）

```md
## YYYY-MM-DD

### Breaking
- [系統] 變更摘要（影響範圍）
- 驗收：要看哪些 debug 欄位 / 測試
- 影響文件：docs/xx-xxx.md

### Changed
- [系統] 行為調整摘要
- 驗收：...
- 影響文件：...

### Docs
- 更新了哪些頁面與原因
```

## 維護規則

- 每次 PR 若有流程級變更，必須更新本頁。
- 變更內容需能追溯到對應 SSOT 檔案與 docs 分頁。

## 2026-03-03（mention autoscroll + jump hint）

### Changed
- [chat/ui] 新增 mention autoscroll：新進訊息若 `mentions` 命中 activeUser 且作者非自己，會觸發自動滾動判斷。
- [chat/ui] 採策略 B（near-bottom threshold=100px）：接近底部時自動滾到底；不在底部時不強制跳轉，改為高亮「@你・跳到最新」。
- [mobile/scroll] 置底改為雙階段排程（`requestAnimationFrame` + `setTimeout(0)`）提升 Android Chrome 穩定性，降低 layout 變動造成漏滾。
- [debug] 新增 mention autoscroll 觀測：`[MENTION_AUTOSCROLL]`、`[AUTOSCROLL_SKIPPED]`，以及 debug URL `forceMentionAutoscroll=1` 與 `Inject NPC Tag @You` 按鈕。

### Docs
- README 新增 mention autoscroll 行為規格、策略選擇與 debug 驗證步驟。
- PR_NOTES 記錄策略 B、驗收案例與 debug 欄位變更。

## 2026-03-02

### Changed
- [chat/events/ghost/scroll] 將 tagged question 的 freeze 改為硬暫停模型：freeze 期間阻擋 NPC 訊息、event 自動訊息、ghost/sfx 觸發與聊天室自動滾動；玩家成功送出回覆後才統一解凍。
- [qna] tagged question 送出後流程改為「先讓聊天室滾到底顯示被 tag 訊息，再於下一個 render tick 啟用 freeze」，避免先 freeze 導致目標訊息未出現在視窗內。
- [ui] pinned reply 維持 input 上方 overlay，不寫入 messages[]，確保視覺順序為「聊天室最後一則 tagged 訊息在上、pinned reply 在下」。
- [debug] 新增 freeze 與阻擋計數觀測欄位：`freeze.isFrozen`、`freeze.reason`、`freeze.startedAt`、`npcSpawnBlockedByFreeze`、`ghostBlockedByFreeze`。

### Docs
- README 新增本次 freeze 強化規格與驗收重點。
- PR_NOTES 更新本次變更範圍、debug 欄位與驗收結果。


## 2026-03-02（scroll-before-pause 修正）

### Changed
- [qna/chat] 新增 `scrollThenPauseForTaggedQuestion` 單一入口：在 `questionMessageId` 寫入並顯示 ReplyPin 後，先等待 message render、再 double-force 置底、最後才進入 pause/freeze。
- [ui/debug] 新增可觀測欄位：`chat.scroll.lastForceToBottomReason`、`chat.scroll.lastForceToBottomAt`、`chat.scroll.scrollTop/scrollHeight/clientHeight`、`ui.qnaQuestionMessageIdRendered`、`ui.replyPinMounted`、`chat.pause.isPaused`。
- [chat] pause 規則調整為「只阻擋 spawn，不阻擋 scrollThenPause 內的置底流程」。

### Removed
- 移除 tagged question 的 countdown-then-freeze 舊流程（`COUNTDOWN` 轉 `FROZEN`）；改為成功出題後立即執行「先置底再 pause」。

## 2026-03-02（distance-approach + blackout-flicker）

### Changed
- [audio/events] `footsteps`、`ghost_female` 事件音效改為 WebAudio 距離接近模型（gain/lowpass/pan/playbackRate 自動化 + ±15% 時長隨機）。
- [player/ui] 新增 blackout overlay 效果：事件音效成功觸發後延遲 1 秒啟動，`full`/`dim75` 隨機模式、持續 12 秒 flicker，並在第 4 秒短暫亮起一次後回到黑幕。
- [pause/freeze] pause/freeze 提升為更高優先序：`chat.pause.isPaused=true` 時禁止新 SFX/blackout，且 pause 進入時會立刻停止進行中的 blackout。
- [debug] 新增可觀測欄位：`audio.lastApproach.*`、`fx.blackout.isActive/mode/endsInMs`。

### Removed
- [audio] 移除 `SceneView` 內 `footsteps` / `ghost_female` 的 `<audio>` one-shot 舊播放路徑，避免與新 WebAudio 距離模型並存造成雙聲。

### Docs
- README 補充事件驅動「由遠到近」音效與 blackout flicker 行為、debug 觀測方式。
- PR_NOTES 更新 audio/player/events/debug/docs 影響範圍與驗收結果。

## 2026-03-02（event prepare/commit/effects transaction）

### Changed
- [events] 事件流程改為 `Prepare → Commit → Effects` 三段式：只有 commit 成功才允許播放 SFX/切影片/blackout，且 commit 成功必定立即進入 effects（同 call chain，避免 silent）。
- [events/audio/player] 新增事件效果 registry SSOT：`src/events/eventEffectsRegistry.ts`，集中管理 `VOICE_CONFIRM/GHOST_PING/TV_EVENT/NAME_CALL/VIEWER_SPIKE/LIGHT_GLITCH/FEAR_CHALLENGE` 的 SFX/Video/Blackout 映射。
- [tv_event] `TV_EVENT` 明確映射 `loop4`，commit 時加入 `video_src_empty/video_not_ready` gate，阻擋時寫入 debug blockedReason。
- [pause/freeze] tagged question 流程順序調整為「事件 effects 先執行，再 scrollToBottom + pause」，避免出現「有 tag 但效果沒播」。
- [debug] 新增事件交易觀測欄位：`lastEvent.questionMessageId`、`lastEvent.commitBlockedReason`、`lastEventCommitBlockedReason`、`lastEffects.sfxPlayed[]`、`lastEffects.videoSwitchedTo`、`lastEffects.blackoutStartedAt/mode`。

### Docs
- README 補充事件交易化流程、registry SSOT 與新 debug 欄位。
- PR_NOTES 更新本次 events/audio/player/debug/docs 影響範圍與驗收。

## 2026-03-02（debug force execute events）

### Changed
- [events/debug] 新增公開 debug 入口 `debugForceExecuteEvent(eventKey, options)`；強制事件仍走 `Prepare → Commit → Effects` 全流程，不直接呼叫私有 effect。
- [events] commit gate 新增 force 選項判斷：`ignorePause`、`ignoreCooldown`、`skipTagRequirement`，並回填 `paused/cooldown/no_tag` blocked reason。
- [qna/pause] force + `ignorePause=true` 時會跳過 `scrollThenPauseForTaggedQuestion`，避免 forced QNA 造成 freeze 卡住。
- [debug ui] Debug Panel Events 清單新增每個事件的 `Force` 按鈕與 override 勾選（Ignore Cooldown / Ignore Pause / Skip Tag Requirement）。
- [debug] 新增觀測欄位：`event.debug.lastForcedEventKey`、`event.debug.lastForcedAt`、`event.debug.lastForcedOptions`、`event.debug.forcedEventCount`、`event.lastCommitBlockedReason`，並在 `lastEvent` 顯示 `forcedByDebug/forceOptions`。

### Docs
- README Debug 區段補充 Force Execute 使用規則與「僅限開發使用」警示。
- PR_NOTES 同步更新影響範圍、SSOT、debug 欄位與驗收結果。

## 2026-03-02（SFX tracing + debug test panel）

### Changed
- [audio/debug] Debug overlay 新增 `SFX Tests`：可直接測 `footsteps` / `ghost_female`、Stop all、Ignore pause/cooldown、Master volume slider。
- [audio] SFX 播放改為可觀測 `PlayResult`，每次播放都回傳成功/失敗與 reason，避免 silent fail。
- [audio] 在播放管線增加逐段 trace：`play_called`、`asset_loaded`、`paused_gate`、`cooldown_gate`、`audio_locked`、`node_chain_ready`、`play_started`、`ended`、`error`。
- [audio] 距離接近參數加安全下限：`startGain >= 0.05`、`endGain <= 0.9`、`LPF cutoff >= 200Hz`、`playbackRate 0.95~1.08`。
- [events/debug] 事件效果新增 plan/applied 追蹤：`event.lastEvent.effects.plan` 與 `event.lastEvent.effects.applied`，可定位「事件成立但效果沒播」的落點。

### Docs
- README 補充 Debug SFX Tests 操作與 PlayResult/trace 欄位說明。
- PR_NOTES 同步新增本次 SFX root-cause 排查與修正摘要。

## 2026-03-02（question_send_failed 卡死根治）

### Changed
- [events] 修正 cooldown/lock commit 時機：只有事件確實開始才 commit；`question_send_failed`（未送出 starter tag / 未觸發 pre-effect）會 rollback cooldown，避免 `cooldown_blocked` 假鎖死。
- [freeze/qna] tagged question freeze 增加 guard：必須同時 `questionHasTagToActiveUser=true` 與 `ui.replyBarVisible=true` 才允許進入 hard freeze；不成立時即刻 release。
- [watchdog] 新增 freeze watchdog：`isFrozen && freezeCountdownRemaining<=0` 時自動解凍、`chat.pause=false`、scroll mode 回 FOLLOW。
- [debug] 新增一鍵救援按鈕 `Reset Stuck State`，可同步 reset freeze/pause/qna/event queue/cooldown。
- [debug fields] 新增 `event.cooldownMeta[eventKey].nextAllowedAt/lastCommittedAt/lastRollbackAt` 與 `event.freezeGuard(hasRealTag/replyUIReady/freezeAllowed)`。

### Docs
- README 新增「卡死時如何復原」與「事件 cooldown/lock commit 規則」。
- PR_NOTES 補充風險、重現步驟與 web/local 驗證腳本。

## 2026-03-02（event registry ssot + audio reference audit）

### Changed
- [events/ssot] `src/events/eventEffectsRegistry.ts` 改為由 `src/core/events/eventRegistry.ts` 推導事件效果，移除雙配置漂移風險。
- [events/debug] 啟動時新增 `[EVENT_REGISTRY]` console snapshot：`count/eventIds/hasGhostFemale/hasFootsteps`。
- [audio/debug] Scene debug overlay 新增「資源對照檢查」：`audio.loadedKeys`、`event.referencedAudioKeys`、`event.missingAudioRefs`、`audio.context.state(distance)`。
- [debug ui] 新增 `Test Ghost SFX` / `Test Footsteps SFX`，輸出 `[EVENT_TRIGGERED]` / `[EVENT_SKIPPED] reason=lock/cd/missing_asset`。

### Docs
- README 新增本次 registry 與資源對照檢查說明。
- PR_NOTES 更新全專案 key 盤點、SSOT 結論與驗證步驟。

## 2026-03-03（event audio stuck state-machine hardening）

### Changed
- [events/audio] 事件音效觸發升級為狀態機：`idle | playing | cooldown`，新增 `lastTriggeredAt`、`cooldownUntil`，並加入 playing timeout fallback，避免 `onended` 未觸發造成永久 stuck。
- [events/debug] Event Tester 每事件新增 `Trigger / Force Execute / Unlock`，並顯示 `state`、`cooldownRemaining`、`lastTriggeredAt`、`pre/post key`、`lastResult/reason`。
- [audio/debug] 新增一次性 `Enable Audio` 解鎖入口，debug 顯示 `audioContextState` 與最近一次解鎖結果。
- [events/log] 統一 console 格式：`[EVENT_TRIGGERED]`、`[EVENT_SKIPPED]`、`[EVENT_PLAY_FAIL]`、`[EVENT_STATE]`。

### Docs
- README 補充事件音效狀態機與 debug 操作（Trigger / Force Execute / Unlock / Enable Audio）。
- PR_NOTES 更新本次盤點、SSOT、debug 欄位變更與驗收步驟。

## 2026-03-03（activeUser mention bootstrap + row highlight）

### Changed
- [chat/bootstrap] Username Confirm 同一手勢完成 activeUser 註冊（`usersById` + `usersByHandle(lowercase)`），`bootstrap.isReady=true` 後立即可被 `@mention`，不再需要先發言。
- [chat/mention] 訊息進入 reducer 前統一解析 `mentions: string[]`（由 registry `usersByHandle` resolve userId）；highlight/判斷改讀 `message.mentions`，不再依賴純字串 `includes("@name")`。
- [ui/chat] 新增「tag 你」整列底色 highlight（含左側細線）；僅在 `mentions` 包含 `activeUserId` 且 `author != activeUser` 時啟用，system 訊息不套用。
- [qna/event] tagged-question 判斷改讀 `questionMessage.mentions`，與 pin/reply/freeze 流程保持一致，移除對「是否先發言」的隱性依賴。
- [debug] 新增 mention/bootstrap 驗證欄位：`activeUser.displayName`、`activeUser.registryHandleExists`、`mention.lastParsedMentions`、`mention.lastHighlightReason`、`mention.tagHighlightAppliedCount`。

### Docs
- README 補充「一開始就可被 tag + row 背景高亮」規格與 debug 驗證點。
- PR_NOTES 更新 root-cause、修正策略、驗收結果與 debug 欄位。


## 2026-03-03（tag start flow：append → scroll → pin → freeze）

### Changed
- [chat/tag-flow] 新增 `src/chat/tagFlow.ts`，將被 tag 起始流程固定為單一路徑：先 append 題目訊息、等待兩個 paint、強制置底、設定 pinned reply、最後 freeze。
- [chat/scroll/mobile] 新增 `src/chat/scrollController.ts`，`ChatPanel` 以單一 `chatScrollRef` 註冊容器，`forceScroll` 統一只操作聊天室容器（不使用 `window.scrollTo`），並做一次 rAF 二次置底。
- [qna] `sendQnaQuestion` 改走 `runTagStartFlow`，將「tag 訊息插入 + 置底 + 顯示 pinned + freeze」整合成同一條流程，避免先 pause 導致置底被 gate 擋掉。
- [debug] 補齊追蹤欄位：`chat.scroll.containerFound/lastForceReason/lastForceAt/lastForceResult/metrics`、`chat.pause.setAt/reason`、`ui.pinned.visible/textPreview`，並補 `[SCROLL] / [PIN] / [PAUSE]` 打點。

### Docs
- README 補充 Tag Start Flow 固定順序、debug 觀測項與 mobile 容器策略。
- PR_NOTES 更新本次影響範圍、驗收案例與 debug 欄位調整。


## 2026-03-03（classic mode architecture doc）

### Changed
- [docs] 新增 `docs/20-classic-mode-architecture.md`：以目前程式碼現況完整整理 classic mode 架構（入口、播放器、音效、聊天室、QNA、debug 契約、狀態機、資料流、擴充點與最小重構建議）。
- [docs] `README.md` 新增 Architecture Docs 區塊，加入 classic mode 架構文件索引連結。

### Docs
- PR_NOTES 更新為本次 docs-only 變更與驗收結果（播放器/音效/聊天室/手機/桌機/debug 全項 PASS，未改動邏輯）。

## 2026-03-04（sandbox_story Ghost Event Debug Monitor）

### Changed
- [debug/sandbox] 在 `Sandbox Story Debug Tools` 新增 `Ghost Event Monitor`，列出 7 個鬼動事件（`VOICE_CONFIRM`、`GHOST_PING`、`TV_EVENT`、`NAME_CALL`、`VIEWER_SPIKE`、`LIGHT_GLITCH`、`FEAR_CHALLENGE`）的 `status/pre/post/cooldown/lock`。
- [debug/sandbox] `status` 依規則顯示：`ready`（可觸發）、`cooldown`（冷卻中）、`locked`（系統鎖定）。
- [debug/sandbox] 新增 `Ghost System` 摘要：`activeEvents`、`queue`、`lastEvent`、`cooldownCount`。
- [debug/sandbox] 新增 `[Trigger Random Ghost]`，可隨機觸發一個目前 `ready` 的事件，供快速測試。
- [debug/sandbox] 新增 debug state 讀取函式（唯讀）並以 500ms interval refresh。

### Docs
- README 更新 sandbox_story debug tools 說明與 Ghost Event Monitor 欄位。
- PR_NOTES 同步更新本次變更與驗收結果。

## 2026-03-04（sandbox consonant flow hardening / ghost-footsteps gating）

### Changed
- [sandbox scheduler] 簡化 sandbox scheduler phase：僅保留 `awaitingTag → awaitingAnswer → revealingWord`，移除 `chatWaveRelated/preNextPrompt` 並改為 PASS 揭示完成後直接切下一題。
- [sandbox consonant] 修正 PASS 後題目推進與索引同步，debug 可追 `currentIndex/currentConsonant/currentWordKey`。
- [sandbox hint] `classicConsonantAdapter` 新增 hint 介面；sandbox 的 unknown/wrong 皆走 classic 風格提示且停留同題 `awaitingAnswer`。
- [sandbox reveal] `WordRevealOverlay` 改為同一文字框顯示 `baseConsonant + appended`，append 以 `Array.from()` 漸進補齊，並調整 reveal 動畫為 fadeIn 800ms / hold 600ms / fogOut 900ms。
- [sandbox ghost gate] 新增 `canTriggerGhostMotion()` 單一入口；sandbox 子音流程一律阻擋 ghost/TV/light 觸發，並紀錄 `ghost.gate.lastReason`。
- [sandbox footsteps] 將 footsteps 觸發機率與冷卻綁定 fearLevel，fear 越高機率越高、冷卻越短；debug 新增 probability/cooldownRemaining/lastAt。

### Removed
- [sandbox] PASS 後 related 討論波與 preNextPrompt 驚訝/猜測波（不再並存舊流程）。

## 2026-03-04（sandbox WordRevealOverlay A/B visual spec rebuild）

### Changed
- [sandbox/reveal] `WordRevealOverlay` 重做為單一文字容器渲染，支援 `renderMode: pair | fullWord`；預設先走 `fullWord` 保底，完整單字同一行顯示並將第一個 grapheme 上色。
- [sandbox/reveal] reveal phase 統一改為 `idle → enter → pulse → exit → done`，時序對應 `200ms fade-in + 2x pulse + 900ms scale/fade-out`。
- [sandbox/reveal] Thai 字元拆分統一使用 `Array.from()`，新增 `baseChar/restTextLen` state 供 debug 與驗收。
- [sandbox/debug] 新增 `word.reveal.renderMode`、`word.reveal.baseChar`、`word.reveal.restTextLen` 欄位，並保留 `word.reveal.phase` 供動畫核對。
- [sandbox/isolation] 變更僅在 sandbox_story reveal pipeline 與其掛載 UI；classic mode 無變更。

### Docs
- README 補上 sandbox WordRevealOverlay A/B 規格、動畫時序、debug 欄位與 Removed/Deprecated 記錄。
- PR_NOTES 更新本次驗收項目（尺寸/脈衝/退場/首字上色/Classic isolation）與 debug 值範例。

## 2026-03-04（sandbox reveal 強制 A：單一 overlay、同字級同步動畫）

### Changed
- [sandbox/reveal] 強制改為 A 模式：reveal 期間只渲染單一 `WordRevealOverlay`，並隱藏題目子音泡泡（避免「子音泡泡 + 補字泡泡」雙元素並存）。
- [sandbox/reveal] Overlay 文字結構固定 `revealGlyph--base + revealGlyph--rest`，兩段共享 `revealGlyph` 字級與行高（同大小）。
- [sandbox/reveal] pulse/exit 動畫統一作用於父層：`2x pulse` 後 `scale(1→1.18) + opacity(1→0) + translateY`，base/rest 同步閃爍並一起放大淡出。
- [sandbox/grapheme] 新增 Thai grapheme splitter：優先 `Intl.Segmenter('th', { granularity:'grapheme' })`，不支援時 fallback `Array.from()`。
- [sandbox/reveal-data] reveal state 與 debug 欄位改為 `baseGrapheme/restText/restLen/splitter`；correct 取完整 rest，wrong/unknown 取提示用 rest（1~2 grapheme 或節點 hint）。
- [sandbox/flow] reveal phase tick 改為只看 `reveal.visible`，因此 wrong/unknown 也會完整跑 A 動畫，結束後回 `awaitingAnswer`。
- [sandbox/debug] 新增 `ui.consonantBubble.visible`、`word.reveal.baseGrapheme`、`word.reveal.restText`、`word.reveal.restLen`、`word.reveal.splitter`。

### Removed
- [sandbox/deprecated] 移除 reveal `renderMode(fullWord/pair)` 分流；本次固定單一路徑 A，不再保留 B 作為預設/保底。

## 2026-03-04（sandbox reveal 純文字 + 隨機位置安全區）

### Changed
- [sandbox/reveal-ui] 新增 `SandboxWordRevealText`，reveal 改為純文字浮現（無背景、無邊框、無泡泡 class）。
- [sandbox/reveal-typography] `base/rest` 統一同字體、同字級、同 line-height，視覺上為同一單字；`base` 僅做 accent 色。
- [sandbox/reveal-motion] 動畫維持 `enter → pulse(2x) → exit`，pulse 改為文字亮度/透明度脈衝，exit 為 scale up + opacity fade。
- [sandbox/reveal-position] 每次 reveal 開始時生成一次 `position(xPct,yPct)`，safeRect 固定 `x:8~92, y:8~74`；reveal 期間位置固定，下一次 reveal 重新抽樣。
- [sandbox/debug] 新增 `word.reveal.position.*` 與 `word.reveal.safeRect`，並保留 `word.reveal.phase/base/rest/restLen`、`ui.consonantBubble.visible` 觀測。
- [sandbox/isolation] 變更僅在 sandbox_story reveal pipeline；classic mode 無改動。

### Removed
- [sandbox/deprecated] 移除舊 `WordRevealOverlay.tsx` 與其底色文字框 CSS（`word-reveal-overlay/revealText/revealGlyph`）。

### Docs
- README、PR_NOTES 同步本次 reveal 視覺規格、安全區與驗收表。

## 2026-03-04（sandbox PASS 不跳題修正：統一 correct pipeline + reveal done 保底）

### Scope / Isolation
- 僅調整 sandbox_story 流程與 debug 面板；classic mode 未改。

### Changed
- [sandbox/correct] 統一真實答對與 debug PASS 行為，兩者都走 `applyCorrect() → startReveal() → done → advancePrompt()`。
- [sandbox/reveal] 新增 reveal done 保底（總時長 2100ms），即使動畫/rerender 異常，仍會強制進入 done。
- [sandbox/advance] done 後一律嘗試 `advancePrompt("correct")`；若被 gate 擋住則記錄 `scheduler.blockedReason` 並每 200ms 重試，最多 10 次。
- [sandbox/ssot] prompt 推進改由單一路徑 `advancePrompt()` 處理，更新 node 與 prompt.current（避免分叉）。
- [sandbox/debug] 新增欄位：
  - `scheduler.blockedReason`
  - `sandbox.prompt.next.id`
  - `sandbox.advance.lastAt/lastReason`
  - `sandbox.reveal.doneAt`
  - `sandbox.debug.pass.clickedAt/action`

### Removed / Deprecated
- [sandbox/deprecated] 移除 debug PASS 以 state-only 直接改結果的舊行為（不再允許繞過引擎流程）。

### Acceptance
- 按一次 PASS：reveal 完成後會跳下一題（`prompt.current.id` 變更）：PASS。
- 真實答對：同樣會跳下一題：PASS。
- 被 gate 擋住時：debug 可見 `blockedReason`：PASS。
- Classic mode 不受影響：PASS。

## 2026-03-04（sandbox only：換題鎖定 + unknown hint + 4s reveal + debug PASS）

### Scope / Isolation
- 僅調整 `sandbox_story`；classic mode 無邏輯變更。

### Changed
- [sandbox/advance-gate] `advancePrompt()` 僅接受 `correct_done | debug_pass`，其餘 reason 一律 blocked（`not_correct_or_pass`）。
- [sandbox/unknown] `unknown` 解析補齊 `不知道 / 不確定 / idk / ?`，unknown 僅顯示 hint，不 reveal、不 advance。
- [sandbox/judge] wrong 與 unknown 都不會觸發 reveal，也不會推題。
- [sandbox/reveal] reveal 只在 correct 啟動，固定中心、4000ms 動畫，完成後自動 `advancePrompt('correct_done')`。
- [sandbox/debug-pass] Debug PASS 改為直接 `advancePrompt('debug_pass')`，並重置 reply/freeze/reveal 相關狀態。
- [sandbox/debug-fields] 補齊欄位：`hint.active/lastShownAt`、`word.reveal.active/wordKey/durationMs`、`advance.*`、`prompt.current.*`、`judge.*`。

### Removed / Deprecated
- [sandbox/deprecated] 移除「wrong/unknown 進 reveal」舊路徑。
- [sandbox/deprecated] 移除「PASS 走 applyCorrect 再 reveal」舊行為，改為強制跳題用途。

### SSOT / Debug 記錄
- SSOT 維持 `sandbox.prompt.current` 單一來源，題目顯示與 judge/hint/reveal 全部共用同一 prompt。
- mismatch（UI consonant vs current prompt）時，流程阻擋並寫入 `advance.blockedReason=mismatch`。

### 驗收表
- 1) 玩家輸入「不知道」：出現提示，prompt 不變：PASS
- 2) 玩家亂打字（非正確、非不知道）：不換題：PASS
- 3) 玩家答對：顯示置中單字放大 4 秒淡出，結束後自動換題：PASS
- 4) 按 PASS：立即換題（不需答對）：PASS
- 5) Classic mode 不受影響：PASS

## 2026-03-04（sandbox input/parser + prompt glyph blue restore）

### Scope / Isolation
- 僅調整 `sandbox_story` 輸入解析、debug 欄位與 prompt glyph 樣式掛載；classic mode 無邏輯與樣式變更。

### Changed
- [sandbox/input] 新增 sandbox 專用 normalize：保留英文、數字、注音、中文與標點；`trim + collapse spaces + 全形空白轉半形空白`。
- [sandbox/parser] 子音題 parser 支援 `A/a/1`、`B/b/2`、`C/c/3`；unknown 支援 `不知道/不確定/idk/?/？`。
- [sandbox/block] 若 normalize 後為空字串，會阻擋推題、寫入 `input_sanitized_to_empty`，並走提示流程。
- [sandbox/debug] 新增 `inputRaw/allowedSetsHit/matched/blockedReason` 與 `ui.promptGlyph.*` 欄位供驗收。
- [sandbox/ui] prompt glyph 補上 sandbox scope class 與 CSS vars，恢復藍色顯示，避免被其他 overlay/全域樣式覆蓋。

### Removed
- 無。

### Acceptance
- `A` 可命中 parser 並走正確流程：PASS
- `idk` / `?` 會判定 unknown 並顯示提示：PASS
- 注音輸入（如 `ㄅㄆㄇˋ`）不會被清空，debug `input.norm` 保留：PASS
- sandbox 題目子音恢復藍色：PASS
- classic mode 不受影響：PASS

## 2026-03-05（sandbox chat engine）

### Added
- 新增 `src/sandbox/chat/chat_engine.ts`：sandbox 聊天引擎（自動訊息、idle 偵測、thai 混合、VIP summary、結尾崩潰序列）。
- 新增 `src/sandbox/chat/user_generator.ts`：聊天室帳號生成器，避免重複名稱。

### Changed
- `src/app/App.tsx` sandbox 模式接入新聊天引擎，改由 engine `start()/stop()/nextMessage()` 驅動訊息 append。
- sandbox `awaitingWave` 不再走舊的本地 wave 迴圈，統一由 sandbox chat engine 輸出，避免新舊邏輯並存。

## 2026-03-05（sandbox supernatural event system）
- [sandbox_story/chat] 新增 `SUPERNATURAL_EVENTS` 事件池：`none(40%) / ghost_voice(20%) / tv_on(15%) / screen_glitch(15%) / footsteps(10%)`，並在答對後流程串接 `CHAT_RIOT -> SUPERNATURAL_EVENT -> VIP_TRANSLATE`。
- [sandbox_story/chat] 新增 `GHOST_HINT_EVENT`（非答題期間可觸發 `ghost_voice/screen_glitch/tv_on`）與對應推理聊天室語料。
- [sandbox_story/audio/story] `footsteps` 新增距離層級輸出（`footstep_far / footstep_mid / footstep_near`），不影響 NIGHT_01 與 quiz/consonant 主流程。


## 2026-03-05（sandbox NIGHT_01：intro phase gate + pipeline lock + classic options isolation）

### Scope / Isolation
- 僅調整 sandbox_story（`src/app/App.tsx`）流程與 debug；classic mode 無邏輯變更。

### Changed
- [sandbox/phase-gate] 新增 story phase gate：`N1_INTRO_CHAT(30s) -> N1_QUIZ_LOOP`，intro 期間禁止出題。
- [sandbox/prompt-gate] `askSandboxConsonantNow()` 僅在 `scheduler.phase=awaitingTag` 且 `storyPhaseGate=N1_QUIZ_LOOP` 才送出 `mod_live` 子音題。
- [sandbox/pipeline-lock] submit in-flight 的重複輸入不再沉默，會回覆「收到，等一下，正在處理上一題。」並記錄 `sandbox_double_submit`。
- [sandbox/recover] 同題 prompt 若卡住，3 秒後允許重送同題 prompt（去除永遠只發第一次的黏住狀態）。
- [sandbox/classic-isolation] sandbox 模式阻擋含「（選項：...）」字樣的 NPC 訊息，防止 classic 模板混入。
- [sandbox/debug] 新增 debug 欄位：
  - `sandbox.storyPhaseGate.phase/introStartedAt/introEndsAt/introRemainingMs`
  - `chat.lastEmit.source/sourceTag/sourceMode`

### Removed / Deprecated
- [sandbox/deprecated] sandbox 內已停用 classic 選項模板訊息輸出（違規即 blocked）。


## 2026-03-05（sandbox only：PREHEAT/FREEZE/GLITCH_BURST/STEP SSOT）

### Changed
- [sandbox/flow] 將 sandbox chat 問答循環收斂為具名 step SSOT（`SandboxFlowStep`），統一以 `setFlowStep()` 推進，並在 transition 重設 `tagAskedThisStep` 與記錄 debug transition。
- [sandbox/player] sandbox init 即建立 `player.handle`（fallback `000`），不再等待玩家先發言才可被 `@`。
- [sandbox/freeze] 等玩家回覆階段（子音與意思）一律 `freeze.frozen=true` + `reason=AWAIT_PLAYER_INPUT`，聊天室 0 output。
- [sandbox/glitch] 玩家回覆後新增 glitch burst（10 則、250~450ms）再進 reveal / 後續流程。
- [sandbox/fix] 修正第 2 題後卡住：每題固定走完整鏈，`REVEAL_WORD` 必達。
- [sandbox/pacing] sandbox chat engine 常態節奏調整為 800~1600ms（freeze 例外 0 output、glitch 例外快刷），classic 未改。

### SSOT
- [x] SSOT changed
  - `SandboxStoryState.flow.step` 改為 `SandboxFlowStep`，新增 `askedAt/lastAnswerAt/lastRevealAt/tagAskedThisStep`。
  - 新增 `freeze`、`glitchBurst`、`player` 狀態節點，作為 sandbox chat state machine 的唯一真相。

### Debug 欄位變更紀錄
- 新增：
  - `sandbox.flow.step`（具名 step）
  - `sandbox.freeze.frozen/reason/frozenAt`
  - `sandbox.glitchBurst.pending/remaining/lastEmitAt`
  - `sandbox.player.handle/id`

### Acceptance
- 1) sandbox 一進場即可在預熱期 `@玩家`：PASS
- 2) 30 秒 PREHEAT 不出題：PASS
- 3) 問句一次制 + 等待期間 freeze：PASS
- 4) 玩家回覆後 glitch burst 10 則，再 reveal 與後續流程：PASS
- 5) 連跑至少 3 題，不再第 2 題卡住：PASS
- 6) classic mode 未修改：PASS

## 2026-03-05（sandbox only：Preheat Script 固定序列 + 30 秒出題硬門檻）

### Scope / Isolation
- 僅調整 sandbox 聊天與 sandbox 出題 gate；**classic mode 未修改**。

### Changed
- [sandbox/preheat-script] 新增 `src/sandbox/chat/preheat_script.ts`，導入 `PREHEAT_SCRIPT` 固定時間序列（0~20s，12 條）。
- [sandbox/vip-identity] 新增 `src/sandbox/chat/vip_identity.ts`，Sandbox VIP SSOT 固定為 `👑 behindyou`（`id=sandbox_vip_behindyou`、`role=vip`、`badge=crown`），移除隨機/字串型 VIP 帳號來源。
- [sandbox/chat-engine] `src/sandbox/chat/chat_engine.ts` 在 `phase=intro` 期間改為逐條 dispatch 固定序列（`preheatScriptCursor` 單次發送），序列播完才回到 `casual_pool / observation_pool` 隨機聊天。
- [sandbox/player-handle] sandbox chat context 新增 `introStartedAt`，並持續以 `state.player.handle` 替換 `{{PLAYER}}`，確保 VIP 可主動 `@玩家`。
- [sandbox/overlay-gate] `src/app/App.tsx` 新增 `canShowConsonantOverlay=introGate.passed`，前 30 秒強制不顯示子音 overlay。
- [sandbox/preheat-cleanup] 移除 preheat 階段隨機 VIP 暖場句，改由固定腳本保證演出順序與內容。

### Debug 欄位變更紀錄
- 既有欄位沿用並可驗證本次行為：
  - `sandbox.introGate.startedAt/minDurationMs/passed/remainingMs`
  - `sandbox.player.handle`
  - `sandbox.prompt.overlay.consonantShown`

### Acceptance
- 1) 進 sandbox 0~20 秒：可見 VIP 主動 `@玩家`、熟客互動、質疑句：PASS
- 2) 0~30 秒不出題且不顯示子音 overlay：PASS
- 3) 30 秒到點才出第一題子音：PASS
- 4) classic mode 未修改：PASS


## 2026-03-06（sandbox only：freeze 外層總閘 / glitch 分流 / anti-spam hard guard / WORD_RIOT 第2題卡死修補）

### Changed
- [sandbox/emit-gate] 在 `App.tsx` 的 sandbox chat 單一 dispatch 入口新增 `canSandboxEmitChat()` 總閘；`freeze.frozen=true` 時僅允許 `GLITCH_BURST`，其餘來源一律硬擋。
- [sandbox/glitch-pool] `chat_engine` 將 `san_idle` 於 engine 內部分流為 `san_idle_general` 與 `san_idle_glitch`；一般路由不再抽 glitch 語氣，burst 專用 glitch 子集；並新增 dev assert 確保 glitch 子集非空。
- [sandbox/anti-spam] `chat_engine` 新增可真正 skip 的 anti-spam guard：emitKey cooldown（3.5s）、speaker run guard、tag_player 問句重覆抑制與 fallback（observation/casual）。
- [sandbox/ask-player] `ASK_PLAYER_MEANING` 改為 once-per-step：送出成功即 `tagAskedThisStep=true`、切 `WAIT_PLAYER_MEANING` 並 freeze；重入時不再重複發問。
- [sandbox/word-riot] 修正 `sandboxWaveRunningRef` 題間 reset 與推進 SSOT：`WORD_RIOT -> VIP_TRANSLATE` 改成 timer 單一路徑推進，並在離開/advance 時強制 reset lock，避免第二題後卡死。
- [sandbox/intro-gate] 新增 `canAskConsonantNow()`，force ask/debug ask 入口統一共用，封住 intro gate 旁路。

### Root Cause（第2題卡死）
- `WORD_RIOT` 同時存在多條可能推進路徑（step 內直接推進 + 其他 callback 路徑），且 wave lock 沒有每題保證 reset；第二題後可能保持 `sandboxWaveRunningRef=true`，造成後續無法再進入有效 riot 推進。

### Scope Guard
- 僅 sandbox 路徑修改；classic mode 未修改。

## 2026-03-06（sandbox only：PREJOIN joinGate + join 後立即 @玩家 + classic reply-to 強制回覆）

### Root Cause
- 舊流程把玩家身份建立綁在 `onPlayerMessage`（玩家第一則訊息）之後；導致「只提交名稱但未發言」時，聊天室找不到可提及的玩家 handle，`@玩家` 不會穩定出現。

### Changed
- [sandbox/state] `SandboxStoryState` 新增 `joinGate`，flow 新增 `PREJOIN`；init/import 皆以 `joinGate.satisfied=false` + `flow.step=PREJOIN` 起始。
- [sandbox/join] 新增 join path：提交名稱即 sanitize（trim / 去控制字元 / 長度上限）並立即建立 `player.id + player.handle`。
- [sandbox/emit-gate] `canSandboxEmitChat()` 改為單一總閘：
  1) `joinGate.satisfied=false` → 一律 0 output
  2) reply-to active → 一律 0 output
  3) 其餘才允許（freeze/glitch 規則照舊）
- [sandbox/reply-to] join 後立即送出 VIP `@玩家` 問句，並用既有 classic reply-to render path（`runTagStartFlow + ChatPanel replyPinBar`）啟動強制回覆 gate。
- [sandbox/unfreeze] 玩家送出非空回覆後才 clear reply-to / clear freeze，聊天室才恢復 PREHEAT 節奏。

### Scope Guard
- 僅 sandbox 路徑修改；classic mode 未修改。

## 2026-03-06（sandbox only：Silent Prompt + possession autosend + reply-to 再鎖一次 + tech backlog）

### Changed
- [sandbox/flow] `SandboxFlowStep` 改為單一路徑：`PREJOIN -> PREHEAT -> TAG_PLAYER_1 -> WAIT_REPLY_1 -> POSSESSION_AUTOFILL -> POSSESSION_AUTOSEND -> CROWD_REACT_WORD -> TAG_PLAYER_2_PRONOUNCE -> WAIT_REPLY_2 -> FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`。
- [sandbox/prompt] 第一段出題改為 Silent Prompt：overlay 顯示子音、聊天室不發題目公告，直接 `@玩家` + classic reply-to freeze。
- [sandbox/input-wrapper] 新增 sandbox input wrapper 控制（ChatPanel `sandboxControl`）：可 programmatically 寫入 input value，並觸發同一 `submitChat()` 送出管線。
- [sandbox/possession] 玩家回覆第一段後，300~700ms 自動送出本題單字（視覺上等同玩家輸入送出）。
- [sandbox/crowd] 新增 `emitCrowdReactWord(4~8)`，固定帶入「什麼意思／拼音怎麼唸」類觀眾追問。
- [sandbox/reply2] 第二段由 `mod_live` 或 VIP 再次 `@玩家` 問「所以到底怎麼唸？」並再次進 reply-to freeze（0 output）。
- [sandbox/backlog] 新增 tech backlog：reply-to active 每 30 秒累積 2 則，最後包含「奇怪卡了大約 X 分鐘」；解鎖後 `FLUSH_TECH_BACKLOG` 一次 flush（<=8）再 `ADVANCE_NEXT`。
- [classic] 未修改。

## 2026-03-06（sandbox only：tech backlog 僅 Tag#3 WAIT 啟用）

### Changed
- [sandbox/flow] 新增第三次 tag 節點：`TAG_PLAYER_3_MEANING` / `WAIT_REPLY_3`，並更新主流程到 `... -> WAIT_REPLY_2 -> TAG_PLAYER_3_MEANING -> WAIT_REPLY_3 -> FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`。
- [sandbox/ssot] `SandboxStoryState.flow` 新增 `currentTagIndex: 1|2|3`，step 切換時同步更新，供 backlog gate 判斷。
- [sandbox/backlog-gate] tech backlog 累積條件收斂為：`currentTagIndex===3 && flow.step===WAIT_REPLY_3 && reply-to active`。
- [sandbox/wait-silence] `WAIT_REPLY_1/2/3` 全部維持 0 output；chat engine 在三個 WAIT step 一律不發訊息（含 glitch burst）。
- [sandbox/backlog-accumulate] 只在 `WAIT_REPLY_3` 每 30 秒累積 2 則 backlog，且最後一則固定分鐘文案。
- [sandbox/backlog-flush] 玩家回覆第三次 tag 後才進 `FLUSH_TECH_BACKLOG`，一次 flush `<=8` 則再推進。
- [classic] 未修改。

### Acceptance
- 1) Tag#1 WAIT 長時間不回覆，聊天室 0 output 且無 tech 字樣：PASS。
- 2) Tag#2 WAIT 長時間不回覆，聊天室 0 output 且無 tech 字樣：PASS。
- 3) Tag#3 WAIT 每 30 秒背景累積 2 則 tech backlog（不顯示）：PASS。
- 4) 回覆 Tag#3 後一次 flush（<=8，含「卡了 X 分鐘」）再推進：PASS。
- 5) 技術故障字樣只出現在 Tag#3 回覆後 flush 波次：PASS。
- 6) classic mode 未修改：PASS。

## 2026-03-07 Sandbox NIGHT_01 判題接線修復（sandbox only）

- 修復 sandbox 玩家回覆後未跑 parser/judge：`submitChat -> consumePlayerReply` 在 `WAIT_REPLY_* + consonant prompt` 期間改為接 classic 判題 pipeline。
- 新增 WAIT_REPLY gate：僅 `correct/pass` 可離開 WAIT；`wrong/unknown` 保持等待，不再直接完成題目。
- 修正 prompt/pinned 同源：`askSandboxConsonantNow` 發送訊息與 pinned 皆採同一題目 prompt。
- 新增 mention 前綴容錯：parser normalize 先 strip leading mentions，避免 `@npc` 阻斷答案解析。
- 補齊 sandbox debug judge 區塊輸出：`sandbox.judge.result/classicResult/sandboxClassicParity/blockedReason`。
- classic mode 未修改。
