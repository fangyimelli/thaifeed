# 06｜Event System（事件系統）

## 這份文件在管什麼

事件註冊、執行流程、pre-effect → starter tag、abort 補救與事件新增流程。

## SSOT

- Event Registry：`src/director/EventRegistry.ts`
- Event Runner/Engine：`src/director/EventEngine.ts`
- 文案來源：`src/chat/LineRegistry.ts`

## 核心規則

1. **事件必有 tag 與語意標記**
   - 每個事件需定義可追蹤的 key、lineKey、觸發原因。
2. **事件層不能直接發言**
   - Event 只提供內容 payload，不能直接 emitChat。
3. **事件層不能直接切播放器**
   - 場景切換必須交由 Scene/Player 層處理。

## pre-effect → starter tag 流程

1. Event 觸發後先執行 pre-effect（SFX/畫面氛圍/節奏預熱）。
2. pre-effect 成功後才進 starter tag。
3. starter tag 進入後，再由 Chat 引擎接手後續內容發送。

## abort 補救原則

- 若 pre-effect 成功但 starter tag 失敗，需寫入可觀測錯誤（debug/console）。
- 若事件中斷（abort），需有回復流程：
  - 清除事件鎖
  - 回收未執行 follow-up
  - 必要時切回主循環節奏

## 新增事件 Checklist

1. 在 `EventRegistry` 新增 `EventSpec`。
2. 在 `LineRegistry` 補同名 line key 與足量 variants。
3. 若有音效，在 `SfxRegistry` 註冊 key。
4. 在 debug 欄位可看到觸發、阻擋、冷卻、abort 原因。
5. 更新文件：
   - 本頁
   - [02 SSOT Map](./02-ssot-map.md)
   - [10 Change Log](./10-change-log.md)

## 驗收指標

- 事件可被觸發、可被阻擋、可被取消，且每種結果都可觀測。
- 無跨層直接 emitChat / switch video。
- pre-effect 與 starter tag 順序正確。

## 相關文件

- [02 SSOT Map](./02-ssot-map.md)
- [05 Chat System](./05-chat-system.md)
- [07 Debug System](./07-debug-system.md)
- [09 Troubleshooting](./09-troubleshooting.md)
