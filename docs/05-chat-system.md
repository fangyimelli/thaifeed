# 05｜Chat System（聊天室系統）

## 這份文件在管什麼

聊天室送出穩定性、pacing 狀態機、Tag 規則與 topicMode 維護方式。

## 送出穩定性（Submit Stability）

- 送出入口要維持單一路徑，避免多處各自送出。
- 空字串不送出；送出中要有防重複保護。
- Enter 送出需排除 IME 組字狀態。
- 手機送出後要做鍵盤收合與捲底補償。

## pacing 狀態機

- 聊天節奏由 Chat 引擎統一控制，不得額外建立第二套 interval。
- 事件可影響節奏參數，但不可直接控制聊天室渲染節點。
- `topicMode` 與 `reaction window` 只能透過既有狀態機流轉。

## Tag 規則

- 僅能 tag active users。
- `active users < 3` 禁止 tag。
- 禁 tag 系統保留對象（如 `system/mod/...`）。
- 若模板含 tag 但找不到合法 target，降級成不 tag 文案。

## lint / 內容規則

- 禁止工程口吻、調試口吻直接出現在聊天文案。
- 語言要單句一致，不混語。
- 套用去重策略（全域 recent + persona recent）。

## topicMode 範例

- `loop3` 主循環：`CALM_PARANOIA`
- `loop/loop2` 插播：可進入 `LIGHT_FLICKER_FEAR` 視窗
- 插播提前結束或切回主循環：清除 fear timer

## 驗收清單

1. 連續送出不會卡在 `isSending`。
2. mobile 送出後輸入列與捲底穩定。
3. Tag 沒有違規對象。
4. topicMode 轉場符合影片狀態。

## 相關文件

- [01 Architecture Overview](./01-architecture-overview.md)
- [06 Event System](./06-event-system.md)
- [08 Mobile Layout](./08-mobile-layout.md)
- [09 Troubleshooting](./09-troubleshooting.md)
