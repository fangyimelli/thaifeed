# 07｜Debug System（除錯系統）

## 這份文件在管什麼

規範 Debug 入口、欄位分類、欄位生命週期與 Event Tester 使用方式。

## Debug 入口

1. 主頁右上角 Debug 按鈕（overlay）
2. `/debug/player`（播放器最小驗證頁）
3. `window.__CHAT_DEBUG__`（除錯狀態對外觀測）

## overlay 欄位分類建議

- Player：activeKey、switch lock、timer/watchdog、fallback
- Audio：fan loop 狀態、SFX 冷卻與播放
- Chat：lastEvent、lastPickedType、tag/persona、reaction window
- Event：lastEvent/reason、queue、blocked、abort
- Mobile：viewport、input/chat/container 高度

## Debug 欄位治理規則（3 次 PR 規則）

- 新增 debug 欄位後，至少經過 **3 次 PR** 的實際驗收仍無人使用，才可提議移除。
- 移除前需在 PR 說明記錄：
  1. 最近 3 次 PR 的驗收紀錄
  2. 欄位未被使用的理由
  3. 替代欄位或觀測方法

## Event Tester

- Event Tester 是事件驗收工具，不是業務流程入口。
- 可用於驗證：
  - 事件是否能觸發
  - pre-effect 是否有執行
  - starter tag 是否接續成功
  - abort 後是否正確回復

## 驗收建議

1. 每個重大改動至少保留一組 debug 截圖/欄位紀錄。
2. 若修的是計時或排程，必看 timer + watchdog + executedAt。
3. 若修的是聊天或事件，必看 lastEvent + blocked reason + line key。

## 相關文件

- [03 Player System](./03-player-system.md)
- [06 Event System](./06-event-system.md)
- [08 Mobile Layout](./08-mobile-layout.md)
- [09 Troubleshooting](./09-troubleshooting.md)

## 2026-03-02 新增欄位（stuck-state recovery）
- `event.cooldownMeta[eventKey].nextAllowedAt`：該事件下一次可觸發時間（只在 commit 後更新）。
- `event.cooldownMeta[eventKey].lastCommittedAt`：最後一次合法 commit 時間。
- `event.cooldownMeta[eventKey].lastRollbackAt`：因 abort（如 `question_send_failed`）回滾時間。
- `event.freezeGuard.hasRealTag/replyUIReady/freezeAllowed`：freeze 啟動 guard 判斷快照。
- `chat.system.debugReset.count/reason/resetAt`：一鍵救援執行次數、原因與時間。
