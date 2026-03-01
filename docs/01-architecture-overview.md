# 01｜架構總覽（Architecture Overview）

## 這份文件在管什麼

本頁描述 ThaiFeed 的高層資料流與模組邊界，避免跨層耦合造成維護困難。

## 高層資料流

1. **Scene / Player 層**
   - 負責影片切換、crossfade、active/inactive lane 音訊約束。
2. **Event 層**
   - 依條件決定事件內容、SFX 請求、後續 follow-up。
3. **Chat 層**
   - 依節奏狀態機與 topicMode 產生聊天輸出。
   - 控制 speaker、persona、tag 規則與去重。
4. **Audio 層**
   - 管理 fan loop 與事件 SFX 播放、互斥、冷卻。
5. **Debug 層**
   - 提供 overlay 與 `/debug/player` 觀測，不引入第二套業務邏輯。

## 模組責任分離

### Player
- 唯一目標：場景切換穩定、僅 active video 出聲。
- 不負責決定聊天內容。

### Audio
- 唯一目標：背景環境音穩定、事件音效可追蹤。
- 不直接決定事件語意或聊天發言。

### Chat
- 唯一目標：穩定送出、節奏控制、tag 合規。
- 不直接進行影片切換。

### Event
- 唯一目標：事件編排與觸發。
- 不能直接 emitChat、不能直接 switch video。

### Debug
- 唯一目標：可觀測性與可驗收性。
- 不應寫入與正式邏輯分歧的判斷分支。

## 邊界違規範例（禁止）

- 在 EventRunner 內直接 `emitChat(...)`。
- 在 Chat engine 內直接 `switchTo(...)` 切播放器。
- 在 Debug UI 內使用專屬 private switch 邏輯，與 `playerCore` 分家。

## 建議閱讀順序

1. [02 SSOT Map](./02-ssot-map.md)
2. [03 Player System](./03-player-system.md)
3. [06 Event System](./06-event-system.md)
4. [07 Debug System](./07-debug-system.md)
5. [09 Troubleshooting](./09-troubleshooting.md)
