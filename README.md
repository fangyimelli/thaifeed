## 2026-03-08 Sandbox NIGHT_01 live-chat flow hardening（sandbox only）

- NIGHT_01 首題 emitter 收斂：移除 system 教材式出題文案，第一題正式提問只允許聊天室角色（`mod_live`）tag 玩家。
- PREHEAT 30s 僅保留自然聊天來源（viewer/mod/vip + join），不再由 system 送「加入聊天室」訊息。
- flow 推進收斂為：`PREJOIN -> PREHEAT -> WARMUP_TAG(INTRO_CHAT_RIOT) -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1 -> POST_ANSWER_GLITCH_1 -> NETWORK_ANOMALY_1 -> ADVANCE_NEXT`。
- autoplay mock 依 `gateType` 產生回覆並直接 `consumePlayerReply`，確保 WAIT_REPLY 可自動推進到 `ADVANCE_NEXT`。
- 新增 sender+gate duplicate guard：同 sender 在同 gate 同句重送會被阻擋（防刷屏）。
- `lastReplyEval` 維持每次玩家輸入必寫（consume success / reject / parse miss / no gate）。

## 2026-03-08 Sandbox NIGHT_01 SSOT P0+P1 integration（sandbox only）

- NIGHT_01 flow 以 `sandboxFlow` 單一路徑推進，新增 warmup 與 glitch/anomaly 節點：`PREHEAT -> WARMUP_TAG -> WARMUP_WAIT_REPLY -> REVEAL_1_RIOT -> TAG_PLAYER_1 -> WAIT_REPLY_1 -> POST_ANSWER_GLITCH_1 -> NETWORK_ANOMALY_1`。
- 移除 App 端 `sandboxStoryPhaseGateRef` 雙軌 intro gate，30 秒暖場改由 `sandboxFlow.introElapsedMs` + `introGate.minDurationMs` 決定。
- `gateType` 改為 flow state 欄位（`warmup_chat_reply/consonant_guess/meaning_reply/none`），judge 與 autoplay mock reply 依 gateType 配對。
- debug composing override 改為 purely visual，不再影響正式 submit blocker；debug panel 顯示其 non-authoritative 狀態。
- 更新文件：README / `docs/10-change-log.md` / `docs/sandbox-flow-table.md` / `PR_NOTES.md`。

### Removed / Deprecated Log
- 移除 `sandboxStoryPhaseGateRef`（N1_INTRO_CHAT/N1_QUIZ_LOOP）雙軌 phase gate。

## 2026-03-08 Sandbox deterministic flow rebuild（sandbox only）

- Sandbox flow 收斂為單一路徑：`PREJOIN -> PREHEAT -> TAG_PLAYER_1 -> WAIT_REPLY_1 -> POSSESSION_AUTOFILL -> POSSESSION_AUTOSEND -> CROWD_REACT_WORD -> VIP_SUMMARY_1 -> TAG_PLAYER_2_PRONOUNCE -> WAIT_REPLY_2 -> DISCUSS_PRONOUNCE -> VIP_SUMMARY_2 -> TAG_PLAYER_3_MEANING -> WAIT_REPLY_3 -> FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`。
- 新增 `sandboxFlow` SSOT（step/stepStartedAt/replyGateActive/replyTarget/backlogTechMessages/playerLastReply/questionIndex），sandbox reply gate 與 backlog 僅由此來源控制。
- 移除 sandbox warmup 舊分支（`TAG_PLAYER_WARMUP/WARMUP_*`）及其對 reply gate 的控制。
- sandbox chat 輸出改為 flow-source allowlist；非 flow source（director/chat engine/join/event injectors）在 sandbox 一律阻擋。
- WAIT_REPLY_1/2/3 升級為全域 hard freeze；非玩家輸出直接拒絕。
- tech backlog 併入 `sandboxFlow.backlogTechMessages`，僅 WAIT_REPLY_3 可累積，於 FLUSH_TECH_BACKLOG 一次 flush（最多 8 則）後清空。
- debug 面板固定顯示 `sandboxFlow.step/replyGateActive/replyTarget/backlogTechMessages.length/lastReplyEval`。

## 2026-03-08 Sandbox replyability SSOT 修補（sandbox only）

- 實作單一 reply gate derive：`replyGateArmed/replyGateType/replyTarget/replySourceMessageId/replySourceType/canReply`。
- `canReply` 改為唯一正式判斷來源，preview / submit / consume / debug 全部對齊。
- `sandboxPinnedEntry` 改為純顯示層，新增 `linkedToReplyGate/pinnedSourceId/pinnedSourceType`，明確落實 `pin visible ≠ canReply`。
- auto-pin 改為 message append 後才觸發 pin+gate 連結，修正 source message 未入列時的 writer/source mismatch。
- `lastReplyEval` 擴充為每次 sandbox 玩家輸入必寫，覆蓋 no gate / gate not armed / parse miss / stripped empty / submit accepted / submit rejected / consume fallback。
- debug 顯示補上 `sandbox.replyGate.canReply/sourceType`、`sandbox.lastReplyEval.raw/normalized` 與 pinned linked 狀態。

## 2026-03-08 Sandbox NIGHT_01 warmup reply gate stall 稽核（AUDIT ONLY, sandbox only）

- 本次為 audit-only：不修改 runtime code、不修復、不重構；classic mode 無改動。
- 新增稽核報告：`docs/sandbox-night01-audit-report-2026-03-08-warmup-reply-gate-stall.md`。
- 稽核結論（重點）：
  - 玩家 `@behindyou 24` 送出與 append 均成功，`submitChat()` 後續有執行；問題不在送出失敗。
  - `WARMUP_TAG_REPLY` consume gate 已存在且條件寬鬆（strip mention 後非空即通過）。
  - 真正衝突點是 preheat director 也會送出同句 `@player 嗨嗨，第一次看這台嗎？`，且被 autoPinFreeze pin/freeze，造成 UI 看似在等 warmup 回覆，但 flow 未 armed 到 warmup gate。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無 schema 變更（audit only）。
- Debug：無 runtime 欄位修改；報告明確標示現有可觀測欄位與缺口（缺 `lastReplyEval` / gate source type）。

### Removed / Deprecated Log（本次）

- audit-only，未移除功能邏輯。


## 2026-03-07 Sandbox NIGHT_01 開場暖場 gate 實作（sandbox only）

- 本次直接實作 patch（非 audit-only），僅調整 sandbox 路徑；classic mode 無改動。
- NIGHT_01 開場改為「暖場先行、子音題延後」：
  - 新增 warmup flow steps：`TAG_PLAYER_WARMUP -> WARMUP_TAG_REPLY -> WARMUP_NPC_ACK -> WARMUP_CHATTER -> TAG_PLAYER_1`。
  - 第一個 tag 只作暖場互動，玩家任意非空回覆（含 `@behindyou 對`）即視為完成，不進 parser/judge。
  - 收到暖場回覆後固定由 NPC 接一句「今天氛圍跟之前不一樣」語意，再補 2~4 句自然聊天室續聊。
  - 暖場完成後才建立正式第一題子音 prompt / answer gate / pending question，才進 consonant judge。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT（sandbox flow）：新增 warmup 階段步驟，並將第一題子音切入點延後到 warmup 後。
- Debug：新增 `sandbox.warmup`（`gateActive/replyReceived/replyAt/normalizedReply/judgeArmed`）與 answer 區塊的 warmup/judge armed 快速觀測欄位。

### Removed / Deprecated Log（本次）

- 移除「第一個暖場 tag 同時當成正式子音題」的舊邏輯；改為單一路徑 warmup gate（避免雙軌判題）。


## 2026-03-07 Sandbox NIGHT_01 mention/flow 脫鉤稽核（AUDIT ONLY, sandbox only）

- 本次為 audit-only，不修改 runtime code、不修復、不重構；classic mode 無改動。
- 新增稽核報告：`docs/sandbox-night01-audit-report-2026-03-07-night01-mention-stall.md`。
- 稽核結論（重點）：
  - 玩家訊息有成功送出並 append，但當下未命中 `WAIT_REPLY_* + prompt.current.consonant` 條件，judge pipeline 未啟動。
  - preheat mention（`@<player> 嗨嗨，第一次看這台嗎？`）與真正子音題 prompt 非同源，玩家容易回錯 target。
  - `consonant.promptText/promptCurrent` 可殘留，需以 `prompt.current.promptId + answerGate.waiting` 判斷是否真的在等作答。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無 schema 變更（audit only）。
- Debug：無新增 runtime 欄位；新增 trace 文件，明確區分「訊息送出成功」與「judge 未 armed」。

### Removed / Deprecated Log（本次）

- audit-only，未移除功能邏輯。

## 2026-03-06 Sandbox NIGHT_01 卡關稽核（AUDIT ONLY, sandbox only）

- 本次為 audit-only，不修改 runtime code，不修復、不重構；classic mode 無改動。
- 新增稽核報告：`docs/sandbox-night01-audit-report-2026-03-06-night01-stall.md`。
- 稽核結論（重點）：
  - 玩家訊息有成功送出並 dispatch，但 sandbox consonant judge pipeline 未接線（`commitConsonantJudgeResult` 無實際呼叫鏈）。
  - `askSandboxConsonantNow()` 的 pinned 文案與有效判題 prompt 非同源，導致玩家視覺 target 與 judge target 不一致。
  - `2jo` 對 `บ` 規則上屬不合法輸入，但本案主因仍是 parser/judge 未執行。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無 schema 變更（audit only）。
- Debug：無新增 runtime 欄位；補充「有 prompt 但 flow/judge 可脫鉤」的稽核結論與 trace。

### Removed / Deprecated Log（本次）

- audit-only，未移除功能邏輯。

## 2026-03-06 Sandbox P0 修復：self-tag / pin preview 互斥 / composer 聚焦 / debug 防干擾（sandbox only）

- 僅調整 sandbox 路徑；classic mode 未修改。
- `triggerSandboxAutoPinFreeze()` 不再把 lock target 指向 active user；改為 source actor（提問者）。若 actor 無法正規化，安全降級為不建立可 rewrite 的 lock。
- `submitChat()` 新增 self-target guard：當 lock target 與 active user handle 等價（大小寫不敏感、含 `me`/`t` 等任意 handle）時，不進行 `@target` 重寫，且立即清除 lock，避免送出 `@自己`。
- `ChatPanel` 建立最小互斥：同一時間 reply preview 與 sandbox top pin 不再雙顯示；進入 reply composer flow 時，sandbox pin 自動隱藏。
- pinned 主要焦點改放在 composer 前方（message list 與 input 之間），不再固定在 chat panel 頂部造成誤解。
- debug 防干擾：`Emit NPC Tag @You` 改為 isolated chat injection，不再走事件管線（不寫正式 qna/lock/pin）。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無新增資料模型；強化 invariant：lock target 不可為 active user，否則 submit 時降級為一般送出。
- Debug：新增 `self_lock_target_guard` 異常標記；`Emit NPC Tag @You` 記錄維持在 `sandbox.debug.isolatedActions.*` isolated namespace。

### Removed / Deprecated Log（本次）

- 移除（sandbox debug path）`Emit NPC Tag @You` 經 event pipeline 影響正式 reply/pin/lock 的舊邏輯，改為 isolated debug message-only。

## 2026-03-06 Sandbox P0 修復：交易式 question commit / pin guard / debug 隔離（sandbox only）

- 僅 sandbox 路徑調整，classic mode 行為不變。
- `runTagStartFlow` 改為交易式：append 必須回傳 `{ok,messageId}` 才能進入 pin/freeze/commit；append 失敗直接中止，不寫入 `qna.active.questionMessageId`。
- `dispatchChatMessage` 改回傳落地 `messageId`；所有 sandbox tag flow / qna flow 皆以「實際 append 成功的 messageId」作唯一 commit 來源。
- reply pin bar guard 升級：必須同時滿足 `AWAITING_REPLY + questionMessageId + source message 存在 + lock/source 一致` 才 render。
- source 缺失或不一致時，採安全降級：清除 reply UI、解除 freeze、停止 `AWAITING_REPLY`，避免誤導 fallback。
- debug actions 改 sandbox-safe：
  - `Emit NPC Tag @You` 僅送出 isolated debug 訊息，不再直接改寫正式 qna/lock/pin。
  - `Simulate Send` 改為 isolated debug message path，不推進正式送出流程。
  - `Toggle TagLock(Self)` 改為 isolated debug flag（不再寫正式 replyTarget/lock）。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無資料模型新增；強化 runtime invariant（question commit 必須依賴 append success）。
- Debug：新增/更新 `sandbox.debug.isolatedTagLock` 與 `sandbox.debug.isolatedActions.*`，標示 debug 隔離路徑。

### Removed / Deprecated Log（本次）

- 移除 debug 直接推進正式 qna/pin/lock 的舊路徑（改為 isolated debug path）。

## 2026-03-06 Sandbox NIGHT_01 chat pipeline audit（audit only, sandbox only）

- 本次為 **稽核-only**，未修改功能邏輯；classic mode 無改動。
- 產出可執行稽核報告：`docs/sandbox-night01-audit-report-2026-03-06.md`。
- 已確認 `behindyou` 事件為 mention message（非 reply schema），`↳ @mod_live` 與 `（原始訊息已不存在）` 來自全域 reply pin bar 條件渲染。
- 已確認 `@t` 來源為玩家 handle 本值（資料建立時即為單字元），非 render truncation。
- 已標記 cross-mode leakage 風險：sandbox reply/pin 控制面與 classic qna/lock state 共用。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無資料模型變更（audit only）。
- Debug：無新增 runtime debug 欄位（僅補文件稽核結論與 trace map）。

### Removed / Deprecated Log（本次）

- 本次 audit-only，無移除/廢棄功能邏輯。

## 2026-03-06 Sandbox pinned body 空字串修復（sandbox only）

- 僅 sandbox 變更，classic mode 無改動。
- Root cause：sandbox auto pin 在同一個 dispatch tick 讀 `state.messages` 查 source message，當 message 尚未進 state 時，pinned entry 會拿到空 `text`，UI 最終渲染成 `「」`。
- 修復：`triggerSandboxAutoPinFreeze` 改接收當下 `sourceMessage`，避免 stale state lookup；並新增 pinned body 欄位解析器（`text/content/body/displayText/payload.text`）與 trim 防呆。
- sandbox pinned render 改為「header + 完整 body」；不再輸出空引號，body 為空時顯示 `（原始訊息已不存在）`。
- 驗收重點：VIP direct mention 會顯示完整 pinned reply 文字，非僅 metadata/reason。

## 2026-03-06 Sandbox pinned reply parity with Classic（sandbox only）

- 僅 sandbox 變更，classic mode 無改動。
- 將 sandbox pinned schema 對齊 Classic reply pin：`id/messageId/createdAt/expiresAt/visible/author/body`。
- sandbox pinned formatter 改與 Classic 一致：`↳ @author` + 完整 `body`（不截斷）。
- 移除 sandbox pinned UI 顯示 internal metadata（不再顯示 reason / sourceEventType / metadata）。
- sandbox pinned component 改共用 Classic reply pin 呈現格式（同 `replyPinBar` 結構，僅走 sandbox gating）。
- sandbox pinned lifecycle 對齊 Classic：建立時同步鎖定 reply target、顯示於 pin bar、清除時經既有 `clearReplyUi`/timeout/expiresAt 路徑。
- VIP direct mention 驗收目標維持：chat highlight + pinned reply + chat freeze 同步發生；GHOST_HINT_EVENT follow-up 同樣適用。
- SSOT/Debug 文件同步：`docs/10-change-log.md`、`docs/sandbox-flow-table.md`、`PR_NOTES.md`。


## 2026-03-06 Sandbox 修復：VIP direct mention 只有 highlight、未進 pinned render pipeline（sandbox only）

- 僅 sandbox 變更，classic mode 無改動。
- Root cause：sandbox 自動 pin 流程沿用 `setPinnedQuestionMessage`，但該函式僅允許 `sandboxPromptCoordinator`，導致 `VIP + @玩家` 自動 pin 寫入被 writer guard 擋掉；結果只剩聊天室 highlight/focus，沒有獨立 pinned reply 區塊。
- 修復：新增 sandbox 專用 `sandboxPinnedEntry`（獨立於 highlight/freeze），讓 direct mention 與 story-critical follow-up 都會建立 pinned entry 並透過 `ChatPanel` sandbox 區塊渲染。
- pinned / highlight / freeze 三狀態已拆分：highlight 僅樣式、pinned 為獨立資料與 UI、freeze 為聊天室暫停；同事件可同時觸發三者。
- direct mention 規則（sandbox）：`VIP + @玩家 + direct interaction` ⇒ 保留原訊息高亮 + 建立 pinned entry + freeze，且 pinned 保留時間可觀測（`expiresAt/remainingMs`）。
- 新增 debug 可觀測欄位：`lastDirectMentionDetected`、`lastPinnedCandidateMessageId`、`lastPinnedCreatedAt`、`lastPinnedRenderVisible`、`pinnedStateKey/summary`、`pinnedSourceReason`、`pinnedExpiresAt/pinnedRemainingMs`、`lastPinnedDroppedReason`、`highlightWithoutPinned`、`cleanupClearedPinned`、`pinnedOverwrittenByMessageId`、`pinnedComponentMounted`。
- SSOT/Debug 文件已同步：`docs/10-change-log.md`、`docs/sandbox-flow-table.md`、`PR_NOTES.md`。

## 2026-03-06 Sandbox 修復：VIP @玩家未 pin/freeze + GHOST_HINT_EVENT 主線接續

- 僅 sandbox 變更，classic mode 無改動。
- 新增 sandbox direct interaction 規則：`VIP + @玩家` 視為 direct-to-player，會觸發 pinned reply + chat freeze（預設 6 秒，範圍 5~8 秒）。
- 新增 `GHOST_HINT_EVENT` 主線接續：system hint 後強制一則 VIP follow-up（story-critical），並觸發 pin + freeze（預設 7 秒）。
- 新增 sandbox debug 欄位 `sandbox.audit.autoPinFreeze.*`，可直接觀測「為何有/沒有 pin+freeze」。
- SSOT/Debug 追蹤：已同步更新 `docs/sandbox-flow-table.md`、`docs/10-change-log.md`、`PR_NOTES.md`。

### Removed / Deprecated Log（本次）

- 本次未新增移除/廢棄條目；採整合既有 pinned/freeze pipeline，未引入並存舊邏輯。

# ThaiFeed 團隊維護手冊入口

> 官方維護手冊以 `/docs` 為準。

## 專案定位（短版）

ThaiFeed 是以偽直播形式呈現的互動 Demo，核心是老屋恐怖氛圍與泰文子音互動循環；程式採模組分層與 SSOT 維護。

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Required Assets（最短版）

至少要有 **3 支影片 + 3 支音效**：

- 影片：
  - `assets/scenes/oldhouse_room_loop.mp4`
  - `assets/scenes/oldhouse_room_loop2.mp4`
  - `assets/scenes/oldhouse_room_loop3.mp4`
- 音效：
  - `assets/sfx/fan_loop.wav`
  - `assets/sfx/footsteps.wav`
  - `assets/sfx/ghost_female.wav`

請放在 `public/assets/...`；路徑一律使用相對路徑 `assets/...`，**禁止寫死 `/assets/...`**。

## Base path（部署路徑）

素材 URL 由統一 base path 機制解析，請勿在功能碼自行拼接絕對路徑。詳見：

- [03｜Player System](./docs/03-player-system.md)
- [02｜SSOT Map](./docs/02-ssot-map.md)

## Maintenance Manual（/docs 索引）

- [00｜專案定位與維護哲學](./docs/00-philosophy.md)
- [01｜架構總覽](./docs/01-architecture-overview.md)
- [02｜SSOT Map](./docs/02-ssot-map.md)
- [03｜Player System](./docs/03-player-system.md)
- [04｜Audio System](./docs/04-audio-system.md)
- [05｜Chat System](./docs/05-chat-system.md)
- [06｜Event System](./docs/06-event-system.md)
- [07｜Debug System](./docs/07-debug-system.md)
- [08｜Mobile Layout](./docs/08-mobile-layout.md)
- [09｜Troubleshooting](./docs/09-troubleshooting.md)
- [10｜Change Log](./docs/10-change-log.md)

## Architecture Docs

- [20｜Classic Mode Architecture](./docs/20-classic-mode-architecture.md)
- [30｜Sandbox Story Mode](./docs/30-sandbox-story-mode.md)

## Recent Sandbox Audit Debug Additions

- 新增 sandbox audit debug schema（僅 sandbox）：`introGate`、`flow`、`freeze`、`glitchBurst`、`tagAsked`、`emit key/speaker`、`recentEmitKeys(20)`、`transitions(20)`、`thaiViewer usage`。
- `src/sandbox/chat/chat_engine.ts` 新增防洗版檢測計數（只記錄不阻擋）：`duplicateSpamCount` / `speakerSpamCount` / `freezeLeakCount`。
- classic mode 無變更。


## Sandbox 修補（2026-03-06）

- 修正 sandbox reply preview 查找來源：預覽改為從完整 `state.messages`（傳入 `ChatPanel.messages`）查找 reply target，不再受最後 100 則 render window 限制。
- 修正 sandbox chat scheduler：`WAIT_REPLY_1/2/3` 期間會真正 pause scheduler（停止 `scheduleNext()` 計時），玩家回覆推進 step 後才 resume。
- 修正 `ADVANCE_NEXT` transition 單一來源：`forceAdvanceNode()` 負責切到 `TAG_PLAYER_1`，外層 effect 不再重複 `setFlowStep('TAG_PLAYER_1')`。
- classic mode 未修改。


## 2026-03-06 Sandbox Flow SSOT Hardening（sandbox only）

- PREHEAT 路由防呆：`final_fear` 在 PREHEAT 權重固定為 0，避免預熱期出現收尾高壓訊息。
- TAG step 防重送：`TAG_PLAYER_1/2/3` 每 step 只能送一次 tag，送出後即標記 `tagAskedThisStep=true`。
- reply-to active 全域 freeze：WAIT_REPLY 期間 sandbox scheduler 暫停，聊天室維持 0 output。
- 回覆後硬流程：
  - TAG#1 後：`CROWD_REACT_WORD -> VIP_SUMMARY_1 -> TAG_PLAYER_2_PRONOUNCE`
  - TAG#2 後：`DISCUSS_PRONOUNCE -> VIP_SUMMARY_2 -> TAG_PLAYER_3_MEANING`
  - TAG#3 後：`FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`
- tech backlog 僅 `WAIT_REPLY_3` 可累積（每 30 秒 2 則），flush 最多 8 則且最後一則固定分鐘數。
- classic mode 未修改。

## Sandbox Chat Pools

- SSOT：`src/sandbox/chat/chat_pools.ts` 是 sandbox 聊天語料唯一來源（`CHAT_POOLS`），總數固定 **2050 entries**。
- pool 與用途（精準數量）：
  - `casual_pool`（500）：一般路人台味閒聊。
  - `observation_pool`（300）：畫面觀察與異常提示。
  - `theory_pool`（250）：推理/猜測/解釋，於 `awaitingAnswer`、`revealingWord` 提高路由機率。
  - `thai_viewer_pool`（200）：泰國觀眾訊息，結構為 `{ user, text, thai, translation }`。
  - `fear_pool`（200）：中段恐懼升溫。
  - `guess_character`（150）：角色猜測。
  - `tag_player`（100）：`{{PLAYER}}`/`${playerHandle}` 模板，emit 時替換為目前玩家 handle。
  - `san_idle`（150）：玩家久未回覆時的催促。
  - `vip_summary`（120）：VIP 重點整理。
  - `final_fear`（80）：後段/高壓收束恐怖語氣。
- `thai_viewer_pool.user` 僅允許 `THAI_USERS` 名單，避免多份 Thai user 來源。
- `src/sandbox/chat/chat_engine.ts` 只 consume `CHAT_POOLS`，不再維護平行 mini-pools；Thai viewer message 保留 `thai/translation` 可供 UI/Debug 顯示。
- phase-driven routing（sandbox）：
  - `theory_pool`：`awaitingAnswer`、`revealingWord` 提高出現率。
  - `final_fear`：僅在 ending / 高壓（低 SAN 或 supernatural phase）提高出現率。
- 開發檢查：`assertChatPoolsCounts()` 可驗證 10 池長度與 total=2050；chat engine 僅在 DEV 初始化時呼叫一次。

## Sandbox 與 Classic 子音判定同源（2026-03-05）

- sandbox 子音流程（parse / judge / hint / state transition）改為透過 `parseAndJudgeUsingClassic()` 走 classic 同一套核心；sandbox 只做 thin adapter 顯示，不再自行覆寫結果。
- 修正重大誤判：`consonant=ร` 時輸入 `บ` 現在固定 `wrong`，不再因 keyword shortcut 被判定 `correct`。
- 新增 parity 驗證：每次 sandbox 判定同步輸出 `sandbox.judge.result`、`classic.judge.result`、`sandboxClassicParity`；若 mismatch，直接以 classic 結果覆寫並標記 `blockedReason=parity_mismatch`。
- Debug Tester 保留 `ForceCorrect`，但改為「按鈕觸發一次性 override」：`sandbox.judge.debugOverride.active/source/consumedAt` 可驗證，且不污染一般玩家輸入。
- unknown 提示與 pinned prompt 均沿用 classic 產生器，sandbox 不再自行改寫文案。

## Sandbox 換題鎖定規則（2026-03-04）

- 只允許兩種情況換題：
  1) `correct` 完成 reveal 後自動 `advancePrompt('correct_done')`
  2) Debug PASS 直接 `advancePrompt('debug_pass')`
- 其他任何輸入（包含 wrong/unknown/亂打）都不得換題，會記錄 `sandbox.advance.blockedReason=not_correct_or_pass`。
- `unknown` 關鍵字固定支援：`不知道 / 不確定 / idk / ?`，只顯示提示，不 reveal、不 advance。
- prompt SSOT 強制只讀 `sandbox.prompt.current`（`id/consonant/wordKey`）；題目、judge、hint、reveal 必須一致，mismatch 時阻擋流程並記錄 `mismatch=true`。
- 對外 debug/驗收欄位同步提供 `sandbox.currentPrompt`（`id/consonant/wordKey`）做為單一檢查點；內部 `sandbox.prompt.current` 與其保持一致。
- parser 新增 PASS keyword：`pass / skip / p`，判定 `judge.kind=pass` 後直接 `advancePrompt('debug_pass')`。
- `unknown`（`不知道 / 不確定 / idk / ?`）僅顯示 hint，保持同一題，不會 advance。
- hint 只讀 `sandbox.currentPrompt.consonant`（不再從題庫重新抓提示子音）。
- Word reveal（sandbox only）固定規格：畫面中心、純文字無底框、`4000ms` scale 放大 + opacity 漸淡，結束後才進下一題。
- Debug 欄位（必看）：
  - `sandbox.prompt.current.id/consonant/wordKey`
  - `judge.lastInput / judge.lastResult`
  - `hint.active / hint.lastShownAt`
  - `word.reveal.active / word.reveal.wordKey / word.reveal.durationMs`
  - `advance.lastAt / advance.lastReason / advance.blockedReason`

### Removed / Deprecated Log

- 已移除「debug PASS 只改 state、不走引擎流程」舊行為。
- 已移除一般輸入流程中可能導致 `debug_apply_correct / keyword shortcut => correct` 的捷徑判定；僅保留 debug 按鈕一次性 override。
- 已移除 ChatPanel 的 `fallback_click` 提交分流與 Enter 直送第二路徑，改為單一路徑 form submit handler。
- 原因：會造成 reveal/prompt 推進分叉，導致 PASS 後卡題，且在部份裝置觸發重複提交。



## Sandbox submit/advance 防重入整合（2026-03-04）

- sandbox 玩家送出改為 submit gate：`sandbox.answer.submitInFlight` 進入判定前設為 `true`，流程完成（hint/reveal/advance）才釋放，重複送出會記錄 `sandbox.advance.blockedReason=double_submit`。
- `advancePrompt` / `markWaveDone` 新增 one-shot token（`sandbox.advance.inFlight` + `sandbox.advance.lastToken`），同一次回答流程重入會被擋下並記錄 `double_advance`。
- prompt 顯示順序固定：先更新 `sandbox.prompt.current`，overlay 只讀 current prompt，避免切題時先渲染舊題造成閃回。
- sandbox `unknown` hint 改用與 classic 同一個 shared builder：`src/shared/hints/consonantHint.ts`，debug 會標示 `sandbox.hint.source=classic_shared`。
- Debug 驗收重點：
  - `sandbox.answer.submitInFlight / sandbox.answer.lastSubmitAt`
  - `sandbox.judge.lastInput / sandbox.judge.lastResult`
  - `sandbox.advance.inFlight / lastAt / lastReason / blockedReason`
  - `sandbox.prompt.current.id/consonant/wordKey`
  - `sandbox.hint.lastTextPreview / sandbox.hint.source`


## Sandbox NIGHT_01 修正（2026-03-05）

- Story Phase Gate：sandbox 進房後強制 `N1_INTRO_CHAT` 30 秒，只允許聊天室閒聊；倒數結束才切 `N1_QUIZ_LOOP`，並允許 `mod_live` 出第一題子音題。
- NIGHT_01（sandbox only）主流程 SSOT 改為 `flow.questionIndex + flow.step`：
  - step `0~9` 固定鏈：`PREHEAT -> ASK_CONSONANT -> WAIT_ANSWER -> ANSWER_GLITCH_FLOOD -> REVEAL_WORD -> WORD_RIOT -> VIP_TRANSLATE -> MEANING_GUESS -> ASK_PLAYER_MEANING -> ADVANCE_NEXT`。
  - `introGate/preheat/answerGate/flow/last` 全部放進 `SandboxStoryState`，phase 僅作渲染路由表象，不再作為推進真相來源。
  - WAIT_ANSWER timeout（15s）若玩家未回覆：sandbox 會硬停聊天（`answerGate.pausedChat=true`）並顯示「等你回覆」。
  - 玩家回覆後（包含「不知道」）固定先進 glitch flood，再 reveal word，根治第 2 題後不 reveal 卡住。
- Prompt Gate：`askSandboxConsonantNow()` 僅在 `phase=awaitingTag` 且 story gate 已進入 `N1_QUIZ_LOOP` 才會送題，避免一進房立即出題。
- Pipeline/Input Lock：sandbox submit in-flight 時，重複輸入會回覆「收到，等一下，正在處理上一題。」並阻擋重入，不再沉默。
- Solved 同步：同題 prompt 若已存在但未前進，會在 3 秒後允許重送同題 prompt（recover），避免「題目已 solved 但仍催同題」卡住。
- Pipeline 強制化：每次答對後固定走 `reveal -> chatRiot -> supernaturalEvent -> vipTranslate -> reasoningPhase -> tagPlayerPhase -> next`，不再有隨機缺步。
- Revisit Queue：`sandbox.pendingQuestions.queue` 採 FIFO；tagPlayer 未命中 `woman/girl/boy` 時先 enqueue 並先進下一題，之後優先回補直到命中才 dequeue。
- SAN timeout/recovery（sandbox 專用）：進入 `tagPlayerPhase` 後固定 8~12 秒 timeout 刷屏 `奇怪 / 我訊息送不出去 / 聊天室卡住? / 網路怪怪的`；玩家回覆後固定刷 `喔喔喔 / 終於 / 剛剛卡住`。
- Sandbox options guard：sandbox emit 層會擋下「payload 含 options」或文字含 `選項：` 的訊息，並累計 `sandbox.blockedOptionsCount` debug 計數。
- Message Source Debug：新增 `chat.lastEmit.source/sourceTag/sourceMode`（sandbox/classic/system）以追蹤每次訊息 emit 來源。

- Sandbox 節奏校正（sandbox only）：
  - introGate 硬門檻 30 秒：`introGate.passed=false` 時禁止出題與子音 overlay。
  - 問玩家（子音/意思）時只送一次問句，隨即進 `WAIT_PLAYER_*` 並 `freeze`，聊天室 0 output。
  - 玩家一回覆才觸發 `glitchBurst`（10 則、250~450ms/則），刷完再繼續 `REVEAL_WORD -> ... -> NEXT`。
  - 語料過濾禁字：`回頭` / `轉頭` 命中會重抽（最多 5 次），失敗 fallback 安全 observation 文案。
  - **classic mode 未修改。**

- Character Disambiguation（sandbox only）：新增 `characterDisambiguation.normalize/matchCategory`，支援 woman/girl/boy 同義詞（如 媽媽/母親、姐姐/姊姊、弟弟/哥哥）。tagPlayerPhase 首次未命中會固定追問 `@玩家 你是在說誰??????`（不提供 options）；再次未命中則依 P0 規則 enqueue 當前題並先下一題，後續再回補。
- Q10 Special（sandbox only）：NIGHT_01 第 10 題改為 `ห + หัน + 轉頭`；答對後於 `vipTranslate` 注入專屬訊息 `อย่าหัน` 與翻譯按鈕，點擊後顯示橘色 `別轉頭`（`[橘色]別轉頭[/橘色]`）。
- Q10 限制：`อย่าหัน〔翻譯〕` 與橘色 `別轉頭` 僅允許題號 10（`nodeIndex===9`）出現；非 Q10 不會注入。

### Debug 欄位變更紀錄（本次）

- 新增：
  - `sandbox.introGate.startedAt/minDurationMs/passed/remainingMs`
  - `sandbox.pendingQuestions.length`
  - `sandbox.pendingQuestions.revisiting`
  - `sandbox.blockedOptionsCount`
  - `sandbox.scheduler.phase=reasoningPhase|tagPlayerPhase`
  - `sandbox.lastCategory`
  - `sandbox.pendingDisambiguation.active/attempts/promptId`
  - `sandbox.q10Special.armed/revealed/currentQuestion/allowInject`

### Removed / Deprecated Log

- Deprecated（sandbox）：禁止 sandbox 期間送出任何 options 型訊息（包含 `（選項：...）` 與 payload `options`），違規訊息會被 emit gate 擋下並計數。

## Sandbox Preheat Script（固定序列，sandbox only）

- 新增 `src/sandbox/chat/preheat_script.ts`，以 `PREHEAT_SCRIPT` 固定時間序列（0ms~20000ms）保證開場聊天室演出，不依賴隨機池。
- Sandbox VIP identity 固定為 `src/sandbox/chat/vip_identity.ts`：`👑 behindyou`（`id=sandbox_vip_behindyou`、`role=vip`、`badge=crown`）。
- 固定序列保證：
  - `👑 behindyou` 必定出場，且主動 `@{{PLAYER}}` 打招呼（emit 時替換成 `state.player.handle`）。
  - 至少 2~3 則觀眾跟 `@behindyou` 接話。
  - 至少 1 則「我覺得應該是假的吧」質疑訊息。
- `introGate.passed=false`（前 30 秒）時：
  - 禁止出題（`askSandboxConsonantNow()` hard gate）。
  - 禁止子音 overlay（`commitPromptOverlay('')`）。
- 固定序列播完後，預熱剩餘時間才回到 `casual/observation` 隨機聊天。
- **classic mode 未修改。**

## Actor Pool Separation

- `activeUser`（玩家）只能被 tag，不可被自動發言流程抽中。
- 觀眾池與玩家完全隔離：`state.chat.activeUser` 與 `state.chat.audienceUsers` 必須分離維護。
- reactions / idle / event / random chatter 等所有自動訊息 actor 只允許來自 `audienceUsers`。
- 若抽 actor 時誤命中 `activeUser`，需阻擋並記錄 `actorPickBlockedReason = audience_includes_activeUser`，再重新抽取。



## Event Exclusive Mode

- 一次只允許一個 QNA 事件主導（`event.exclusive=true`）。
- QNA active 期間，禁止其他 actor 同時 `@activeUser`，僅 `lock.lockTarget`（當前 lockOwner）可 tag 玩家。
- QNA 未完成前不得啟動新事件；新事件會被 `event_exclusive_active` gate 擋下。
- 若超過 timeout（目前 45 秒）玩家仍未回覆，當前事件標記 abandoned，解除 lock，才允許下一事件。
- 玩家回覆若開頭 `@` 指向非 lockTarget，系統會自動改寫為 `@lockTarget`（避免回錯人）。
- Debug 面板必看欄位：
  - `event.exclusive`
  - `event.currentEventId`
  - `lock.lockOwner` / `lock.lockElapsedSec`
  - `event.foreignTagBlockedCount`
  - `event.lastBlockedReason`


## Event Transaction Pipeline（Prepare → Commit → Effects）

- 事件改為三段式交易：
  1) `Prepare`：送出含 `@activeUser` 的題目訊息（未含 tag 或送出失敗直接 abort）。
  2) `Commit`：一次檢查 gate（paused / audio unlocked / assets / sfx cooldown / video src），只要任一失敗就 abort 並寫入 `commitBlockedReason`。
  3) `Effects`：僅在 commit 成功後、同一 call chain 立即執行 SFX / 影片切換 / blackout（禁止 silent fail）。
- 事件效果 SSOT 由 `src/events/eventEffectsRegistry.ts` 統一管理，避免散落 if/else 造成邏輯分叉。
- `TV_EVENT` 固定映射 `loop4`，commit 會先驗證 `loop4` 的 resolved src 非空。
- Debug overlay 新增：
  - `event.lastEvent.questionMessageId`
  - `event.lastEvent.commitBlockedReason`
  - `event.lastEventCommitBlockedReason`
  - `event.lastEffects.sfxPlayed[]`
  - `event.lastEffects.videoSwitchedTo`
  - `event.lastEffects.blackoutStartedAt/mode`

## Debug 入口

- 主頁右上角 `Debug` 按鈕（overlay）
- Player 最小驗證頁：`/debug/player`

### Debug Event Force Execute（僅開發測試）

- Debug 面板 Events 區塊會列出所有 `eventKey`，每列提供 `Force` 按鈕。
- `Force` 會走完整事件交易管線：`Prepare → Commit → Effects`，不允許繞過 commit gate 直接播音效/切影片。
- 預設仍遵守 pause/cooldown/tag 規則，可勾選以下 override：
  - `Ignore Cooldowns`
  - `Ignore Pause`
  - `Skip Tag Requirement`
- Force 執行會在 debug 中標示 `forcedByDebug=true`，並同步更新：
  - `event.debug.lastForcedEventKey`
  - `event.debug.lastForcedAt`
  - `event.debug.lastForcedOptions`
  - `event.debug.forcedEventCount`
  - `event.lastCommitBlockedReason`
- **注意：Force Execute 僅限開發/驗收使用，禁止作為正式流程入口。**

## 開發協作

- localhost 根路徑
- GitHub Pages 子路徑（例如 `/<repoName>/`）
- 其他有自訂 base href 的部署

## 必要素材缺失時的錯誤資訊

若任一必要素材不存在或 URL 解析錯誤，初始化會停在 ERROR，且畫面與 Console 會顯示同一份 missing 清單，每筆包含：

- 素材類型與名稱（video/audio + name）
- 相對路徑（例如 `assets/scenes/oldhouse_room_loop3.mp4`）
- 實際檢查 URL（已套用 base path）
- 檢查失敗原因（HEAD/GET status 或其他 fetch error）

錯誤訊息也會明確提示：

- **素材未加入專案**
- 或 **base path 設定錯誤**

## 目前程式中的素材檢查策略

- `verifyRequiredAssets()`
  - `verifyVideos()`：先 `HEAD`，不支援時 fallback `GET`
  - `verifyAudio()`：使用 fetch 檢查存在，不用 `canplaythrough` 當存在判斷
- 缺失資料會整合為 `missing[]`，統一提供 UI 與 Console。

## 音訊同步規則

- 雙 video crossfade（videoA/videoB）採「單一真相」：**僅 active video 可出聲**。
  - 切換時在 buffer video `play()` 成功後、淡入前，立即把 audio lane 切到 buffer。
  - inactive video 一律 `muted=true`、`defaultMuted=true`、`volume=0`。
  - crossfade 結束後，舊的 current video 會 `pause()` 並維持靜音/零音量，避免殘留聲音。
- 獨立 audio 僅保留三套：
  - 常駐：`fan_loop`
  - 事件觸發：`footsteps`、`ghost_female`
- 已移除 per-video ambient mapping 舊邏輯，避免「影片音軌 + per-video ambient」並存導致錯誤判讀。
- Debug 排查：
  - overlay 會顯示 activeKey、兩支 video 的 `paused/muted/volume`。
  - overlay 會顯示目前正在播放的 audio elements（fan/footsteps/ghost）。
  - Console 會輸出 `[AUDIO-DEBUG]` snapshot/tick，可快速定位是否有多來源同播。
  - 主頁影片右上角提供小型 `Debug` 按鈕，點擊後以 overlay 開啟 DebugPanel（不跳頁、不改 layout）。
  - 若需要 SceneView 詳細診斷欄位可加上 `?debug=1`。


## 音效：無縫循環（fan_loop）

`fan_loop.wav` 已改為 **Web Audio SSOT（`src/audio/AudioEngine.ts`）**，不再依賴 `HTMLAudioElement.loop` 作為主播放路徑。

### 為何 HTMLAudio loop 容易出現斷點

- `audio.loop=true` 在不同瀏覽器可能受解碼邊界、裝置省電策略、媒體管線切換影響，循環邊界容易出現 click/gap。
- 若在場景切換時 `pause()/play()` 或重設 `currentTime/src`，會放大邊界不連續問題。
- 長時間播放（環境音）對邊界更敏感，需避免「單段播完再重播」模型。

### WebAudio 交疊循環做法

- 單例 `AudioEngine`：只建立一次 `AudioContext`（lazy init），`fetch + decodeAudioData` 後快取 `AudioBuffer`。
- `fan_loop` 改為「提前排程」模型，不使用 `onended`：
  - `nextStartTime` 初始為 `audioContext.currentTime`。
  - 每次建立新的 `AudioBufferSourceNode + GainNode`，並直接排入時間軸。
  - 下一段開始時間固定為 `endTime - xfade`（目前 `xfade=2s`）。
  - 使用 `setTimeout(duration - xfade - 1s)` 提前排下一段，避免等待尾端才觸發。
- fade 參數：淡入 `0.3s`、淡出 `2s`，以降低邊界可聽縫隙。
- `fan_loop` 與影片切換解耦：切換 loop/loop2/loop3 不會重建 fan source，也不會重新 decode。

### iOS / visibility 注意事項

- 監聽 `visibilitychange`：回到 visible 時會嘗試 `resume()` 並檢查 fan 狀態，必要時重啟排程。
- 監聽使用者互動（pointer/touch）以處理 iOS/Safari suspend 後恢復。
- 若 WebAudio 不可用，才退回單例 `<audio loop preload="auto">`，且不在切片時重設 src/pause/play。

### debug=1 如何確認 fan loop 狀態

開啟主頁（可加上 `?debug=1`）後，可於 overlay 看到：

- `audioContext.state`
- `fan playing/currentTime`
- `fan nextStartTime/xfade/currentTime/scheduled`
- `fan bufferDuration`
- `fan lastRestartReason/mode`

若上述欄位持續更新且 `fan playing=true`，代表 fan loop 排程持續運作。

## 自動插播排程可靠性（timer + watchdog）

- 播放策略 SSOT（`src/config/oldhousePlayback.ts`）：
  - `MAIN_LOOP = oldhouse_room_loop3`（主畫面常駐）
  - `JUMP_LOOPS = [oldhouse_room_loop, oldhouse_room_loop2]`（插播僅兩支，已完整移除 loop4）
- 插播間隔（`computeJumpIntervalMs(curse)`）：
  - `debug=1`：固定 `10,000 ~ 15,000 ms`（驗收快速回歸用）
  - 正式模式：
  - `CURSE=0`：`90,000 ~ 120,000 ms`（1.5~2 分鐘）
  - `CURSE=100`：`30,000 ~ 60,000 ms`
  - 下限保護：不會低於 `30,000 ms`（30 秒）
- 插播影片播放到自然 `ended` 後回 `MAIN_LOOP`，並立刻重排下一次插播。
- `plannedJump` 為排程 SSOT：`dueAt/key/url/scheduledAt/timerId/lastTimerFiredAt/lastWatchdogFiredAt/lastExecReason/lastExecResult`。
- `scheduleNextJump()` 每次都先清掉舊 timer 再重排，避免 timer 被覆寫或遺失。
- `execPlannedJump(reason)` 是唯一執行入口（`timer | watchdog | force`），禁止重 pick。
- timer callback 一定寫入 `lastTimerFiredAt`；若 guard 擋住，寫 `skipped_guard` 並 500ms 後重試（同時 watchdog 也會補觸發）。
- watchdog：每秒檢查 `now >= dueAt` 未執行則補跑 `execPlannedJump('watchdog')`，避免瀏覽器節流造成漏跳。
- 監聽 `visibilitychange`：頁面回到 visible 時若已過 due，立即以 watchdog 補執行。
- `switchTo()` 使用 `try/finally` 強制釋放 `isSwitching` lock，任何失敗都不會卡死。
- `preloadIntoBuffer()` 有 timeout fallback：
  - 3.2 秒內若 `readyState >= HAVE_CURRENT_DATA` 視為可播。
  - 超時且仍不可播則進 ERROR UI（不黑畫面，保留錯誤資訊）。
- 插播影片若 `ended` 未回主循環，另有 fallback timer（至少 45 秒，且會參考素材時長再延長）強制切回 `MAIN_LOOP` 並重排下一次插播。

## 插播選片與除錯（`?debug=1`）

- SSOT 清單位置：`src/config/oldhousePlayback.ts`
  - `MAIN_LOOP = oldhouse_room_loop3`
  - `JUMP_LOOPS = [oldhouse_room_loop, oldhouse_room_loop2]`
  - `VIDEO_PATH_BY_KEY` 為 key->url 唯一 mapping。
- 選片規則：`src/ui/scene/SceneView.tsx` 的 `pickNextJumpKey()`
  - 僅從 `JUMP_LOOPS` 可用候選中抽選。
  - 硬規則：插播不得選到 `MAIN_LOOP`，若抽到會最多重抽 10 次。
  - 若候選清單為空或重抽仍等於 MAIN，會回報 error（不 silent fallback）。
  - Console 會輸出 `[JUMP_PICK] { candidates, pickedKey, reason, curse, intervalMs }`。
- `debug=1` overlay 觀察欄位：
  - `now / dueAt / diffMs`（`nextJumpDueIn` 唯一由 `dueAt-now` 計算）
  - `plannedJump key/url/scheduledAt/timerId`
  - `lastTimerFiredAt/lastWatchdogFiredAt`
  - `lastExec reason/result/at`、`executedAt/executedForDueAt`
  - `why not jumped?`（missing planned / guard locked / timer never fired / executed already / last error）
  - `unavailableJumps`（被 gate 的 key 與原因）
  - `lastFallback`（from/to/reason，包含 timeout 或 switch 失敗）
  - `sceneMapDigest`（loop / loop2 / loop3 對應 URL 摘要）
- 常見「永遠 loop3」原因：
  - 候選清單空（JUMPS 全被 gate 掉）
  - key->url mapping 錯誤（撞到 loop3 URL 或空字串）
  - preload/switch 失敗後 fallback 但先前沒有可視化
  - 目前已改為在 debug overlay 顯示 fallback 與 unavailable 原因，避免無聲退回。


## Debug 測試控制面板（主畫面 overlay）

- 使用方式：
  - 點主畫面影片右上角 `Debug` 小按鈕即可開啟 overlay 面板（不使用 `/debug` route）。
  - Event Tester 固定可用；`?debug=1` 仍可開啟額外 SceneView 診斷欄位。
- 按鈕用途：

## Sandbox Reveal（強制 A 單一路徑）

- Reveal 期間只允許 **1 個 overlay**（`WordRevealOverlay`）；題目子音泡泡會暫時隱藏，避免雙泡泡疊加。
- Overlay 文字固定為 `baseGrapheme + restText` 同一行顯示，`base/rest` 共用 `revealGlyph`（同 `font-size/line-height`）。
- 動畫順序固定：`enter → pulse(2x) → exit`。
  - pulse：base/rest 同步閃爍（同父層動畫）
  - exit：base/rest 一起 `scale(1→1.18) + opacity(1→0)` 淡出
- Thai grapheme 拆分規則：
  - 優先 `Intl.Segmenter('th', { granularity:'grapheme' })`
  - fallback `Array.from()`

### Sandbox Debug 必看欄位

- `word.reveal.phase`
- `word.reveal.baseGrapheme`
- `word.reveal.restText`
- `word.reveal.restLen`
- `word.reveal.splitter` (`segmenter|arrayfrom`)
- `ui.consonantBubble.visible`（reveal 期間必須 `false`）
- `sandbox.hint.lastText`（unknown/wrong 後必須非空）
- `lastWave.count / lastWave.kind`（correct 後 related 3~6）

## README Removed/Deprecated Log

- 2026-03-04（sandbox only）：移除 reveal 期間 2100ms 快速淡出舊規格；改為固定 4000ms 置中放大淡出，且 reveal 僅允許讀取 prompt SSOT（wordKey/consonant）。
- 2026-03-04（sandbox only）：移除「玩家回覆有效選項後僅更新訊息但保留 reply bar/freeze」舊行為；改為強制 resolve + clearReplyUi 單一路徑。

- 2026-03-04（sandbox only）：移除 reveal `renderMode(pair|fullWord)` 雙路徑，改為強制 A（單一 overlay + 同步動畫）；不再以 B（完整單字替代）作為預設或保底。
  - `▶ Force LOOP`：直接呼叫 `switchTo('oldhouse_room_loop')`。
  - `▶ Force LOOP2`：直接呼叫 `switchTo('oldhouse_room_loop2')`。
  - `▶ Force MAIN`：直接呼叫 `switchTo('oldhouse_room_loop3')`。
  - `⚡ Force Planned Jump Now`：直接執行目前已排程的 `plannedJump`（不重 pick、不重排 schedule）。
- `🔁 Reschedule Jump`：重新呼叫 `scheduleNextJump()`，重新計算 `dueAt` 與 `plannedJump`。

### SFX Tests（Debug only）

- 新增 `SFX Tests` 區塊（僅 Debug overlay）：
  - `Play footsteps`
  - `Play ghost_female`
  - `Stop all`
  - `Ignore pause`
  - `Ignore cooldown`
  - `Master` 音量滑桿（0~1）
- 這些按鈕直接走 `audio.play` 入口並回傳 `PlayResult`，不依賴事件觸發。
- production 行為不變：正式流程仍是事件驅動，debug 才可 force 測試。

### SFX 追蹤與阻擋原因

- `PlayResult`（成功/失敗可觀測）
  - success: `ok=true, key, startedAt, durationMs, sourceType`
  - fail: `ok=false, key, reason(paused/cooldown/audio_locked/asset_missing/decode_failed/play_rejected/volume_zero/unknown), detail`
- Debug overlay 新增：
  - `audio.lastPlayResult`
  - `audio.trace(last5)`（asset_loaded / audio_locked / node_chain_ready / play_started / ended / error）
  - `audio.lastApproach gain(start/end/current)`
- 事件效果也新增追蹤：
  - `event.lastEvent.effects.plan`
  - `event.lastEvent.effects.applied`
- 用於排查插播不切換：
  - 若 `Force LOOP` 可切成功但自動插播不會切，表示排程 / planned jump 還有問題。
  - 若 `Force LOOP` 都無法切換，表示 `switchTo` 或 buffer 覆寫仍有衝突。
  - 看 `Why not jumped?` 可直接判斷卡在 timer/guard/missing planned/已執行/執行錯誤。
  - 每次點按都會輸出 `console.log('[DEBUG_FORCE]', { action, currentKey, plannedKey, bufferBefore, bufferAfter })`，可快速對照切換前後狀態。

## Debug Player Harness（`/debug/player`）

- 新增最小可驗證頁面：`/debug/player`。
- 說明：`Switch to loop / loop2 / Auto toggle` 控制鈕**只會出現在 `/debug/player`**，主頁面不會顯示這些 debug 控制。
- 該頁面與主頁共用 `playerCore`（`src/core/player/playerCore.ts`），不維持第二套切換實作。
- 介面提供：
  - `Play loop3`
  - `Switch to loop`
  - `Switch to loop2`
  - `Auto toggle（8 秒）`
  - `Stop`
- Debug 面板顯示：
  - `activeKey`
  - `isSwitching`
  - A/B 的 `src/paused/readyState/currentTime/muted/volume/opacity/class`
  - `lastSwitchRequest`
  - `lastPreloadResult`

## 「只看到一支影片」排查 checklist

- D1 Timer/排程：
  - 確認 `scheduleNextJump()` 初始有被呼叫。
  - 每次回 `MAIN_LOOP` 會重排下一次插播。
  - `clearTimeout` 先清再排，不允許多 timer 疊加。
- D2 Lock 釋放：
  - `isSwitching/isInJump` 所有流程使用 `try/finally` 釋放。
  - 若插播失敗，釋放 lock 後回 `loop3` 重試，不可卡死。
- D3 預載 fallback：
  - `loadSource` 有 timeout（預設 3.2s）。
  - timeout 後 fallback 檢查 `readyState>=HAVE_CURRENT_DATA` 或 `requestVideoFrameCallback`。
- D4 Swap/ref 穩定：
  - crossfade 後確實 swap active slot。
  - ended handler 綁定兩個 video 並驗證僅 active layer 生效。
- D5 舊邏輯覆寫：
  - 移除重複的 preload/crossfade/audio lane 實作，統一進 `playerCore`。
  - 禁止 state/useEffect 在切換後強制覆寫回 loop3（除錯誤回復策略外）。

## playerCore 設計規則（SSOT）

- 單一來源：`src/core/player/playerCore.ts`。
- 對外介面：
  - `init(videoA, videoB)`
  - `switchTo(key, url)`
  - `loadSource(el, url)`
  - `crossfade(active, inactive, ms)`
  - `enforceAudio(active, inactive)`
  - `stop()`
- 音訊同步原則：
  - 僅 active 可出聲。
  - inactive 一律 `muted=true + volume=0 + pause()`。
  - 主頁與 debug harness 必須共用同一個 `playerCore`，避免雙軌邏輯並存。

## Netlify legacy token 清理（chatTickRestartKey）

- `src/app/App.tsx` 已完整移除 legacy `chatTickRestartKey`（含 state/setter/props/key 殘留）。
- 聊天室節奏/重啟不再透過 React `key` 強制 remount；改由既有聊天引擎事件流維持：`ChatEngine.emit()`、`ChatEngine.tick()`、`ChatEngine.syncFromMessages()`。
- 送出訊息時若自動暫停中，會走既有 `setChatAutoPaused(false)` 自動恢復流程，作為 resume 機制。

## 聊天室送出穩定性

- 單一路徑：`App.tsx` 的 `submitChat(text)` 是唯一送出入口。
- 行為保證：
  - 空字串不送。
  - 送出時 `isSending=true`，延遲 1~5 秒後一定執行送出流程。
  - `finally` 一律 `isSending=false`，避免按鈕/狀態卡住。
- 事件綁定：
  - `form onSubmit`：`preventDefault()` 後呼叫 `onSubmit`。
  - `button onClick` / `onTouchEnd`：呼叫同一個 `onSubmit`。
- `onKeyDown Enter`：排除 IME 組字（`isComposing`/`keyCode===229`）才送出。

## Mobile Layout：打字時保留影片畫面 + 輸入列即時出現

- 手機版改為三段式 layout（header / video / chat）：
  - `@media (max-width: 1023px)` 下使用 grid，保留影片最小高度 `max(30vh, 180px)`，避免鍵盤打開時影片整塊被推離畫面。
  - 桌機維持原本 grid（`header/video + chat` 雙欄）不套用 mobile 高度修正。
- 輸入列改為「永遠 render」：
  - 初始化未完成時仍顯示輸入框，僅禁用送出按鈕並顯示 `初始化中…`。
  - loading 訊息改放在聊天室訊息區（`chat-loading-banner`），不再阻擋輸入列出現。
- 動態 viewport 高度（mobile-only）：
  - 透過 `visualViewport.height`（fallback `window.innerHeight`）寫入 CSS 變數 `--vvh`。
  - `.app-shell` 使用 `height: var(--vvh, 100dvh)`，降低 iOS/Android 鍵盤與網址列高度跳動造成黑區。
- chat 不遮最後一行訊息：
  - 使用 `ResizeObserver` 量測 chat input 實際高度。
  - 動態套用 chat scroll `padding-bottom = inputHeight + 8px`，確保 sticky input 不蓋住最新訊息。
- 鍵盤關閉後維持既有行為：
  - 送出後會 blur input（手機）並補一次捲到底，避免鍵盤收起時視圖跳動後落點錯誤。

### debug=1 驗證方式（mobile）

- 進入 `?debug=1`，可在主畫面看到 mobile layout debug 資訊：
  - `visualViewport.height`
  - `window.innerHeight`
  - `container height`
  - `video/chat/header/input` 高度
  - `keyboard open` 判定（`innerHeight - visualViewport.height > 120`）
- 驗收重點：
  - 首次載入就可見輸入框（即使仍在初始化）。
  - 鍵盤打開時影片仍保有可見高度。
  - 送出後可自動收鍵盤並維持聊天室在底部。
- 鍵盤與視窗高度變動：改為全平台 `--app-vh` 佈局（iOS / Android / Desktop 同套），不再依賴輸入列 `translateY` 位移。

## 聊天室主題與影片狀態連動

- 影片切換成功後，`switchTo()` 在 `currentKey` 更新完成時會發出 `emitSceneEvent({ type: "VIDEO_ACTIVE", key, startedAt })`。
  - `startedAt` 以 `play()` 成功且第一幀可用後時間點為準。
  - `loop3`、`loop`、`loop2` 都會發送，作為聊天室 topic state 的單一來源。
- 聊天室 topicMode：
  - `oldhouse_room_loop3`（主循環）→ `CALM_PARANOIA`。
  - `oldhouse_room_loop` / `oldhouse_room_loop2`（插播）→ 先維持 `NORMAL`，播放滿 5 秒後進入 `LIGHT_FLICKER_FEAR`。
  - `LIGHT_FLICKER_FEAR` 持續時間為隨機 10~12 秒，結束後回到正常節奏。
- 取消條件：
  - 若插播 5 秒內切回 `loop3`，會清除 `lightFearTimer`，不會誤觸發燈光恐懼討論。
  - 回到 `loop3` 時也會清除 fear duration timer，立即恢復 `CALM_PARANOIA`。
- 與人格 / TagV2 / 節奏模型關係：
  - 沿用既有 20 人格風格（標點、語助詞、網路語感）只替換 topic 語料池。
  - `TagV2` 規則不變：只 tag activeUsers、activeUsers < 3 禁止 tag、輸出前仍經 `sanitizeMentions`。
  - 同一套 chat scheduler 會依 topicMode 調整頻率：`CALM_PARANOIA` 偏慢、`LIGHT_FLICKER_FEAR` 較密但不刷版，未新增第二套 interval。

## 其他

- 目前不再要求 `oldhouse_room_loop4.mp4`；只要上述 3 支必要影片與 3 支必要音效存在，即可進入 RUNNING。

## Responsive 版面策略

### DesktopLayout / MobileLayout 分流（Breakpoint: `>=1024px` 為 Desktop）

- **DesktopLayout（>=1024px）**
  - 回復桌機雙欄：左側影片區、右側聊天室。
  - 使用一般頁面高度與可捲動行為，不套用 mobile 專用 `overflow:hidden`。
  - 不做 mobile 專用高度變數重算，桌機維持原始雙欄與滾動行為。
- **MobileLayout（<1024px）**
  - 維持三區塊：`TopDock`（頂部固定）/ `ChatScroll`（可捲動）/ `InputDock`（底部固定）。
  - 啟用 `100dvh` + `visualViewport.resize` 捲底修正，確保鍵盤彈出時 header 與聊天輸入區不消失。
  - `html/body/#root/.app-shell` 在 mobile 下固定為 viewport 高度並禁止整頁滾動，避免鍵盤導致整頁亂跳。

### 為何 Desktop 不做行動端鍵盤補償

- 桌機通常沒有行動鍵盤遮擋問題，套用行動端補償會造成不必要的高度抖動與版面壓縮。
- 因此桌機維持穩定雙欄布局，不加 mobile 專用鍵盤捲底策略。


### 手機影片不裁切修正（2026-02）

- 新增 mobile 專用 viewport class：`videoViewportMobile` / `scene-view-mobile` / `video-layer-wrapper-mobile`，僅在 `<1024px` 生效。
- mobile 影片層強制 `width:100%`、`max-width:100vw`、`margin/padding:0`，避免 `100vw + padding` 造成溢出裁切。
- mobile 下 `scene-video` 明確 `object-fit: contain`，保證「完整顯示優先、不左右裁切」。
- mobile 下移除 curse 濾鏡層的 `transform: scale(...)`（`curse-mid/high/critical`），避免 crossfade 疊層放大導致左右被吃。
- Desktop (`>=1024px`) 保留原本桌機樣式與互動邏輯，未套用 mobile 修正。
- 雙 video crossfade (`videoA/videoB`) 維持相同定位與尺寸（`absolute + inset:0 + width/height:100%`），僅以 opacity 切換，不用 `display:none`。

### 單一邏輯（SSOT）保證

- 本次僅分流 **CSS / Layout**。
- 播放器 crossfade、插播排程、ended handler、聊天室送出、防重複訊息 guard、Tag 規則、Loading 規則、必要素材 gate 仍維持同一套程式邏輯，未建立第二份邏輯分支。

### 主頁影片固定 / 聊天區獨立滾動

- `app-shell` 與 `app-layout` 現在固定為 viewport 高度並禁止外層滾動，避免主頁在聊天訊息增加時把影片一起推上/推下。
- 聊天滾動仍由 `.chat-list` 承擔（`overflow-y:auto`），確保只滾聊天室內容，影片區維持固定。


## Mobile layout 設計規則

- 避免 `100vh`：行動瀏覽器在鍵盤彈出時，`100vh` 常包含或錯算 URL bar / 系統 UI，容易造成黑畫面、header 被推離視窗、聊天室高度崩潰。
- 改用 `100dvh`：所有主佈局高度改為 `height: 100dvh`（必要 fallback 時採 `height: 100vh; height: 100dvh;`，並確保 `100dvh` 在最後）。
- 採用 flex column 三區塊：`app-root` 內固定 `Header`、`VideoArea`，並讓 `ChatArea` 以 `flex:1` 佔剩餘空間；訊息列表使用獨立捲動容器，禁止 body scroll。
- `visualViewport` 修正：送出後先 `after-append` 捲底，再於手機 `closeKeyboard()`（`blur + focus sink`），最後在 `250ms` 與 `visualViewport.resize`（500ms 內）補捲到底，避免黑區與焦點殘留位移。

## 回歸檢查摘要

- 已執行 TypeScript 編譯（`node ./node_modules/typescript/bin/tsc -b --pretty false`）確認型別與編譯通過。
- 已手動檢查桌機/行動兩種 viewport 的版面分流：
  - 桌機恢復雙欄布局（影片 + 聊天室並排）。
  - 行動維持 TopDock + ChatScroll + InputDock 架構。
- 聊天室送出與滾動、影片渲染、插播切換相關邏輯未改動（僅 layout 調整）。



## 全功能回歸檢查（本次）

- PASS：`scripts/netlify-build.mjs` 新增 rollup optional dependency 自動修復（偵測缺少 `@rollup/rollup-*` 時先 `npm install` 再重試 `vite build`）。
- PASS：`main.tsx` debug route 判斷改為先計算 `shouldRenderDebugPlayer`，避免 CI/Deploy 出現 `TS6133 isDebugPlayerRoute declared but never read`。
- PASS：`npm run build`。
- PASS：`/debug/player` 手動切換可見（已截圖）。
- PASS：`/debug/player` Auto toggle 60 秒（程式邏輯為固定 interval，未出現 lock guard 持續占用）。
- PASS：主頁可正常載入與既有樣式維持（已截圖）。
- PASS：播放器核心改為 SSOT（主頁與 debug 共用 `playerCore`）。

## Mobile：送出後自動收鍵盤

### 原因

手機送出訊息後，虛擬鍵盤會造成 `visualViewport` 高度瞬間變化；若此時聊天室捲動沒有在正確時機補償，容易出現黑區、捲動錯亂或 header 視覺消失。

### 解法（SSOT）

- 裝置判斷統一使用 `src/utils/isMobile.ts` 的 `isMobileDevice()`（`pointer: coarse` + `userAgent` 保守判斷）。
- 聊天室送出成功後，固定流程：
  1. `requestAnimationFrame` 先做一次 `scrollChatToBottom('after-append')`
  2. 僅手機執行 `closeKeyboard()`：先 `input.blur()`，若 focus 還在 input，再走 hidden focus sink 的 `focus -> blur`
  3. `250ms` 後補一次 `scrollChatToBottom('after-closeKeyboard')`
  4. 在 `closeKeyboard` 後 500ms 內，若收到 `visualViewport.resize`，再補一次捲底
- 嚴禁在聊天室送出流程使用 `window.scrollTo` 假裝收鍵盤。

### `debug=1` 如何確認

開啟 `?debug=1` 後，送出訊息會在 Console 印出 `[CHAT_DEBUG]`，包含：

- `activeElement`（tagName/className）
- `isMobile`
- `chatScroll`（`scrollTop/scrollHeight/clientHeight`）
- `visualViewportHeight`

可用來確認：

1. blur 後 activeElement 是否已離開 input
2. 送出後是否有執行捲底補償
3. keyboard 收合造成 viewport 變化時，聊天室是否仍維持在底部

## Chat System v2：類型驅動

### 類型列表與用途
- `SYSTEM_PROMPT`：系統引導與節奏提醒
- `FEAR_SELF_DOUBT`：自我懷疑、心理壓力
- `DREAD_BUILDUP`：平靜中的不安鋪陳
- `SOCIAL_REPLY`：聊天室互動與 tag 回覆
- `UI_STATUS`：系統狀態提示
- `IDLE_BORING`：loop3 期間「沒事發生但越看越毛」
- `SCENE_FLICKER_REACT`：loop/loop2 的燈閃反應
- `SFX_REACT_FAN` / `SFX_REACT_FOOTSTEPS` / `SFX_REACT_GHOST`：音效事件反應

### 規則
- 文字正規化：移除全形句點、壓縮空白、修正語助詞前空白
- 禁止工程口吻/戲劇台詞：命中 deny pattern 直接丟棄重抽
- 不混中泰：語言依 type metadata 決定，整句單語
- 去重：全域 recent hash + persona 專屬 recent hash
- 20 人格：每個人格獨立句池，不共用模板，近期視窗不可重複
- Tag 規則：
  - 僅能 tag active users
  - active users < 3 禁止 tag
  - 禁止 tag `VIP/system/you/fake_ai/mod_live/chat_mod`
  - 若模板含 `@{tag}` 但無合法 target，自動降級為不 tag 版本
- 翻譯按鈕：僅 `language === 'th'` 會顯示

### 事件與觸發
- `IDLE_TICK`：自然聊天節奏
- `SCENE_SWITCH(toKey)`：切到 loop/loop2 後 5 秒進入 reaction window
- `SFX_START(sfxKey)`：音效開始後 2 秒進入 reaction window
- `USER_SENT`：玩家送出訊息觸發社交回應/壓力回應
- `CURSE_CHANGE`：調整 reaction window 密度（高 curse 提高句數、縮短間隔）

### 如何新增新類型
1. 在 `src/chat/ChatTypes.ts` 新增 enum 與 metadata
2. 在 `src/chat/ChatPools.ts` 補人格句池與 fallback 池
3. 在 `src/chat/ChatSelector.ts` 增加事件分支/權重
4. `ChatEngine` 不需改介面，直接吃新 type metadata

### debug=1 驗證
- 右上角開啟 debug 後，可在 overlay 看到：
  - `chat.lastEvent`
  - `chat.lastPickedType`
  - `chat.persona/tag`
  - `chat.reactionWindow`
  - `chat.activeUsers`
  - `chat.recentDedupHashes`

## Event Registry（資料驅動 SSOT）

- 單一來源：`src/director/EventRegistry.ts`。
- 新增/刪除事件原則：
  1. 只在 `EVENT_REGISTRY` 新增或刪除 `EventSpec`。
  2. 事件對應台詞只在 `src/chat/LineRegistry.ts` 新增或刪除同名 `lineKey`。
  3. 若事件要播放音效，僅引用 `src/audio/SfxRegistry.ts` 內註冊 `key`。
- 事件引擎 `src/director/EventEngine.ts` 只讀 registry 執行，不再散落 if/else 大樹。
- 事件層定位：**content provider only**。
  - `EventEngine` 只能 enqueue reaction content（句子內容/變體），不能直接 `emitChat`。
  - 實際發言（speaker 分配、人格輪替、activeUsers 取樣、節奏頻率）一律由 `ChatEngine/ChatScheduler` 控制。
  - 未來開發禁止在事件層直接輸出聊天室訊息，避免破壞既有節奏模型。

## SFX Registry（資料驅動 SSOT）

- 單一來源：`src/audio/SfxRegistry.ts`。
- 新增/刪除音效：僅修改 `SFX_REGISTRY`。
- `playSfx` 僅接受已註冊 `SfxKey`（避免硬編字串與拼字錯誤）。
- `fan_loop` 保持常駐；`footsteps` / `ghost_female` 已移除固定頻率排程，改由事件驅動 request 觸發。

## 去重/語氣輪替規則

- 單一來源：`src/chat/LineRegistry.ts` + `src/director/EventEngine.ts`。
- 每個 `LineKey` 皆提供至少 12 個 `LineVariant`。
- 引擎去重與輪替規則：
  - `variantId`：最近 M（目前 6）次不重複。
  - `tone`：最近 2 次不重複。
  - `persona`：最近 N（目前 6）句不重複。
- 事件新增/刪除時，不需改引擎邏輯。

## Lock 事件化流程

- 任一 tag 行為可觸發 `LOCK_START`。
- `LOCK_START` 透過 `followUps` 自動排程：
  - `LOCK_REMIND_20S`
  - `LOCK_REMIND_40S`
  - `LOCK_ESCALATE_60S`
- 所有 lock 句子都由 `LineRegistry` 變體提供。
- Lock 狀態、目標、經過時間、聊天室速度倍率在 debug 狀態中可見。

## debug=1 驗證資料驅動事件/音效

- 主畫面開 `?debug=1` 後，overlay 可檢查：
  - `event.lastEvent/reason`
  - `event.line/variant/tone/persona`
  - `event.sfx/reason`
  - `event.sfxCooldowns`
  - `event.lock`
  - `event.queue/blocked`
- 事件若要求切 scene，會透過 request 流程給 Scene 層處理，不在事件中直接硬切。

## 修正：聊天室顯示帳號來源（viewer -> 真實用戶）

- speaker 顯示來源回歸原本聊天引擎：
  1. 事件/Reaction 僅提供內容 payload，不指定 username/persona。
  2. username 與 persona 分配由既有 ChatEngine/ChatScheduler 依原規則決定。
  3. 因此不再存在事件層把使用者固定為 `viewer` 的路徑。

## Mobile Send Reliability

為了修正「手機按送出偶發沒反應」，送出流程改為可觀測、單一路徑、可回報阻擋原因。

### 常見無反應原因

- `not_ready`：初始化尚未完成。
- `is_sending`：前一次送出尚在進行中。
- `cooldown_active`：送出冷卻時間未結束。
- `empty_input`：輸入為空。
- `is_composing`：IME 組字中（例如中文輸入法）。
- `self_tag_ignored`：檢測到自己 tag 自己，已自動解除 target（不中斷送出流程）。

### Auto Pause 與送出整合規則

- `chatAutoPaused` 只影響自動聊天排程（scheduler tick / auto enqueue），不影響使用者送出。
- `canSendComputed` 不再包含 `chatAutoPaused` 條件。
- 使用者送出成功後，若當下 `chatAutoPaused === true`：
  - 會強制切回 `false`；
  - 會重啟 scheduler tick（透過 restart key 觸發 effect 重建）。
- Debug 欄位持續保留：
  - `chat.autoPaused`
  - `ui.send.lastResult`
  - `canSendComputed`

### Guard / reason code 一覽

- 所有送出 guard 都會回傳 reason code（不再 silent return）。
- reason 會同步顯示：
  - 輕量 UI 提示（輸入框下方短暫文字）；
  - `?debug=1` debug overlay 的 `ui.send.blockedReason`；
  - `window.__CHAT_DEBUG__.ui.send`。

### Debug 面板如何看 blockedReason

在 `?debug=1` 的 debug overlay 可看到：

- `ui.send.lastClickAt`
- `ui.send.lastSubmitAt`
- `ui.send.lastAttemptAt`
- `ui.send.lastResult` (`sent|blocked|error`)
- `ui.send.blockedReason`
- `ui.send.errorMessage`
- `ui.send.stateSnapshot`
  - `inputLen`
  - `isSending`
  - `isComposing`
  - `cooldownMsLeft`
  - `tagLockActive`
  - `replyTarget`
  - `mentionTarget`
  - `canSendComputed`

另外，`debug=1` 下聊天室提供 3 個快速驗證按鈕：

- `Simulate Send`：以目前 input 走同一條 submit 流程。
- `Toggle TagLock(Self)`：把 tag/reply target 切到自己，驗證會被自動解除。
- `Toggle isComposing`：模擬 composition 狀態，驗證不會永遠卡死。


## Loop4 Removal（完整移除）

- `oldhouse_room_loop4` 已從場景切換候選與聊天反應條件完整移除，鬼動僅使用 `loop / loop2`，`loop3` 作為常態主畫面。
- 專案啟動所需素材仍維持 3 支影片（loop/loop2/loop3）+ 3 支音效（fan/footsteps/ghost）。
- Debug overlay 不再顯示任何 loop4 相關候選或規劃鍵值。

## Chat Pacing 狀態機設計

- 模式：`normal | fast | burst | tag_slow`。
- `normal`：350~1800ms。
- `fast`：每 10~25 秒進入一次，持續 2~6 秒，120~450ms。
- `burst`：每 45~120 秒檢查一次，35% 機率進入，持續 8~15 秒，80~320ms，且限制同一使用者最多連續 2 則。
- `tag_slow`：當 tag lock 存在時啟用，速度為原本 x1.5~2，直到玩家回覆送出才解除。
- 僅更動間隔模型，不更動使用者名稱生成與語氣句池策略。

## Event Scheduler Debug 指南

- 新增 debug 欄位：
  - `chat.pacing.mode`
  - `chat.pacing.nextModeInSec`
  - `event.scheduler.now`
  - `event.scheduler.nextDueAt`
  - `event.scheduler.lastFiredAt`
  - `event.scheduler.blocked`
  - `event.scheduler.blockedReason`
  - `event.scheduler.cooldowns`
  - `event.lastEvent`
- 新增 debug 控制按鈕：
  - `Force Fire Event`
  - `Reset Event Locks`
- Scheduler 保障：
  - loop3 長時間停留時，至少每 90~140 秒規劃一次鬼動（loop/loop2）。
  - cooldown 若超過預期 3 倍視為 stale，會自動 reset 並記錄 debug。
  - 事件載入失敗採 backoff（5~12 秒）重排，不阻塞整體 pipeline。

## chat_auto_paused 與事件排程邊界

- `chat_auto_paused` 只允許影響聊天室自動訊息 pacing（`chatEngine.tick` 與強制 base message）。
- `chat_auto_paused` 不得阻擋事件 scheduler、影片切換 scheduler、或音效播放（含 `fan_loop` 連續播放）。
- `event.scheduler.blockedReason` 與 `event.blocking.schedulerBlockedReason` 僅允許反映事件層互斥（例如 `app_not_started`、`lock_active`），不再出現 `chat_auto_paused`。

### Debug 指標（新增/強化）

- `event.registry.count`
- `event.registry.keys`
- `chat.activeUsers.count`
- `chat.activeUsers.nameSample`（最多 6 位）
- `chat.autoPaused`

## Anti-Overanalysis Lint

- 禁止句型：
  - `第\s*\d+\s*(秒|段|格|幀)`
  - `第 + 中文數字 + (秒|段|格|幀)`（例如「第七秒」）
- 禁止詞彙（中英）：
  - `frame`, `frame drop`, `bitrate`, `encoding`, `encode`, `codec`, `compress`, `artifact`, `calibrate`, `compare`, `amplitude`, `spectrum`
  - `壓縮噪點`, `壓縮`, `編碼`, `噪點`, `校準`, `比對`, `振幅`, `頻譜`, `幀差`, `時間碼`
- lint 行為：
  - 在 `ChatEngine.composeMessage` 與 `generateChatMessageV2` 先做一次 lint，命中就重抽（最多 6 次）。
  - 在 `App.dispatchAudienceMessage` 的最終送出出口再做第二層 lint（雙保險）。
  - 命中違規字詞時：拒絕送出並重抽，最多重抽 6 次。
  - 若重抽仍失敗：強制改用 `SAFE_FALLBACK_POOL` 或保底句，避免聊天室停擺且不輸出違規句。
- `debug=1` 驗證方式：
  - 於 debug overlay 檢查：
    - `chat.lint.lastRejectedText`
    - `chat.lint.lastRejectedReason`（`timecode_phrase` / `technical_term`）
    - `chat.lint.rerollCount`
  - 當句子被擋下並重抽時，上述欄位會更新，可直接確認 lint 正在工作。

## 事件：全部強制 tag（2026-02）

- 定義：事件必須以 `@activeUser` 開場（`starterLine` + `requiresTag: true`），不符合會直接中止事件。
- 事件啟動 SSOT：`startEvent(eventKey, ctx)` 固定流程：
  1. 先生成 opener 並套用 `starterLine`
  2. 驗證 opener 必須以 `@activeUser` 開頭（runtime assert）
  3. starter line 送出成功後才進入 `active`
  4. 才允許排程後續 SFX/影片切換/反應訊息
- 若 starter line 送出階段被阻擋（例如 `chat_auto_paused` / `tagLockActive` / `app_not_started`）：
  - 事件直接標記 `aborted`
  - 禁止該事件的 SFX 與影片切換
  - `debug=1` 可看到 `event.lastEvent.abortedReason`
- `ghost_female` / `footsteps` 已改為完全事件驅動，且 reason 強制使用 `event:${eventId}`。
- `debug=1` 驗證重點：
  - `event.lastEvent.key/eventId/state`
  - `event.lastEvent.starterTagSent`
  - `event.lastEvent.abortedReason`
  - `event.lastGhostSfxReason`（顯示 `eventKey:*`，不可為 timer）
  - `chat.activeUsers.count/nameSample`
  - `chat.autoPaused/reason`

### 通盤檢查結果（PASS/FAIL）

- PASS：播放器（build + scene/sfx 事件流程編譯通過）。
- PASS：音效（`ghost_female`/`footsteps` 只由事件 reason 觸發）。
- PASS：聊天室（事件 opener 強制 tag activeUser）。
- PASS：桌機版面（layout 邏輯未改、編譯通過）。
- PASS：Debug 面板（新增事件生命週期欄位與 autoPaused reason）。
- FAIL（環境限制）：手機實機鍵盤行為（送出後收鍵盤/捲底/輸入欄可視）無法在此 CI 容器做真機驗證。

## Ghost 事件化更新（2026-02）

- 已完全移除 `ghost_female` 固定排程，鬼聲僅能由事件流程觸發。
- 事件清單：
  1. 聲音確認（玩家回「有」後 2 秒，鬼聲 0→1 漸強 3 秒）
  2. 鬼偽裝 tag「你還在嗎」（回覆後 3 秒鬼聲，並追問）
  3. 電視事件（玩家回「沒有」後切 loop2，並可選短鬼聲）
  4. 名字被叫（回覆後短鬼聲）
  5. 觀看人數異常（回覆後 footsteps）
  6. 燈怪怪（立即切 loop/loop2）
  7. 你怕嗎（玩家回「不怕」後觸發 footsteps 或 ghost）
- 音效互斥/冷卻：
  - `ghost_female >= 180s`
  - `footsteps >= 120s`
  - `low_rumble >= 120s`（保留在同一互斥冷卻規則）
  - `fan_loop` 常駐且不受互斥影響
- `playSfx(key, options)` 統一入口支援 `delayMs / startVolume / endVolume / rampSec`。
- `debug=1` 驗證：
  - 觀察 `event.lastGhostSfxReason`，必須為事件 key（如 `eventKey:VOICE_CONFIRM`）
  - 觀察 `event.violation`，若非事件來源觸發鬼聲會顯示 violation
  - 觀察 `event.lock` 與 `event.sfxCooldowns` 以驗證鎖定與冷卻

## 事件語句內容池與防重複（2026-02）

- 本次僅調整「語句內容層」，未修改節奏、頻率、使用者名稱邏輯、reactionBurst 節奏與標點風格。
- 已整合事件語句池（opener / followUp）：
  - 聲音確認
  - 電視事件
  - 燈怪怪
  - 你怕嗎
  - 名字被叫
  - 人數異常
- 既有舊硬編碼事件句已改為統一從內容池抽取，避免新舊邏輯並存。

### ReactionBurst 內容池

- `ghost` 反應池已擴充至 15 條。
- `footsteps` 反應池已擴充至 12 條。
- `light` 反應池已擴充至 10 條（沿用 `SCENE_FLICKER_REACT` 類型，不新增語氣系統）。

### 防重複規則（內容層）

- 同一事件最近 5 次不可重複同一句。
- 全域最近 10 句不可重複。
- 若抽到重複會重抽。
- 若池不足則回退使用 shuffle 後首條，避免事件中斷。
- `debug=1` 新增可觀察欄位：
  - `event.lastContentId`
  - `event.contentRepeatBlocked`

### 通盤檢查結果（PASS/FAIL）

- PASS：`npm run build`（TypeScript 編譯 + Vite 打包通過）。
- PASS：事件觸發主流程仍維持原邏輯（僅改語句來源）。
- PASS：reactionBurst 觸發時機與排程未改，只替換反應文字池。

## Debug 面板欄位維護規則

- 若某個問題/欄位連續 3 次 PR 未提及 → 從 debug 移除。
- 若之後同問題再次出現 → 重新加回欄位。

### 目前追蹤中的 debug 問題/欄位

- `events_not_firing`：追蹤 `event.registry` / `event.candidates` / `chat.activeUsers` 與推論區塊。
- `chat_auto_paused`：追蹤 `ui.send.lastResult` / `ui.send.blockedReason`。

## Debug SSOT（單一來源）

- 事件與聊天室 debug 統一由 `window.__CHAT_DEBUG__` 組裝輸出。
- 事件排程快照在 `App.tsx` 週期性更新，欄位集中於 `event.*`。
- 聊天快照由 `ChatEngine.getDebugState()` 提供，再回填到 `chat.*`。
- `/debug` 頁（`/debug?debug=1`）顯示完整 snapshot 與快速推論（例如 `NO_CANDIDATES` / `INSUFFICIENT_ACTIVE_USERS` / `SCHEDULER_NOT_TICKING`）。

## 事件必 tag 與事件台詞庫（2026-02）

- 事件啟動 SSOT 已整合為 `src/core/events/*`：
  - `eventRegistry.ts`：事件定義與挑選 key
  - `eventTypes.ts`：事件型別
  - `eventRunner.ts`：生命週期（tag -> active -> done/abort）
  - `eventDialogs.ts`：事件台詞（opener/followUp/closer）
  - `eventReactions.ts`：reaction topics（ghost/footsteps/light）
  - `dedupe.ts`：短期防重複抽句
- 所有事件都必須先送出 starter tag（`starterTagSent=true`）才允許進入後續流程。
- 若 starter tag 送出失敗（例如 `chat_auto_paused` / `locked_target_only` / `rate_limited` / `empty`），事件會直接 `abort`，且不會觸發 SFX、影片切換、reactionBurst。

### 台詞庫結構

- 每個事件固定：
  - `opener`: 8 句（全部 `@${activeUser}` 開頭）
  - `followUp`: 6 句
  - `closer`: 4 句（目前 FEAR_CHALLENGE 使用）
- 防重複規則：
  - 同一事件 opener：5 次內不重複
  - 同一 topic reactions：8 次內不重複

### debug=1 驗證「不會再有鬼聲無 tag」

- 觀察 `event.lastEvent.starterTagSent`：
  - `true` 才允許事件後續音效/影片行為
  - `false` 代表事件已 abort，必須同時看到 `event.lastEvent.abortedReason`
- 觀察 `event.lastEvent.lineIds` 與 `event.lastEvent.openerLineId/followUpLineId`，確認事件句子與流程對齊。
- 觀察 `chat.activeUsers.count` + `chat.activeUsers.nameSample`，確認當前可 tag 對象。
- 觀察 `ui.send.lastResult` + `ui.send.blockedReason`，定位 starter tag 被阻擋原因。

### Debug 三次 PR 未提及就移除（追蹤清單更新）

- `events_not_firing`：追蹤 `event.registry` / `event.candidates` / `event.lastEvent`。
- `chat_auto_paused`：追蹤 `ui.send.lastResult` / `ui.send.blockedReason`。
- `event_tag_abort_chain`：追蹤 `event.lastEvent.starterTagSent` / `event.lastEvent.abortedReason` / `event.lastEvent.lineIds`。

## Debug Overlay Event Tester（2026-02）

- 入口：主畫面影片右上角小型 `Debug` 按鈕（overlay 模式，不跳頁）。
- DebugPanel 改為 mode-aware，分成三塊：
  - `Mode Debug`：顯示 `currentMode`，並在面板最上方提供 `Switch to Classic` / `Switch to Sandbox (sandbox_story)`。
  - `Classic Debug Tools`：僅在 `mode === "classic"` 時顯示。
  - `Sandbox Story Debug Tools`：僅在 `mode === "sandbox_story"` 時顯示。
- Mode SSOT：沿用既有 `mode` query param（`?mode=classic|sandbox_story`），debug-only switcher 會同步寫入 `localStorage['app.currentMode']` 並立即 reload 生效。
- Debug Gate SSOT：改為共用 `src/debug/debugGate.ts`。
  - `isDebugEnabled()` 判定來源：`?debug=1` 或 `#debug=1` 或 debug session flag 或 `window.__THAIFEED_DEBUG_ENABLED__`。
  - **只要 Debug Overlay 已開啟（可見）就視為 debug enabled**，mode switch guard 不得再回傳 `debug_disabled`。
- Mode Switch Debug（在 `Mode Debug` 區塊內）會即時顯示：
  - `lastModeSwitch.clickAt`
  - `lastModeSwitch.requestedMode`
  - `lastModeSwitch.persistedMode`（`query/storage/store` 回讀結果）
  - `lastModeSwitch.action`（`reinit / reload / none`）
  - `lastModeSwitch.result`（`ok / blocked / error`）
  - `lastModeSwitch.reason`（若被 guard 擋住或例外）
- 點擊 Mode Switch 按鈕後，UI 會先更新 `lastModeSwitch.*`，再執行生效動作；若可切換，debug-only 會顯示 `Switching…` 並以 `reload` 讓 mode 立即重啟套用。
- 常見排障：若按鈕看起來沒反應，先看 `lastModeSwitch.result/reason`，例如 `debug_disabled`、`already_current_mode`、`invalid_mode`。
- 啟動時 mode 決策：
  - `mode` query param（最高優先）
  - 僅在 `isDebugEnabled()` 為 true 才允許讀取 `localStorage['app.currentMode']`（避免非 debug 使用者被 storage 帶入 sandbox）
  - fallback `classic`
- `Classic Debug Tools` 內固定渲染 **Event Tester**（不依賴 DEV 或 `debug=1`），包含 7 顆事件按鈕：
  - Trigger VOICE_CONFIRM
  - Trigger GHOST_PING
  - Trigger TV_EVENT
  - Trigger NAME_CALL
  - Trigger VIEWER_SPIKE
  - Trigger LIGHT_GLITCH
  - Trigger FEAR_CHALLENGE
- 每顆按鈕都走同一套 production 入口 `startEvent(eventKey, ctx)`，不繞過 tag/lock/gating。
- `Classic Debug Tools` 額外顯示：
  - `event.registry.count`
  - `chat.activeUsers.count`
  - `lastEvent.key`
  - `lastEvent.starterTagSent`
  - `lastEvent.abortedReason`
  - `event.inFlight`
  - `event.test.lastStartAttemptAt`
  - `event.test.lastStartAttemptKey`
  - `event.test.lastStartAttemptBlockedReason`
  - `lock.isLocked`
  - `lock.lockTarget`
  - `sfx.ghostCooldown`
  - `sfx.footstepsCooldown`
- Event Tester debug controls（僅 overlay 生效）：
  - `Ignore Cooldowns (debug only)`：只跳過 cooldown gate，不跳過 production `startEvent` 流程。
  - `Simulate Player Reply`：自動送出玩家回覆字串，便於重複驗證需要 reply 的事件鏈。
  - `Reset Test State`：清除 eventRunner 測試暫存（inFlight/currentEventId/pending timers 與 last blocked reason），不會自動解鎖 production lock。
  - `Force Unlock`：僅 debug 手動解鎖。
- blockedReason 說明（Debug Event Tester）：
  - `locked_active`：目前 lock 仍有效。
  - `cooldown_blocked`：事件仍在 cooldown。
  - `in_flight`：上一個事件流程尚未釋放。
  - `chat_auto_paused`：聊天處於 auto-pause。
  - `no_active_user` / `active_users_lt_3`：沒有足夠可 tag 的活躍觀眾。
  - `sfx_busy`：音效忙碌（保留給 SFX gate 訊號）。
  - `invalid_state`：狀態不合法（例如 app 未完成可觸發條件）。
- 注意事項：Event Tester 會走正式事件流程，請先確認聊天室可送出訊息，再觸發事件以驗證 tag/lock/cooldown 行為。
- Debug 顯示補充：
  - `event.lastEvent.waitingForReply`
  - `event.lastReactions.count`
  - `event.lastReactions.lastReactionActors`
  - `violation=reaction_actor_system=true`（若反應誤用 system）
- `Sandbox Story Debug Tools` 包含：
  - `Auto Play Night`
  - `Force Next Node`
  - `Force Reveal Word`
  - `Force Ghost Motion`
  - `Trigger Random Ghost`（隨機觸發一個 ready 的鬼動事件）
  - `Ghost Event Monitor`（每 500ms refresh，顯示 7 個事件的 `status/pre/post/cooldown/lock`）
    - `ready`（綠色）
    - `cooldown`（橘色）
    - `locked`（紅色）
  - `Ghost System`（`activeEvents` / `queue` / `lastEvent` / `cooldownCount`）
  - `Fear System`（每 500ms refresh，僅 sandbox_story 顯示）
    - `fearLevel`
    - `pressureLevel`（`low=灰 / medium=黃 / high=橘 / panic=紅`）
    - `ghostProbability`（`baseProbability + fearLevelFactor`，顯示 `0.00~1.00`）
  - `Fear Meter`（`fearLevel/maxFear` 視覺化 `██████░░░░`）
  - `Triggers`（`chatSpike / storyEmotion / darkFrame / ghostNearby` + 加成值）
  - Debug 快捷按鈕：`Add Fear +10` / `Reset Fear`
  - `Night Timeline`（顯示 `sandbox.reveal.* / sandbox.consonant.* / sandbox.ghostMotion.*`）
- 安全保護：`mode !== "sandbox_story"` 時不渲染任何 sandbox debug tools，避免 classic engine 誤觸 sandbox controls。
- Debug-only Mode Switcher 驗收：
  1. 以 `?debug=1` 開啟 Debug Panel。
  2. 點 `Switch to Sandbox (sandbox_story)` 後，`lastModeSwitch.clickAt/requestedMode` 先更新，`persistedMode` 應顯示 storage 已寫入 `sandbox_story`。
  3. 切換流程會顯示 `Switching…` 且執行 reload，回來後 `currentMode` 應變成 `sandbox_story`。
  4. 點 `Switch to Classic` 同理可切回，且 `lastModeSwitch` 顯示新的 requested/persisted/action/result。
  5. 未開啟 debug 時不顯示該切換 UI。

## System message 使用邊界（SSOT）

- `system` 僅保留給：Loading / 初始化 / 錯誤提示。
- reactions / ambient / idle / event burst 一律視為觀眾訊息，必須使用 activeUsers（不足時由歷史使用者池補足），不得使用 `system`。

## Reactions/ambient actor 規則

- 事件 burst 視窗內每句都重新抽 actor。
- 禁止同 actor 連續出現（no back-to-back）。
- 最近 5 句內同 actor 最多 2 次。
- 同句 8 次內不可重複；重複時最多 reroll 5 次，並在 debug 記錄 duplicate reroll。

## 事件啟動改版：pre-effect → starter tag（2026-03）

- 事件啟動流程已改為兩段式：
  1. 先檢查阻擋條件（`inFlight` / `cooldown` / `registry` / `activeUser` / `activeUsers<3` / `chat_auto_paused`）
  2. 設定 `event.inFlight=true`
  3. 觸發 pre-effect（僅允許一段、可回復）：
     - 影片切換（`loop` / `loop2`）或
     - 音效播放（`ghost_female` / `footsteps`）
  4. 送出 starter tag（`@activeUser + opener`）
  5. starter tag 成功（`starterTagSent=true`）後，才允許後續 `followUp/reactions/lock`。

### 事件狀態定義（更新）

- 「啟動」：`event.inFlight=true` 且 `preEffectTriggered=true`。
- 「成立」：`starterTagSent=true`。
- 「失敗」：starter tag 送出失敗或前置 gate 被阻擋。

### starter tag 失敗後補救（更新）

- 允許 pre-effect 已發生（因為其設計在 tag 前合法）。
- 但會立即執行回復：
  - 強制切回 `loop3`
  - 中止後續效果（`run/followups/reactions/lock/二次音效`）
  - Debug 寫入 `abortedReason="tag_send_failed_after_pre_effect"`
  - 套用短冷卻（目前 15 秒）避免連續誤觸。

### 音效/影片硬規則（更新）

- 允許 pre-effect 在 starter tag 前觸發。
- 除 pre-effect 之外，所有後續效果仍必須等待 `starterTagSent=true`。
- pre-effect 僅允許一段且需可回復。

### Debug Overlay 欄位（更新）

- `event.inFlight`
- `event.lastStartAttemptBlockedReason`
- `event.lastEvent.preEffectTriggered`
- `event.lastEvent.preEffectAt`
- `event.lastEvent.preEffect.sfxKey`
- `event.lastEvent.preEffect.videoKey`
- `event.lastEvent.starterTagSent`
- `event.lastEvent.abortedReason`

### 驗收方式

- Case 1（正常事件）：先看到 pre-effect，再於 0~1s 內送出 starter tag，且 `starterTagSent=true` 後才進後續流程。
- Case 2（tag 失敗）：允許 pre-effect，但必須迅速回復 `loop3`，且禁止後續效果，Debug 顯示 `tag_send_failed_after_pre_effect`。
- Case 3（阻擋條件）：必須在 pre-effect 前被擋下，且不得播放 pre-effect，Debug 顯示 blocked reason。

## 事件流程/鎖定規則更新（本次）

- Event Flow 固定為：**先做全部阻擋檢查**（`registry_missing / invalid_state / chat_auto_paused(auto only) / in_flight / active_users_lt_3 / no_active_user / cooldown_blocked`）→ 通過後才進 `pre-effect -> starter tag -> post-effect`。
- `chat_auto_paused` 現在只阻擋 `source=scheduler_tick`（auto），不阻擋 debug tester / manual。
- 若 `starter tag` 在 pre-effect 後送出失敗，會立即補救：切回 `loop3`、中止後續效果（run/followups/reactions/lock 二段）、`abortedReason=tag_send_failed_after_pre_effect`，並套用短冷卻（15s）。

## Event Manifest（由 registry 自動生成）

- `events/registry` 已補齊每個 event metadata：`preEffect / postEffect / cooldownMs / usesLock`。
- 新增 `getEventManifest()`，Debug Overlay 直接顯示 manifest（可捲動，不跳頁）。

## Sticky Tag Banner + Lock 強制回覆

- ChatInput 上方改為沉浸式 `Reply Preview`；當 `lock.isLocked` 且 `lockTarget` 存在時顯示兩行：`↳ @lockTarget` 與被回覆的原始訊息摘錄。
- Reply Preview UI 不再顯示 `event type / lockReason / flowId`。
- lock 期間送出訊息會強制轉成：`@lockTarget + 使用者輸入（移除所有前置 @mentions）`。
- lock 期間只能回覆 lockTarget（防繞過）。
- ReplyPin 只允許出現在 `ChatComposer`（輸入框正上方），並固定為單一來源（`state.lock.replyingToMessageId` + `state.lock.lockTarget`）。
- 既有/legacy 的下方引用回覆欄已完全移除（不 hide、不保留第二套 render）。
- 送出成功後維持既有行為：手機收鍵盤 + 自動捲到底。


## QNA Tag + ReplyPin 時序修正（本次）

- QNA `askQuestion` 現在強制題目格式：`@${taggedUserHandle} ${prompt}`；若組字後未包含 tag，直接 abort，並記錄 `lastBlockedReason=qna_question_missing_tag`。
- abort 時不會進 lock，也不會建立 `replyingToMessageId`。
- ReplyPin 資料來源統一為「實際送出的題目訊息」：
  - `replyingToMessageId = sent.message.id`
  - UI 只讀取該 message text 節錄。
- 時序固定為：`sendQuestionMessage -> set replyingTo/freeze`；不允許 ReplyPin 早於題目訊息出現。
- 不再使用 `pinnedMessageId`，也不會把 pinned message 注入聊天陣列。
- UI Guard：若 lock 存在但 `replyingToMessageId` 對應訊息不含 `@taggedUserHandle`，ReplyPin 會被 suppress，並記錄 `ui.replyPreviewSuppressed=missing_tag_in_message`。
- Debug Overlay 新增欄位：
  - `qna.taggedUserHandle`
  - `qna.lastQuestionMessageId`
  - `qna.lastQuestionMessageHasTag`
  - `qna.lastBlockedReason`
  - `ui.replyPinMounted`
  - `ui.replyPinContainerLocation = above_input`
  - `ui.replyPinInsideChatList = false`
  - `ui.replyPreviewSuppressed`
  - `ui.replyPreviewLocation = above_input`
  - `ui.legacyReplyQuoteEnabled = false`

## Reply Preview Design

- `state.lock.replyingToMessageId`：每次 QNA `askQuestion` 成功送出時，記住該題訊息 `message.id`；新題目會直接覆蓋舊值。
- `state.lock.replyingToMessageId` 與 lock 同步管理：任何解鎖路徑都必須清成 `null`，避免殘留舊題目。
- Reply Preview 只渲染「回覆對象 + 原始訊息文字」：
  - Header：`↳ @lockTarget`
  - Text：`「originalMessage.text」`（單行、40 字截斷、超過補 `…`、移除換行）
- UI 層明確不顯示 `event type / lockReason / flowId`，避免把事件內部細節帶進沉浸視圖。
- Debug Overlay 仍保留 `eventKey` 與事件追蹤資訊（含 lock.blocking），遵守 Debug 與 UI 分離原則。
- lock 解除時，`state.lock.replyingToMessageId = null`，Reply Preview 同步消失。
- Reply Preview 置於 chat list 內、位於被 tag 題目訊息之後（視覺上「題目在上、pinned reply 在下」），避免脫離對話流。

## Autoscroll Freeze（Countdown 模式）

- `chat.autoScrollMode` 三態：
  - `FOLLOW`：維持自動置底。
  - `COUNTDOWN`：仍自動置底，但開始倒數訊息數。
  - `FROZEN`：停止自動置底，允許手動捲動。
- 觸發時機：
  - 僅在 QNA `askQuestion` 成功送出且 `questionMessageId` 對應訊息存在、且內容包含 `@taggedUserHandle` 後，進入 `COUNTDOWN`。
  - 觸發時設定：`freezeAfterNMessages=10`、`freezeCountdownRemaining=10`、`freezeCountdownStartedAt=now`。
- 倒數規則：
  - 每新增一則訊息時，若目前為 `COUNTDOWN` 且訊息符合以下條件才遞減：
    - `message.actor.id !== activeUser.id`（不計玩家）
    - `message.source !== system_ui`（不計 system）
    - `message.isPinnedLayer !== true`（不計 pinned layer）
  - `freezeCountdownRemaining` 歸零後，`autoScrollMode` 轉為 `FROZEN`。
- 凍結期間行為：
  - 當 `autoScrollMode=FROZEN` 時，非玩家來源（`source !== player_input`）的聊天室訊息會被統一阻擋，不再繼續產生新訊息。
  - 玩家成功送出後才會解除凍結，恢復一般聊天室產生節奏。
- 恢復時機：
  - activeUser 回覆「成功送出」後立即切回 `FOLLOW`、清空 countdown state，並立即置底。
  - UI 保持既有手機規格：收鍵盤 + 置底。
- Debug Overlay：
  - `chat.autoScrollMode`
  - `chat.freezeCountdownRemaining`
  - `chat.freezeAfterNMessages`
  - `chat.freezeCountdownStartedAt`
  - `chat.lastScrollFreezeReason`（僅允許 `tagged_question_countdown_done`）
  - `chat.lastScrollModeChangeAt`
  - `chat.lastMessageActorIdCounted`
  - `chat.lastCountdownDecrementAt`

## activeUser immutable initial handle

- 玩家第一次輸入名稱後，寫入 `activeUserInitialHandle`（immutable，只寫一次）。
- 所有事件 starter tag 一律使用 `activeUserInitialHandle`。
- Debug 顯示 `activeUserInitialHandle(immutable)` 與 `renameDisabled=true`。

## Debug 規則延續

- 若某問題連續 3 次 PR 未再提及，需自 Debug 面板移除；除非再次出現才可重新加入。


## Player Naming

- 玩家名稱只允許首次輸入一次，系統會做 normalize：`trim` + 移除前導 `@`；空字串會被阻擋。
- `activeUserInitialHandle` 為 immutable，後續流程不得覆寫，聊天室玩家名稱與事件 tag 都以此為唯一來源。
- 聊天室顯示為「輸入名 + You badge」，badge 為輕量半透明樣式；玩家名稱本身不會被替換成 `You`。
- 所有事件 starter tag 固定使用 `@${activeUserInitialHandle}`；若不存在則於 pre-effect 前直接 blocked（`no_active_user`）。
- 改名入口已停用；若呼叫舊改名函式會 no-op 並在 Debug 記錄 `blockedReason=rename_disabled`。

## Sandbox QnA Resolve + Reply UI Clearing（sandbox only）

- sandbox 玩家回覆命中有效選項（`穩住/衝/不知道`）時，必須走單一路徑：`consumePlayerReply() -> parsePlayerReplyToOption() -> resolveQna()`，禁止只 append 訊息不 resolve。
- `resolveQna()` 會同步：`qna.awaitingReply=false`、`qna.status=RESOLVED`、解除 freeze、清空 reply UI（`replyBarVisible=false`、`replyToMessageId=null`、pinned/quote 清空）。
- 若命中有效選項後 `ui.replyBarVisible` 仍為 `true`，會立即強制 `clearReplyUi()` 並記錄 anomaly（`sandbox.qna.lastAnomaly`）。
- sandbox 在 `consumePlayerReply()` 命中後會立即 `markSent('sandbox_qna_consumed')` 並短路後續流程；同一送出循環禁止再進 `tryTriggerStoryEvent('user_input')`，避免已 resolve 被舊 retry 邏輯覆寫。
- sandbox debug tester 新增：`ForceResolveQna`（resolve+clear UI）與 `ClearReplyUi`（只清 UI，隔離 UI 問題）。

## QNA Flow（Keyword + 不知道）

- 事件成立後若該事件有 `qnaFlowId`，系統會啟動 QNA，並且每題都以 `@taggedUserHandle`（`activeUserInitialHandle`）出題；`lockTarget` 另行指向 `questionActor.handle`。
- Keyword Router 規則：玩家回覆只要「包含」選項 keyword 即命中；比對順序固定為 `UNKNOWN(不知道)` 優先，再比對其他選項。
- 每題會自動注入 UNKNOWN 選項（`label=不知道`；keywords：`不知道/不清楚/不確定/不曉得/idk/不知道欸`）。命中 UNKNOWN 時會給提示並重問，不會直接結束流程。
- QNA 與 lock：QNA 期間 lock 會持續鎖定到出題 actor（`lockTarget`），玩家送出會自動補上 `@lockTarget`，流程結束才解鎖。
- 若 `lockTarget === taggedUser`（自問自答）視為錯誤：Debug 會記錄 `blockedReason=lock_target_invalid`，並立即重抽非 `system` 且不等於 `taggedUser` 的 actor。
- Chain Event queue：QNA 選項可攜帶 `nextEventKey`，觸發時會先進 `event.queue`，只有在 `event.inFlight=false` 時才會取出啟動，避免撞車。
- Debug Overlay 會顯示：
  - `qna.isActive / flowId / eventKey / stepId`
  - `qna.awaitingReply / lastAskedAt / attempts / lockTarget`
  - `qna.taggedUserHandle / qna.lockTargetHandle / qna.lastQuestionActor.handle`
  - `qna.lastAskedTextPreview`
  - `qna.lockTargetInvalidError`
  - `qna.matched.optionId/keyword/at`
  - `qna.pendingChain.eventKey`
  - `event.queue.length`

## Tag vs LockTarget

- **Tag 的對象（被點名）**：`taggedUserHandle = activeUserInitialHandle`。
- **回覆鎖定對象（要回覆誰）**：`lockTargetHandle = questionActor.handle`。
- 每題 QNA 一律 `@taggedUserHandle` 出題，但 Sticky banner 與送出前綴都以 `lockTargetHandle` 為準。
- ChatInput 送出前會移除既有前置 mentions，強制替換為 `@${lockTargetHandle}`。

## Event Exclusive Mode

- 一次只允許一個 QNA 事件主導（`event.exclusive=true`）。
- 當 QNA active 時，禁止其他事件進場；`startEvent()` 會直接 blocked：`event_exclusive_active`。
- 當 QNA active 時，只有 `lockOwner` 可以 tag `@activeUser`；其他 actor 嘗試 tag 會被阻擋並累計 `foreignTagBlockedCount`，`lastBlockedReason=foreign_tag_during_exclusive`。
- 玩家回覆若 tag 錯對象，送出前會強制改寫成 `@lockTarget`（不再允許回覆未鎖定對象）。
- 只有兩種情況可換事件：
  1. QNA 正常結束（flow_end）。
  2. 玩家超時未回（`lockElapsedSec >= 45`）後標記 abandon，解除 lock/exclusive，才允許下一事件。
- Debug 面板新增/維護欄位：
  - `event.exclusive`
  - `event.currentEventId`
  - `lock.lockOwner`（`event.currentLockOwner`）
  - `lock.lockElapsedSec`
  - `event.foreignTagBlockedCount`
  - `event.lastBlockedReason`

### Event Exclusive 驗收（手動）

1. Case 1：事件進入 QNA 後，僅 lockTarget 能 tag 玩家；其他 actor tag 應被阻擋。
2. Case 2：QNA 未完成前，不會再起第二個 tag 事件。
3. Case 3：超時（45s）未回覆時，當前事件 abandon，之後才可切換下一事件。
4. Case 4：玩家回錯人時，送出文字會被改寫為 `@lockTarget ...`。

### 驗收步驟

1. 啟動事件（可用 Debug Event Tester）後，確認事件成立後出現連續 QNA 題目，且每題都 `@activeUser`。
2. 回覆任一選項 keyword，確認可立刻命中並進下一題/結束。
3. 回覆 `不知道`（或 UNKNOWN keywords），確認會提示並重問、且 lock 不解除。
4. 選擇帶 `nextEventKey` 的選項，確認 chain event 先入 queue，再於非 inFlight 時啟動。
5. 開 `?debug=1` 檢查 overlay 的 QNA / queue 欄位是否完整更新。



## QNA pinned reply 先置底再 pause（2026-03-02）

- tagged question 成功送出後，流程固定為：
  1) `qna.active.status = AWAITING_REPLY` + `questionMessageId` 寫入
  2) ReplyPinBar mount
  3) `waitForMessageRendered(questionMessageId)` 等待題目訊息進入 DOM
  4) 連續兩次 `forceScrollToBottom`（含 double tap）
  5) 最後才 `pause.isPaused=true`（chat freeze）
- `pause` 現在只負責阻擋 NPC spawn / event chatter / ghost 觸發，不可提前阻擋這段強制置底。
- Debug 追加：
  - `chat.scroll.lastForceToBottomReason`
  - `chat.scroll.lastForceToBottomAt`
  - `chat.scroll.scrollTop / scrollHeight / clientHeight`
  - `ui.replyPinMounted`
  - `ui.qnaQuestionMessageIdRendered`
  - `chat.pause.isPaused`

## Removed / Deprecated Log

- 2026-03-02：移除「tagged question countdown 才 freeze」舊邏輯，改為 pinned reply mount 後立即執行 `scrollThenPause`（先置底、後 pause）。保留 freeze gate（阻擋 NPC/事件/鬼動）但不再等待倒數訊息，避免題目訊息未落在視窗底部。

- 2026-03-02：移除 `SceneView` 內 `footsteps` / `ghost_female` 的 `<audio>` one-shot 舊播放路徑，整合為單一 WebAudio 距離模型（避免新舊音源雙聲與狀態分裂）。


- 2026-03-01：移除 `src/app/App.tsx` 中 `cooldownsRef.loop4` 的 legacy debug/cooldown 欄位，改用語意一致的 `cooldownsRef.tv_event`。影響：`TV_EVENT` gate 與 cooldown 行為不變，只是移除舊命名避免與已移除的 `loop4` 場景語意衝突。

- 2026-03-01：修正 Event Exclusive 與 QNA actor 身分一致性衝突。舊邏輯中事件台詞發送者固定為 `mod_live`，會與「僅 lockOwner 可 tag activeUser」規則互相打架；現改為事件 opener / followUp / QNA 提示均以當前 `lockOwner` 作為發言 actor，並保留舊有 lock/timeout gate，不再新舊並存。
- 2026-03-01：補齊 blocked reason 可觀測性：當事件因 `event_exclusive_active`（或其他 start gate）被擋時，同步更新 `event.lastBlockedReason`；foreign tag 被攔截時即時回填 `event.foreignTagBlockedCount` 與 `event.lastBlockedReason`。

## 近期衝突整合（2026-03-01）

- 通盤檢查 `loop4` 舊命名與現行 `oldhouse_room_loop / loop2 / loop3` 播放策略的衝突點。
- 判斷舊邏輯仍有保留必要（TV_EVENT 需要獨立 cooldown gate），因此採「整合」而非移除：
  - 保留 gate 行為與 90 秒冷卻值。
  - 將鍵名由 `loop4` 改為 `tv_event`，與事件語意對齊並避免誤導。

## TV_EVENT → loop4（單一來源）與 Video Priority Lock

- `TV_EVENT` 現在在事件定義中明確宣告：`video: { key: "loop4", mode: "CUT" }`，pre/post effect 也統一為 loop4，避免 key 漂移。  
- 所有影片切換請求改走同一入口：`REQUEST_VIDEO_SWITCH` → `requestVideoSwitch({ key, reason, sourceEventKey })`。  
- `requestVideoSwitch` 會在 debug state 記錄：
  - `video.currentKey`
  - `video.lastPlayRequest`
  - `video.lastSwitch`
  - `video.lastDenied`
- TV_EVENT 成功切到 loop4 後會啟用短暫 `priorityLock`（3~6 秒）：
  - lock 期間會拒絕全域 jump / 回 loop3 的覆蓋切換
  - 拒絕原因會寫入 `video.lastDenied.denyReason`
  - lock 到期後恢復原本可回 loop3 的規格

### Debug 驗證（TV_EVENT / loop4）

- 開啟主頁 Debug Panel：
  - 使用 `Trigger TV_EVENT`
  - 觀察：
    - `video.lastPlayRequest.requestedKey` 應為 `loop4`
    - `video.currentKey` 最終應為 `oldhouse_room_loop4`
    - `video.lastSwitch.toKey` 應為 `oldhouse_room_loop4`
    - 若失敗，`video.lastDenied.denyReason` 會顯示被拒原因
- 新增 Debug-only 按鈕：`Force Show loop4 (3s)`
  - 可直接驗證播放器/資源是否可播 loop4
  - 3 秒後自動 request 回 loop3

## ActiveUser 自動發言零容忍防線（本次更新）

- 已統一訊息輸出入口為 `dispatchChatMessage(...)`（App 內唯一寫入聊天訊息入口）。
- 全域 Send Guard：
  - 若 `actor === activeUser` 且 `source !== "player_input"`，直接阻擋（不寫入訊息）。
  - 阻擋原因固定為 `activeUser_auto_speak_blocked`。
- Source 標記標準化：
  - `player_input`
  - `audience_idle`
  - `audience_reaction`
  - `event_dialogue`
  - `qna_question`
  - `system_ui`
  - `debug_tester`
  - `unknown`（仍受 guard 約束）
- Actor pool 強制隔離：
  - `activeUser` 與 `audienceUsers` 分離。
  - 若偵測 audience 包含 activeUser，會在分離階段移除，並回報 `audience_includes_activeUser_removed`。
- Debug 可觀測欄位新增：
  - `chat.lastBlockedSendAttempt`
  - `chat.blockedCounts.activeUserAutoSpeak`
  - `chat.audienceInvariant.removedActiveUser/reason`
- Debug Tester 防呆：
  - Simulate Reply 走 `player_input`（視為玩家真實輸入模擬）。
  - Event Tester 事件台詞來源會標記 `debug_tester`，但 actor 仍須經 guard 檢查，無法冒用 activeUser 自動發言。

## ActiveUser 初始化即可被 Tag（2026-03-01）

### 衝突點全面排查（activeUser 註冊時機）

- startup Confirm 前後存在多種 gate 名稱（`hasSpoken / readyForEvents` 等歷史殘留描述），容易誤判「必須先發言」。
- QNA / event / pin 的可用性已改為 bootstrap 單一來源，不再依賴玩家訊息數。
- audience/active users 隔離邏輯保留（必要）：activeUser 不進 audience 抽樣池。

### 單一真相

- `state.system.bootstrap`（在 app 內對應為 `bootstrapRef.current`）：
  - `isReady`
  - `activatedAt`
  - `activatedBy` (`username_submit` / `debug`)
- 事件與 QNA gate 統一檢查 `bootstrap.isReady`。

### Username Submit 啟動流程

- startup Confirm 同一手勢執行 `bootstrapAfterUsernameSubmit(name)`：
  1. `registerActiveUser(name)`（upsert `usersById/usersByHandle`，activeUser 固定 id）
  2. `ensureAudioUnlockedFromUserGesture()`
  3. 寫入 `bootstrap = { isReady: true, activatedAt, activatedBy }`
  4. `emitAudioEnabledSystemMessageOnce()`（`[系統] 聲音已啟用`，僅一次）

### QNA / Tag / Pin 規則

- QNA/event 未 ready 時一律 `bootstrap_not_ready` 並中止。
- 只要 `bootstrap.isReady=true`，出題訊息必須可 `@activeUser`。
- pinned reply 顯示只看：`qnaStatus === "AWAITING_REPLY" && questionMessageId != null`。
- pinned reply 標頭顯示優先使用題目訊息中的 `@taggedHandle`，若缺失才 fallback 至 activeUser/lockTarget。
- 不再以 `hasSpoken` / `messages.length` 作為 pin/tag gate。

### Mention 解析與 Highlight（更新）

- 所有 chat/event/player 訊息在進入 state 前都會解析 `message.mentions: userId[]`（由 `usersByHandle` resolve）。
- activeUser 在 Confirm 後立即註冊到 registry（`usersById + usersByHandle(lowercase)`），因此**不需先發言**即可被 `@name` 正確解析。
- 聊天室高亮規則改為：`mentions` 包含 `activeUserId` 且 `authorId != activeUserId` 才套用 row highlight。
- highlight 為整列底色 + 左側細線，system 訊息不套用。

### Mention / Bootstrap Debug 驗證

- `system.bootstrap.isReady`
- `chat.activeUser.handle / displayName / registryHandleExists`
- `mention.lastParsedMentions(messageId→ids)`
- `mention.lastHighlightReason` (`mentions_activeUser` / `none`)
- `mention.tagHighlightAppliedCount`

### Mention Autoscroll（Twitch-like）

- 觸發條件：**新進訊息 + 非自己送出 + `message.mentions` 命中 activeUser**。
- 策略：採 **B（near-bottom threshold）**。
  - 若使用者接近底部（`<=100px`）：自動滾到底。
  - 若使用者不在底部：不強制跳轉；改為顯示並高亮右下 `@你・跳到最新` 按鈕。
- 行動瀏覽器穩定性：採 `requestAnimationFrame` + `setTimeout(0)` 雙階段補償，避免 DOM/layout 尚未穩定造成漏滾。

### Mention Autoscroll Debug 驗證

- Console logs：
  - `[MENTION_AUTOSCROLL] messageId=... matched=handle/id atBottom=...`
  - `[AUTOSCROLL_SKIPPED] reason=user_scrolling or not_at_bottom`
- Debug 按鈕（`?debug=1`）：`Inject NPC Tag @You`。
- Debug 開關（URL）：`forceMentionAutoscroll=1`（每次 mention 強制滾到底，方便壓測）。

### Debug Overlay

- 可觀測：`bootstrap.isReady / activatedAt / activatedBy`、`activeUser.registered`、`canTagActiveUser`。
- 新增 debug-only 按鈕：`Simulate Username Submit (debug)`（僅未 ready 顯示）。

## QNA 同步機制（questionMessageId 單一真相）

- QNA active state 以 `questionMessageId` 作為 Reply Bar / lock / debug 的唯一來源。
- 出題流程改為 transaction：先送出題目訊息並拿到 messageId，再切到 `AWAITING_REPLY` 並顯示 Reply Bar。
- 聊天訊息新增 `createdAtMs + seq`，渲染前用穩定排序，避免題目晚插到玩家回覆下方。
- 玩家成功送出訊息後，若 QNA 正在等待回覆，立即標記 resolved、關閉 lock、恢復 FOLLOW 自動捲動。

## Freeze 模型更新（tagged question 硬暫停）

- tagged question 成立後，流程調整為：**先顯示題目訊息並滾到底，再進入 freeze**。
- freeze 期間為硬暫停：
  - 不產生 NPC 訊息（idle / reaction / event auto / ambient / random）
  - 不觸發 ghost 相關動作與音效
  - 不執行聊天室自動滾動
- 玩家成功送出回覆後才解除 freeze，並回到 FOLLOW 模式。
- pinned reply 維持 UI overlay（輸入欄上方），**不寫入 messages[]**，因此訊息時間序與聊天室排序不會被污染。
- Debug 新增 freeze 欄位：
  - `chat.freeze.isFrozen`
  - `chat.freeze.reason`
  - `chat.freeze.startedAt`
  - `chat.npcSpawnBlockedByFreeze`
  - `chat.ghostBlockedByFreeze`

## 事件驅動驚嚇音效與黑幕效果（2026-03 更新）

- `footsteps` / `ghost_female` 改為 WebAudio 距離接近模型（每次播放都建立一次 node chain）：
  - `BufferSource -> Gain -> Lowpass -> StereoPanner -> masterGain`
  - 由遠到近聽感：音量提升、低通打開、左右聲道收斂、播放速率微升。
  - 每次播放含小幅隨機（pan、duration ±15%），避免機械重複感。
- 仍維持事件驅動規則：
  - 只有事件成立且通過既有 cooldown 才會播放。
  - 若被 cooldown 擋下，不會啟動 blackout（避免無聲黑幕）。
- blackout flicker（與事件音效耦合）：
  - 成功播放 `footsteps` / `ghost_female` 後延遲 1 秒啟動。
  - 模式隨機：`full`（全黑）或 `dim75`（75% 黑）。
  - 持續 12 秒 flicker；第 4 秒有一次短暫亮起 pulse，之後繼續黑幕閃爍直到結束。
- pause/freeze 優先序：
  - `chat.pause.isPaused=true` 時不允許觸發任何新 SFX/blackout。
  - 若 blackout 進行中且進入 pause，會立刻停止黑幕。
- debug overlay 新增欄位：
  - `audio.lastApproach.key/startedAt/durationMs/startGain/endGain/startLPF/endLPF`
  - `fx.blackout.isActive/mode/endsInMs`

## Debug：卡死時如何復原（Stuck Recovery）
- 若出現 `chat.freeze.isFrozen=true` + `chat.pause.isPaused=true` 且 `freezeCountdownRemaining=0`，可在 Debug 面板按 **Reset Stuck State**。
- 按鈕會一次執行：
  - release tagged question freeze
  - `chat.pause=false`
  - `qna.reset()`（回到 IDLE，清掉 question/tagged handle）
  - `event.inFlight=false` + `event.queue.clear()`
  - rollback 事件 cooldown（避免 `question_send_failed` 後誤鎖死）

## 事件 cooldown/lock commit 規則（Root-cause fix）
- 事件只有在「確實開始」後才可 commit cooldown/lock。
- `startEvent()` 的 commit 判準：
  - `starterTagSent === true`（tagged question 成功送出）或
  - `preEffectTriggered === true`（前置效果成功）
- 若 `question_send_failed` 且 `starterTagSent=false && preEffectTriggered=false`：
  - 不可推進 cooldown（必須 rollback）
  - 立刻解除 freeze/pause，並重置 qna/event queue，避免 hard-freeze 卡死。

## README Removed/Deprecated Log
- 2026-03-04：本次 sandbox_story Consonant QnA 流程為整合更新，無新增移除項。

## 2026-03-02 事件 registry / SFX 對照修正

- `ghost_female` 與 `footsteps` 仍在事件 registry，並非被移除。
- 事件效果映射改為由 `eventRegistry` 推導，避免 `eventEffectsRegistry` 與 registry 出現雙份定義分岔。
- 啟動時 console 會輸出：
  - `event.registry.count`
  - `eventIds[]`
  - `hasGhostFemale` / `hasFootsteps`
- Debug Overlay 新增「資源對照檢查」：
  - `audio.loadedKeys`
  - `event.referencedAudioKeys`
  - `event.missingAudioRefs`（紅字顯示且附來源 `eventId`）
  - `audio.context.state(distance)`
- Debug Panel 新增測試按鈕：
  - `Test Ghost SFX`（預設觸發 `GHOST_PING -> ghost_female`）
  - `Test Footsteps SFX`（預設觸發 `VIEWER_SPIKE -> footsteps`）
  - 會輸出 `[EVENT_TRIGGERED]` / `[EVENT_SKIPPED] reason=lock/cd/missing_asset`。

## README Removed/Deprecated Log
- 本次無新增移除項（保留既有事件 key，改為統一 SSOT 與 debug 可視化驗證）。

## Event Audio Stuck 修正（2026-03-03）

- 事件音效觸發改為狀態機：`idle → playing → cooldown → idle`。
- 每事件追蹤欄位：
  - `state`
  - `lastTriggeredAt`
  - `cooldownUntil / cooldownRemaining`
  - `preKey / postKey`
  - `lastResult`（`TRIGGERED / SKIPPED / FAILED`）與 `reason`
- 防卡死策略：
  - `playing` 加入 timeout fallback（10s）
  - 播放失敗（含 autoplay/audio lock）必寫 `[EVENT_PLAY_FAIL]`，且必進 cooldown，不會永久鎖死
  - `SFX_END` 事件回傳時同步收斂狀態；即使 `onended` 不可靠仍有 timeout 保底

### Debug 操作（Event Tester）
- 每事件提供三個按鈕：
  - `Trigger <eventKey>`：一般規則（會受 playing/cd gate）
  - `Force Execute <eventKey>`：跳過 playing/cd gate，可連按重複觸發
  - `Unlock <eventKey>`：只解鎖該事件狀態
- 額外保留 `Reset Stuck State`：跨系統救援（event/qna/freeze/pause 一次重置）。
- 若瀏覽器阻擋音訊：按 `Enable Audio`（使用者手勢解鎖），並檢查：
  - `audio.contextState`
  - `audio.lastUnlockResult`
  - `audio.lastUnlockAt`

### 驗收重點
- 連按 Trigger 同事件：應出現 `[EVENT_SKIPPED] reason=playing|cd`。
- 連按 Force Execute：每次都能觸發，不需先按 Reset Stuck。
- `ghost_female`、`footsteps` 可在 Debug 面板重複測試。

## Tag Start Flow（2026-03-03）

- 被 `@activeUser` 的題目訊息現在固定執行順序（單一路徑）：
  1) append tag message 到 `messages[]`
  2) 等待 `nextPaint`（雙 rAF）
  3) 強制 `forceScrollToBottom(reason="tag")`
  4) 設定 pinned reply（僅 overlay，不重複插入聊天室訊息）
  5) 再等待一次 `nextPaint`
  6) 最後 freeze/pause（停止後不再產生新訊息/鬼動）
- 置底被視為 UI 動作，不可被 pause gate 提前擋住；pause 只能在流程最後生效。
- mobile/desktop 皆統一以 chat list 容器執行置底，避免作用到錯誤 element。

### Debug 觀測（本次新增/調整）

- `chat.scroll.containerFound`
- `chat.scroll.lastForceReason`
- `chat.scroll.lastForceAt`
- `chat.scroll.lastForceResult`
- `chat.scroll.metrics(top/height/clientHeight)`
- `chat.pause.setAt`
- `chat.pause.reason`
- `ui.pinned.visible`
- `ui.pinned.textPreview`

Console（debug 模式）可觀察：
- `[SCROLL] force tag ok top=... height=...`
- `[PIN] set visible text="..."`
- `[PAUSE] set reason=tag_wait_reply`

## README Removed/Deprecated Log
- 2026-03-04：移除 Sandbox Debug Tools 內舊 `Mode Switcher <select>`，改為共用 Debug Panel 頂部按鈕式 Mode Switcher（debug-only，避免雙入口並存）。
- 2026-03-04：移除「mode switch guard 僅看 `?debug=1`」舊規則，改為共用 debug gate SSOT（overlay 可見即 debug enabled）。

## Sandbox Story Mode（Stage 1）

- 新增 `sandbox_story` 模式（以 query `?mode=sandbox_story` 啟用）。
- 第一階段包含：Mode Router、Story Engine、SSOT（Night1 測試節點）。
- 不改動 classic 行為；classic 以 wrapper 方式保留原流程。
- Debug 面板新增：
  - `mode.id`
  - `sandbox.nodeIndex`
  - `sandbox.scheduler.phase`
  - `sandbox.currentNode.word/char`


## Sandbox Story Mode（Consonant QnA True Flow）

- `sandbox_story` 子音答題採 sandbox keyword 規則（不改 classic mode）：
  - 每題 SSOT 定義 `correctKeywords`、`unknownKeywords`（`src/data/night1_words.ts`）。
  - prompt 明確提示：`@{activeUser} 請回覆本題子音（直接輸入：{keyword}），或回覆：不知道`。
  - 玩家回覆統一走同一條 `parse + judge + apply`。
- Judge 結果：
  - `correct`：先 unfreeze，再進 `revealingWord -> chatWaveRelated -> preNextPrompt -> awaitingTag/next`。
  - `unknown`：走可持續推進路徑（不會卡死）。
  - `wrong`：給 retry 提示，可持續重答（不會卡死）。
  - `timeout`：debug 欄位保留，當前標示未啟用。
- freeze 規則：沿用 `runTagStartFlow`，固定 `append -> scroll -> pin -> freeze`，確保 pinned render 後才 freeze。
- Debug 面板：
  - `ForceAskConsonantNow`
  - `SimulateConsonantAnswer(text)`（直接走與玩家輸入相同流程）
  - `scheduler.phase`
  - `consonant.prompt.current`
  - `consonant.judge.lastInput / consonant.judge.lastResult`
  - `word.reveal.phase / word.reveal.wordKey`
  - `lastWave.count / lastWave.kind`
  - `blockedReason`

- 2026-03-04：移除 Sandbox Debug Tools 內舊 `Mode Switcher <select>`，改為共用 Debug Panel 頂部按鈕式 Mode Switcher（debug-only，避免雙入口並存）。

## Sandbox Story：Word Reveal Pipeline（Night 1）

- sandbox_story Night 1 已升級為 10 個拼圖字結構稿，資料 SSOT 來源：
  - `src/data/night1_words.ts`
  - `src/data/chat_templates.ts`
  - `src/ssot/sandbox_story/night1.ts`
- 正確答題後固定流程：
  1. `revealingWord`：中央顯示 base 子音，右側逐字補齊單字（`fadeIn 800ms → hold 900ms → fogOut 1200ms`）。
  2. 同步播放發音（`/assets/phonetics/${audioKey}.mp3`）。
  3. `chatWave`：related 討論波 3~6 則。
  4. `preNextPrompt`：surprise 2~3 則 + guess 1~2 則（不 tag 玩家）。
  5. `awaitingTag`：下一題才允許 tag/freeze 流程。
- 發音檔固定路徑與命名：
  - 路徑：`public/assets/phonetics/`
  - 播放：`/assets/phonetics/${audioKey}.mp3`
  - 命名：拉丁小寫 + 底線（例如 `klang_kuen`, `tonmai`, `pratu`）。

## README Removed/Deprecated Log
- 2026-03-04：本次 sandbox_story Consonant QnA 流程為整合更新，無新增移除項。


## Sandbox PromptCoordinator（單一真相來源，2026-03-04）

- `sandbox_story` 新增 `sandbox.prompt.current` 作為 prompt SSOT；Overlay 與 pinned 皆只讀此 state。
- Overlay 子音只在 `sandbox.prompt.current.kind === "consonant"` 時顯示，來源固定為 `sandbox.prompt.current.consonant`。
- pinned 題目改由 `PromptCoordinator.setCurrentPrompt()` 產生之 promptId 驅動，避免 Overlay/pinned 分別讀舊 state。

### pinned writer guard（sandbox only）

- sandbox 期間，pinned 只允許 `sandboxPromptCoordinator` 寫入。
- 若 `qnaEngine` / `eventEngine` 嘗試寫入，直接阻擋並寫 debug：
  - `sandbox.prompt.pinned.lastWriter.source`
  - `sandbox.prompt.pinned.lastWriter.writerBlocked`
  - `sandbox.prompt.pinned.lastWriter.blockedReason`
- `unknown`（不知道）流程不更換 promptId；僅加提示訊息，題目維持同一題。

### Prompt Consistency Debug 欄位

- `sandbox.prompt.current.kind`
- `sandbox.prompt.current.promptId`
- `sandbox.prompt.overlay.consonantShown`
- `sandbox.prompt.pinned.promptIdRendered`
- `sandbox.prompt.mismatch`
- `pinned.lastWriter.source`
- `pinned.lastWriter.blockedReason`

## README Removed/Deprecated Log
- 2026-03-04：本次 PromptCoordinator 為整合修正，無新增移除項。

## Sandbox Story（2026-03-04 強制整合）

- 子音題 scheduler（sandbox only）固定為：`awaitingTag → awaitingAnswer → revealingWord`。
- PASS 後行為固定：`單字放大 + 霧化淡出 → 直接下一題`，不再觸發 related/preNextPrompt chat wave。
- 「不知道 / 不知 / 不確定」會走 classic 風格提示，提示後維持同題重答（不推進 index）。
- 鬼動（ghost voice / TV / light glitch）在 sandbox 只能由 `canTriggerGhostMotion()` 放行；子音題固定阻擋。
- footsteps（sandbox）改為 fear 綁定：fearLevel 越高，觸發機率越高且冷卻越短。
- Debug 核對欄位：
  - `sandbox.consonant.currentIndex/currentConsonant/currentWordKey`
  - `sandbox.consonant.judge.lastInput/lastResult`
  - `scheduler.phase`
  - `word.reveal.phase`
  - `ghost.gate.lastReason`
  - `footsteps.probability/cooldownRemaining/lastAt`

## Sandbox Consonant Prompt（2026-03-04 更新）

- 僅 sandbox_story：`unknown` 與 `wrong` 都會透過 classic hint adapter 產生提示文字，且維持同一題 `awaitingAnswer`（不跳題）。
- `correct`：先做字形補字 overlay（base + appended，逐步顯示→放大→淡出），再送出 related chat wave（3~6 則），最後才進下一題。
- overlay / pinned / judge 共享同一個 `sandbox.prompt.current`（同 `promptId`），debug `sandbox.prompt.mismatch` 應維持 `false`。
- pronounce audio 目前保留介面，不觸發 side effect，`audio.pronounce.state` 會停在 `idle`（reserved）。

### README Removed/Deprecated Log
- 2026-03-04：sandbox 舊「unknown 僅回覆收到不知道」行為視為 deprecated，改為強制提示文字。

## Sandbox WordReveal Overlay 視覺規格（2026-03-04 重做）

- sandbox_story 的 WordRevealOverlay 現在預設採 **B 保底 fullWord 模式**：
  - 同一行顯示完整 `wordText`。
  - 不再分離顯示 base 子音容器；改在完整單字中把第一個 grapheme 以 accent 色標示。
- 若後續要啟用 A 規格，可切 `renderMode="pair"`（目前預設仍為 `fullWord`，確保可驗收穩定）。
- 動畫 timeline（sandbox only）：
  - `enter`：200ms fade in
  - `pulse`：同步閃爍 2 次（2 x 250ms）
  - `exit`：900ms scale(1→1.18) + opacity(1→0) + translateY(-6px)
- Thai 最小拆分規則：統一使用 `Array.from(wordText)`，由 state 提供：
  - `word.reveal.baseChar`
  - `word.reveal.restTextLen`
- Debug 驗收欄位（sandbox）：
  - `word.reveal.renderMode`
  - `word.reveal.baseChar`
  - `word.reveal.restTextLen`
  - `word.reveal.phase`（`idle|enter|pulse|exit|done`）

### README Removed/Deprecated Log
- 2026-03-04：sandbox WordRevealOverlay 移除舊 `fadeIn/scaleUp/fadeOut` 視覺命名，統一改為 `enter/pulse/exit` 時序。
- 2026-03-04：sandbox WordRevealOverlay 預設停用舊「子音 + 小補字」雙容器顯示，改採 fullWord 保底模式（第一個 grapheme 上色）。

## 2026-03-04（sandbox_story reveal 純文字浮現 + 隨機安全區位置）

- 本次僅調整 `sandbox_story`：reveal 改為純文字 `SandboxWordRevealText`，不使用底色/邊框/泡泡樣式。
- `base/rest` 於同一文字容器、同字體同字級同 line-height，僅 `base` 使用 accent 顏色。
- reveal 位置在每次進入 `revealingWord` 時抽樣一次，並固定整段 reveal 期間不變；下一次 reveal 重新抽樣。
- safeRect 固定為：`minX=8, maxX=92, minY=8, maxY=74`（底部預留約 26% 避開 pinned/input 區）。
- debug 欄位：
  - `word.reveal.phase`
  - `word.reveal.base / word.reveal.rest / word.reveal.restLen`
  - `word.reveal.position.xPct / word.reveal.position.yPct`
  - `word.reveal.safeRect`
  - `ui.consonantBubble.visible`（reveal 期間必須 `false`）

### README Removed/Deprecated Log
- 2026-03-04（sandbox only）：移除舊 `WordRevealOverlay`（含底色文字框樣式 `word-reveal-overlay / revealText / revealGlyph`），統一改為 `SandboxWordRevealText` 純文字疊層渲染。

## 2026-03-04（sandbox only：英文/注音輸入修復 + prompt glyph 藍色恢復）

- sandbox_story 子音答題輸入改為寬鬆 normalize：保留英文（A/B/C）、數字（1/2/3）、注音（U+3100–U+312F + ˇˊˋ˙）、中文、空白與常見標點，不再於 normalize 階段清空英文字或注音。
- sandbox parser 新增對應：`A/a/1 -> A`、`B/b/2 -> B`、`C/c/3 -> C`；`不知道/不確定/idk/?/？ -> unknown`。
- 當送出後 normalize 為空字串時，sandbox 會阻擋推題並記錄 `blockedReason=input_sanitized_to_empty`，同時顯示提示文字（對齊 classic 提示路徑）。
- sandbox prompt glyph（題目子音）恢復藍色 token，並限定於 `.video-area.sandbox-story-mode .sandbox-story-prompt-glyph` 作用域，不影響 classic。
- sandbox debug 新增/擴充：
  - `input.raw`（`sandbox.consonant.parse.inputRaw`）
  - `input.norm`（`sandbox.consonant.parse.inputNorm`）
  - `input.allowedSetsHit`（latin/bopomofo/thai/cjk）
  - `parser.kind`（使用 `judge.lastResult`）
  - `parser.matched`（`A|B|C|unknown|keyword`）
  - `blockedReason`（含 `input_sanitized_to_empty|parse_none|phaseBusy|...`）
  - `ui.promptGlyph.className/colorResolved/opacityResolved/source/isBlueExpected`

### README Removed/Deprecated Log
- 2026-03-05（sandbox only）：移除 `chat_engine.ts` 內嵌 mini-pools 舊語料來源，統一改由 `CHAT_POOLS` 單一 SSOT 提供。
- 2026-03-04：本次為 sandbox 輸入/樣式整合修正，無新增移除項。

## Sandbox Chat Engine

- 新增 sandbox 專用聊天室訊息生成系統，透過 `src/sandbox/chat/chat_engine.ts` 以 1.5~3 秒節奏自動產生訊息。
- 支援一般觀眾、恐懼升級、中泰混合、tag 玩家、角色猜測、VIP 摘要與結尾崩潰流程。
- 使用 `src/sandbox/chat/user_generator.ts` 生成不重複的 PTT/Twitch 風格帳號。

## 2026-03-05 sandbox supernatural event system
- sandbox story 新增 `SUPERNATURAL_EVENTS` 事件池（`none/ghost_voice/tv_on/screen_glitch/footsteps`）與固定權重：40% / 20% / 15% / 15% / 10%。
- 答對題目後流程調整為：`PLAYER_CORRECT -> REVEAL_WORD_FRAGMENT -> CHAT_RIOT -> SUPERNATURAL_EVENT -> VIP_TRANSLATE`。
- 新增 `GHOST_HINT_EVENT`（非答題階段可觸發），包含 `ghost_voice/screen_glitch/tv_on`，聊天室會產生推理句：
  - 鬼是不是在提示
  - 是不是在回應剛剛的字
  - 鬼是不是在等我們拼出什麼
- `footsteps` 新增距離分層輸出：`footstep_far / footstep_mid / footstep_near`。
- NIGHT_01 phase 與 supernatural events 已在 sandbox flow 整合，並維持 quiz/consonant 主流程不被破壞（只在 `chatRiot/supernaturalEvent/vipTranslate` 鏈條中插入）。


## Sandbox Chat Flow（PREHEAT / Freeze / GlitchBurst）

- Sandbox 現在採單一 step-driven flow：`PREHEAT -> ASK_CONSONANT -> WAIT_PLAYER_CONSONANT -> GLITCH_BURST_AFTER_CONSONANT -> REVEAL_WORD -> WORD_RIOT -> VIP_TRANSLATE -> MEANING_GUESS -> ASK_PLAYER_MEANING -> WAIT_PLAYER_MEANING -> GLITCH_BURST_AFTER_MEANING -> ADVANCE_NEXT`。
- `player.handle` 在 sandbox init 即建立（優先 `chat.activeUser.handle` 等價來源，fallback `000`），確保預熱期就可被 VIP `@`。
- `WAIT_PLAYER_CONSONANT` 與 `WAIT_PLAYER_MEANING` 進入後，啟動 `freeze.reason=AWAIT_PLAYER_INPUT`，聊天室輸出為 0（非 bug，debug 可見）。
- 玩家回覆後觸發 glitch burst（10 則，250~450ms 快刷）後再恢復正常節奏。
- Sandbox chat 平時節奏對齊 classic 常態區間（約 800~1600ms），但 freeze 期間 0 output、glitch 期間快刷。

### Removed / Deprecated Log（本次）

- 移除舊的 sandbox 數字 step（0~9）語意，改為具名 `SandboxFlowStep` 枚舉，避免第 2 題後重入卡住。
- 移除「等待玩家期間仍持續刷 chat」舊行為，統一改為 freeze gate。


## Sandbox Hybrid Chat（Director SSOT）

- sandbox 聊天改為 `Chat Director` 單一節奏來源：`PREHEAT / RANDOM / REACTIVE / FROZEN / GLITCH_BURST`。
- 預熱 30 秒採軟編排：0~20 秒保證 VIP 出場至少一次、5~25 秒保證 VIP 至少一次 `@玩家`。
- 問玩家（子音/意思）後立即 freeze，聊天室 0 output；玩家回覆後立即 glitch burst（預設 10 則、250~450ms/則）再繼續流程。
- sandbox VIP 固定 `👑 behindyou`（`src/sandbox/chat/vip_identity.ts`），classic mode 不受影響。


## Sandbox Patch Notes（2026-03-06）

- Freeze 外層總閘：sandbox chat dispatch 入口新增 gate，`freeze.frozen=true` 時僅允許 `GLITCH_BURST`。
- Glitch 專用句來源：`san_idle` 在 engine 內部分流為 general/glitch；一般路由不得抽 glitch 子集。
- Anti-spam guard：新增 emitKey cooldown、同 speaker 連發防護、tag_player 重入抑制（實際 skip/fallback，不只記錄）。
- ASK_PLAYER 問句 once-per-step：`ASK_PLAYER_MEANING` 成功發問後立即標記 `tagAskedThisStep=true` 並切到 `WAIT_PLAYER_MEANING`。
- WORD_RIOT 鎖修補：每題離開 riot 都 reset wave lock，並統一單一路徑推進到 `VIP_TRANSLATE`。
- Removed/Deprecated（sandbox）：移除 `WORD_RIOT` 多路並行推進（direct setFlowStep + callback 併存）行為，改為 timer SSOT。
- classic mode 未修改。

## Sandbox 強制回覆 Gate（沿用 classic reply-to，2026-03-06）

- 僅 sandbox_story 變更；classic mode 未修改。
- `WAIT_PLAYER_CONSONANT` 與 `WAIT_PLAYER_MEANING` 都改為沿用 classic 的 reply-to UI path：由同一個 `questionMessageId + AWAITING_REPLY` 驅動輸入框上方回覆條。
- sandbox 問玩家訊息建立後，立即綁定 reply-to（messageId）並進入 freeze；reply-to active 期間聊天室 0 output（含 join/idle/觀眾聊天/技術訊息全阻擋）。
- 玩家必須送出一則非空訊息才會解除 gate；送出後才進入後續 glitch/reveal/推題流程。

## Sandbox Riot 上限與節奏規則（2026-03-06）

- WORD_RIOT 每次固定上限 5 則（可接受區間 4~6，本次預設 5）。
- 平常 sandbox 頻率維持 classic 節奏；freeze=0 output、glitch burst 才允許快刷。
- 加入 WORD_RIOT step token 防重入，避免第 2 題後 timer 與 step 雙軌推進造成卡住。

## Sandbox Join Gate（2026-03-06，sandbox only）

- 新增 **PREJOIN / joinGate**：玩家提交名稱前 `joinGate.satisfied=false`，sandbox 聊天輸出總閘會阻擋所有非玩家訊息（0 output）。
- 玩家提交名稱後，會立即建立 `player.id + player.handle` 並寫入 active user，**不再依賴第一則玩家聊天訊息**。
- join 後會立即由 VIP 發送 `@玩家` 訊息，並直接走 classic 同一路徑 reply-to bar（sandbox 不自製第二套 pinned）。
- reply-to active 期間聊天室強制 0 output；玩家送出非空回覆後才解除 gate，恢復 PREHEAT 正常節奏。
- **classic mode 未修改。**

## 2026-03-06（sandbox only：Silent Prompt + 附身自動送字 + 第二次強制回覆 + tech backlog flush）

- sandbox flow 改為單一路徑：`PREJOIN -> PREHEAT -> TAG_PLAYER_1 -> WAIT_REPLY_1 -> POSSESSION_AUTOFILL -> POSSESSION_AUTOSEND -> CROWD_REACT_WORD -> TAG_PLAYER_2_PRONOUNCE -> WAIT_REPLY_2 -> FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`。
- 30 秒 PREHEAT 到點後採 **Silent Prompt**：overlay 照常顯示子音，但聊天室不再發題目公告；改由 `mod_live` 或 `👑 behindyou` 直接 `@玩家` 並立刻進 reply-to freeze（0 output）。
- 玩家回覆第一段後啟動「附身打字」：sandbox wrapper 會控制輸入框 value 為本題單字，並於 300~700ms 內走同一送出管線自動送出。
- 自動送字後固定進入 `CROWD_REACT_WORD`（預設 6，區間 4~8），內容含「什麼意思／是不是拼音／這拼音怎麼唸」。
- 接著第二次由 `mod_live` 或 `👑 behindyou` 再 `@玩家` 問「所以到底怎麼唸？」並啟用 reply-to（不可取消）；reply-to active 期間聊天室 0 output。
- 技術故障改為 backlog：在 `WAIT_REPLY_1/WAIT_REPLY_2` 期間每 30 秒累積 2 則（含「奇怪卡了大約 X 分鐘」），玩家回覆後於 `FLUSH_TECH_BACKLOG` 一次吐出（最多 8 則）再推進下一題。
- classic mode 未修改。

## 2026-03-06（sandbox only：tech backlog 僅 Tag#3 WAIT 啟用）

- sandbox flow 改為三段強制 tag 回覆：`TAG_PLAYER_1 -> WAIT_REPLY_1 -> ... -> TAG_PLAYER_2_PRONOUNCE -> WAIT_REPLY_2 -> TAG_PLAYER_3_MEANING -> WAIT_REPLY_3 -> FLUSH_TECH_BACKLOG -> ADVANCE_NEXT`。
- `SandboxStoryState.flow` 新增 `currentTagIndex: 1|2|3`，並以 `isTechBacklogEnabled = currentTagIndex===3 && flow.step===WAIT_REPLY_3` 作為唯一 tech backlog 開關。
- Tag#1 / Tag#2 的 WAIT 僅維持 reply-to + freeze 的 0 output；禁止累積與輸出任何技術故障文字。
- 只有 Tag#3 WAIT 期間，且 reply-to active 時，才每 30 秒背景累積 2 則 tech backlog（第二則固定為「奇怪卡了大約 X 分鐘」）。
- 玩家回覆 Tag#3 後才進 `FLUSH_TECH_BACKLOG`，一次 flush（最多 8 則，含最後分鐘訊息）再推進下一題。
- classic mode 未修改。

## Sandbox Flow Update（2026-03-06）

- sandbox only：Join 後改為純 PREHEAT（30 秒）不再立即建立強制 reply-to 問句。
- PREHEAT 期間僅寒暄與一般互動，禁止出題；第一次強制回覆從 `TAG_PLAYER_1` 才開始。
- `reply-to active => 0 output`、`tech backlog only in WAIT_REPLY_3` 維持不變。
- 新增 sandbox flow SSOT 文件：`docs/sandbox-flow-table.md`。
- classic mode 未修改。

## 2026-03-06 Sandbox Reply/Mention/Pin Pipeline Audit（audit only, sandbox only）

- 本次為 **audit-only**，未修改程式邏輯；classic mode 無改動。
- 新增稽核報告：`docs/sandbox-reply-pipeline-audit-2026-03-06.md`。
- 稽核結論（重點）：
  - `@me`（自 tag）主因為 auto-pin 分支把 `lockStateRef.target` 指向 active user，送出時被 `submitChat` 強制前綴重寫。
  - sandbox pinned preview 顯示在 chat panel 頂部屬 DOM render order（`replyPinBar-sandbox` 在 message list 前），且原訊息 row 不會被移除，故會雙重顯示。
  - inline reply preview 與 sandbox top pin 為兩條並行 pipeline，現況缺少互斥 guard。
  - debug action 多數已 isolated，但 `Emit NPC Tag @You` 仍走 event 發送管線，存在殘餘耦合風險。

### SSOT / Debug 欄位變更紀錄（本次）

- SSOT：無資料模型變更（audit only）。
- Debug：無新增欄位（僅補充稽核文件與風險地圖）。

### Removed / Deprecated Log（本次）

- 本次 audit-only，無移除/廢棄功能。

## 2026-03-07 Sandbox NIGHT_01 判題接線修復（sandbox only）

- 玩家在 sandbox `WAIT_REPLY_*` 且存在 consonant prompt 時，送出訊息會強制進入 classic parser/judge pipeline：`parseAndJudgeUsingClassic -> commitConsonantJudgeResult`。
- `WAIT_REPLY_*` 不再由「任意字串送出」直接通關；只有 judge `correct/pass` 會推進步驟，`wrong/unknown` 會留在 WAIT。
- `askSandboxConsonantNow` 改為訊息內容與 pinned 皆使用同一份題目 prompt，避免 UI 題目與 judge target 不一致。
- sandbox parser 在 normalize 前會先移除前置 mention（例如 `@behindyou บ` / `@behindyou 2` / `@behindyou 不知道` 仍可判題）。
- classic mode 未修改。


## 2026-03-08 Sandbox NIGHT_01 warmup gate vs preheat mention conflict（sandbox only）

- PREHEAT 導演 direct mention 已與正式 warmup gate 文案拆分：PREHEAT 僅保留「可互動但不需回覆」句型，正式 `@<player> 嗨嗨，第一次看這台嗎？` 僅由 `askSandboxWarmupTagNow()` 發送。
- autoPinFreeze 在 PREHEAT 不再把 VIP direct mention 當 reply gate；僅保留 highlight 記錄，避免 UI 偽裝成可 consume 問答門。
- warmup consume 維持 `WARMUP_TAG_REPLY` 單一入口，strip leading mentions 後非空即 consume，並固定推進 `WARMUP_NPC_ACK -> WARMUP_CHATTER -> TAG_PLAYER_1`。
- warmup ack 語意池統一為「今天氣氛跟平常不一樣」；ack 後再接 2~4 句 chatter 才進第一題子音。
- Debug 新增 `sandbox.replyGate.*`、`sandbox.lastReplyEval.*` 與 `sandbox.pinned.sourceType`，可區分 `warmup_gate` / `auto_pin_freeze` / `qna_reply` / `prompt_preview`。
- Removed/Deprecated（sandbox）：移除 PREHEAT 與 warmup gate 共用同句問句路徑。
- classic mode 未修改。

## Sandbox experience-first rebuild (Night 1)
- Sandbox 現在以 `sandboxFlow` 為互動節奏 SSOT，並以固定 10 題體驗節奏執行。
- PREHEAT 固定 30 秒先建立熟客聊天室感，之後才進題目。
- WAIT_REPLY 期間採硬 freeze（非玩家輸出=0），並累積 sanity/backlog；玩家回覆後一次 flush。
- Auto Play Night 會在 WAIT_REPLY 自動注入 mock reply，完整推進至第 10 題。
- Classic mode 路徑不變。
