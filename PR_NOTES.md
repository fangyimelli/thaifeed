# 修正：question_send_failed 導致 freeze/pause/cooldown 鎖死

## 變更摘要
- 調整事件 commit 規則：cooldown 僅在事件成功開始後才寫入（不再於測試入口預先推進）。
- `question_send_failed` 失敗路徑新增收尾：強制解除 freeze/pause、qna reset、event queue 清空、rollback cooldown。
- tagged_question freeze 增加 guard：需同時 `hasRealTag=true` + `replyUIReady=true` 才可 freeze。
- 新增 watchdog：`freezeCountdownRemaining<=0` 仍 frozen 時自動解凍。
- Debug 面板按鈕改為 **Reset Stuck State**（一鍵解卡，手機可用）。
- 新增 debug 欄位：
  - `event.cooldownMeta[eventKey].nextAllowedAt/lastCommittedAt/lastRollbackAt`
  - `event.freezeGuard.hasRealTag/replyUIReady/freezeAllowed`
  - `chat.system.debugReset.count/reason/resetAt`

## 修改檔案
- `src/app/App.tsx`
- `README.md`
- `docs/10-change-log.md`
- `docs/07-debug-system.md`
- `scripts/regression-question-send-failed.mjs`
- `scripts/regression-freeze-watchdog.mjs`

## 風險
- `startEvent()` 現在會在 abort 路徑主動 recover，若後續有新事件型別依賴 partial state，需明確補豁免。
- debug reset 會清空事件 cooldown（用於救援），不應在 production 自動流程觸發。

## 重現與驗證（thaifeed-bd75c.web.app 或本機）
1. 開 `?debug=1`。
2. 觸發一個 tagged question 事件（如 `GHOST_PING`/`VIEWER_SPIKE`），在網路/發送失敗情境下重現 `question_send_failed`。
3. 檢查 debug：
   - `event.lastEvent.abortedReason=question_send_failed`
   - `event.cooldownMeta.<event>.lastRollbackAt` 有值，`nextAllowedAt` 未被錯誤推進。
   - `chat.freeze.isFrozen=false`、`chat.pause.isPaused=false`、`qna.status=IDLE`。
4. 連按 `Force GHOST_PING` / `Force VIEWER_SPIKE`：應可持續觸發（僅受正常 cooldown 影響，不會卡成永久 blocked）。
5. 手機版開 debug 面板按 `Reset Stuck State`：可立即恢復互動。

## SSOT / debug 欄位變更紀錄
- SSOT：`src/app/App.tsx` 的 `startEvent()` 現為唯一 cooldown commit / rollback 寫入點。
- debug 欄位語意：
  - `cooldownMeta` 用於區分「合法 commit」與「abort rollback」。
  - `freezeGuard` 用於判斷 freeze 啟動是否符合 UI 與 tag 條件。
  - `debugReset` 用於現場救援追蹤與回歸驗證。
