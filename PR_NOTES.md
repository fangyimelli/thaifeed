# 將 TV_EVENT 冷卻欄位由 legacy `loop4` 命名整合為 `tv_event`

## 變更摘要
- 系統性檢查現行播放 SSOT 與 legacy 命名衝突點，確認 `TV_EVENT` 冷卻邏輯仍有保留必要。
- 保留舊邏輯的冷卻行為（90 秒）與 gate 流程，不移除功能。
- 將 `src/app/App.tsx` 的 cooldown key 由 `loop4` 改為 `tv_event`，消除語意衝突並提升可維護性。
- 同步更新 README 與變更紀錄文件。

## 影響範圍
- player: 無
- audio: 無
- chat: 無
- events: `TV_EVENT` gate 命名整合（行為不變）
- assets: 無
- mobile: 無
- debug: 移除 legacy debug/cooldown 欄位 `loop4`，改以 `tv_event` 表示
- docs: README、docs/10-change-log.md

## SSOT 變更點
- 無新增/修改 SSOT 檔案（僅對應用層命名清理，SSOT 播放配置維持現狀）。

## Docs 同步
- `README.md`
- `docs/10-change-log.md`

## Removed
- 移除項目：`cooldownsRef.loop4`
- 原因：舊命名與已移除 loop4 播放策略衝突，易造成維運誤讀
- 影響：無功能移除，`TV_EVENT` 冷卻行為與觸發限制維持不變
- 替代方案：`cooldownsRef.tv_event`

## 驗收
- debug 欄位：確認 code 中無 `cooldownsRef.loop4`，且 `TV_EVENT` gate 使用 `cooldownsRef.tv_event`
- desktop：`TV_EVENT` 仍可被 cooldown gate 正常限制
- mobile：同 desktop（事件冷卻邏輯為共用程式碼）
