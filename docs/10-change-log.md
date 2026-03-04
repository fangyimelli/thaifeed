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
