# CONTRIBUTING（協作與 PR 規範）

本文件定義 ThaiFeed 的協作底線，避免多人維護時長出第二套邏輯。

## 1) SSOT 原則（禁止第二套邏輯）

- 同一職責只能有一份真相來源（SSOT）。
- 發現既有邏輯分散時，先收斂再擴充。
- 禁止以「先複製一份比較快」方式提交。

參考：
- [02｜SSOT Map](./docs/02-ssot-map.md)
- [00｜專案定位與維護哲學](./docs/00-philosophy.md)

## 2) 系統修改邊界規則

### 播放器（Player）
- 切換邏輯只改 `playerCore` 與播放策略 SSOT。
- 不可在聊天或事件層直接切影片。

### 事件（Event）
- 事件由 Registry + Runner 管理。
- 不可在事件層直接 `emitChat`；必須交給 Chat 引擎。

### 聊天（Chat）
- 送出入口維持單一路徑。
- Tag 與 pacing 規則需維持在 chat 系統，不外漏到其他層。

### 音訊（Audio）
- 音效鍵值以 SFX Registry 為準。
- 不可在任意層直接硬編音效 URL 或 key。

## 3) 文件同步規範

- 每次修改後都要更新 README（至少確認入口索引與連結仍正確）。
- 若改到流程/規格，必須同步更新對應 docs 分頁與 `docs/10-change-log.md`。

## 4) PR Checklist（必填）

請在 PR 內容逐項回答：

- [ ] 我改了哪個 SSOT 檔案：`...`
- [ ] docs 是否同步更新：`是 / 否`，頁面：`docs/..`
- [ ] debug 驗收方式：看哪些欄位、在哪個頁面驗證
- [ ] mobile / desktop 是否都驗收：`是 / 否`，補充結果
- [ ] 是否新增/移除 debug 欄位：
  - 若新增：用途與驗收場景
  - 若移除：是否符合「3 次 PR 規則」與佐證

## 5) Commit 與變更紀錄建議

- Commit 訊息請包含子系統關鍵字（player/audio/chat/event/debug/mobile/docs）。
- 流程級變更請同步登錄 `docs/10-change-log.md`。
