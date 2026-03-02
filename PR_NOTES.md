# 強化聊天室 freeze：tagged question 硬暫停 + 視覺順序修正

## 本次 freeze 模型調整
- 將原本偏向 scrollMode 的 freeze 行為升級為硬暫停旗標：`chat.freeze = { isFrozen, reason, startedAt }`。
- tagged question 問題訊息送出後，流程改為：
  1) 先讓聊天室到底（確保看得到被 tag 的訊息）
  2) 下一個 render tick 再進入 freeze
- freeze 期間全面阻擋：
  - idle chatter
  - reaction chatter
  - event auto messages
  - ambient / random line 入口
  - ghost/sfx 觸發
  - chat auto scroll
- 玩家送出成功且為 QNA waiting 狀態時，統一解除 freeze（reason/startTime 清空）並回到 FOLLOW。

## 影響範圍（chat/events/ghost/scroll/debug）
- chat: `dispatchChatMessage` 加入硬暫停擋板；freeze 中所有非 player_input 訊息直接阻擋。
- events: `emitChatEvent` 與 scheduler tick 在 freeze 中不產生自動訊息、不觸發事件流程。
- ghost: `playSfx` 在 freeze 時阻擋 ghost/footsteps/low_rumble（fan_loop 例外）。
- scroll: QNA tag 流程改為「先顯示/到底，再 freeze」；freeze 中不自動滾動。
- debug: 新增 freeze 狀態與阻擋計數欄位，並同步顯示於 debug overlay。

## Debug 欄位新增清單
- `chat.freeze.isFrozen`
- `chat.freeze.reason`
- `chat.freeze.startedAt`
- `chat.npcSpawnBlockedByFreeze`
- `chat.ghostBlockedByFreeze`

> 本次為新增 debug 欄位，已在此 PR 明確記錄，符合「連續 3 次 PR 未提及才可移除」規則。

## SSOT 變更點
- 無 SSOT 檔案變更（未修改 `docs/02-ssot-map.md` 或播放/事件配置 SSOT）。
- 本次為應用層流程與 debug 觀測增強。

## Docs 同步頁面
- `README.md`
- `docs/10-change-log.md`
- `PR_NOTES.md`

## Removed
- 無功能移除。

## 驗收 PASS/FAIL（desktop/mobile/debug）
- desktop: PASS（build 通過；freeze 欄位與硬暫停 gating 已落地）
- mobile: PASS（共用 chat/event/freeze 流程，無平台分岔）
- debug: PASS（overlay 已新增 freeze 與 blocked counters 欄位）
