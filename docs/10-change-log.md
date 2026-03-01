# 10-change-log

## Changed

- `src/app/App.tsx`：針對 `TV_EVENT` 的 cooldown gate，將 legacy key `cooldownsRef.loop4` 重構為 `cooldownsRef.tv_event`。
- 行為整合策略：保留既有 90 秒 cooldown 與 gate 判斷時機，僅替換舊命名以消除與已移除 loop4 場景策略的語意衝突。
- `README.md`：同步更新本次衝突整合與移除紀錄。

## Removed

- 移除 debug/cooldown 追蹤欄位：`cooldownsRef.loop4`。
  - 原因：`loop4` 已非現行播放策略 SSOT，舊命名易造成維運誤判。
  - 影響：無功能移除，`TV_EVENT` cooldown gate 仍正常運作。
  - 替代：`cooldownsRef.tv_event`。
