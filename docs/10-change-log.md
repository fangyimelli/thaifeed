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
