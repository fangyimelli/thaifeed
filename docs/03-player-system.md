# 03｜Player System（播放器與場景切換）

## 這份文件在管什麼

播放器切換、插播排程、fallback 與 debug 驗收流程。此頁是 player 相關維護首要參考。

## SSOT 與播放策略

- Player 核心：`src/core/player/playerCore.ts`
- 播放策略：`src/config/oldhousePlayback.ts`
  - `MAIN_LOOP = oldhouse_room_loop3`
  - `JUMP_LOOPS = [oldhouse_room_loop, oldhouse_room_loop2]`

> loop4 已移除，不再列入必要循環與排程。

## `playerCore` 責任

- `init(videoA, videoB)`：建立 A/B 雙軌播放器。
- `switchTo(key, url)`：統一場景切換入口。
- `loadSource(el, url)`：素材預載與 ready gate。
- `crossfade(active, inactive, ms)`：處理淡入淡出。
- `enforceAudio(active, inactive)`：只允許 active 發聲。
- `stop()`：停止播放與釋放。

## 排程 / 插播機制

- 插播候選只能來自 `JUMP_LOOPS`。
- `scheduleNextJump()` 只負責排程與 due time。
- `Force Planned Jump Now` 只吃當下 `plannedJump`，不重算 pick。
- watchdog 會在 timer 漏觸發時補執行。

## fallback 與 ended handler

- 插播影片若 `ended` 後未回主循環，必須有 fallback timer 強制切回 `MAIN_LOOP`。
- `switchTo()` 需使用 `try/finally` 釋放 lock，避免卡死在 `isSwitching=true`。
- preload timeout 要有可觀測錯誤，不可 silent fail。

## Force Buttons 與 `/debug/player`

- 主頁 overlay：
  - `Force LOOP` / `Force LOOP2` / `Force MAIN`
  - `Force Planned Jump Now`
  - `Reschedule Jump`
- `/debug/player`：
  - 僅做 playerCore 最小可驗證，不能與主頁分叉實作。

## 驗收清單

1. 只有 active video 有聲音。
2. 自動插播可在 due 到期後切入、切回。
3. `Force LOOP/LOOP2/MAIN` 全部可切。
4. `/debug/player` 與主頁切換行為一致。
5. debug 欄位可指出 `why not jumped` 與 fallback 原因。

## 相關文件

- [02 SSOT Map](./02-ssot-map.md)
- [04 Audio System](./04-audio-system.md)
- [07 Debug System](./07-debug-system.md)
- [09 Troubleshooting](./09-troubleshooting.md)
