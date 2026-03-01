# 00｜專案定位與維護哲學

## 這份文件在管什麼

本頁定義 ThaiFeed 的定位、不可破壞原則與維護時的決策準則。當新舊邏輯衝突時，先回到本頁判斷「舊邏輯是否仍有必要」。

## 專案定位（短版）

ThaiFeed 是一個以 **偽直播（Pseudo-live）** 呈現的互動 Demo，主題為老屋沉浸式恐怖氛圍，核心互動是泰文子音辨識與聊天室壓力循環。

## 不可破壞原則（Hard Rules）

1. **SSOT（Single Source of Truth）優先**
   - 同一職責只能有一份真相來源（例如播放器、事件清單、SFX 註冊、聊天類型）。
   - 禁止平行實作第二套邏輯「先頂著用」。

2. **事件層不能直接發言**
   - Event 層只提供內容與觸發資訊。
   - 真正發言（speaker/persona/tag/節奏）一律交給 Chat 引擎。

3. **只有 active video 可以出聲**
   - Crossfade 過程與結束後都要遵守 active lane 音訊規則。
   - Inactive video 必須保持 `muted + volume=0`，必要時 `pause()`。

4. **素材路徑必須使用相對路徑**
   - 一律使用 `assets/...`，不得硬寫 `/assets/...`。
   - Base path 必須由統一機制解析（見 [02 SSOT Map](./02-ssot-map.md)）。

5. **事件流程必須走 pre-effect → starter tag**
   - 先建立前置效果（音效/畫面/節奏），再進入 starter tag 對話。
   - 不可跳過 pre-effect 直接硬插事件發言。

## 新舊邏輯衝突時的判斷流程

1. 先確認舊邏輯是否仍服務既有需求（可靠性、相容性、驗收）。
2. 若仍必要：**整合新舊邏輯**，並把整合後規範寫回 SSOT 文件。
3. 若已無必要：**刪除舊邏輯**，由新邏輯接手，避免雙軌。
4. 所有判斷結果都要同步到：
   - README 索引
   - 對應 docs 分頁
   - `docs/10-change-log.md`

## 驗收重點

- 規格是否可追到唯一 SSOT 檔案。
- 是否有跨層直呼叫（例如事件層直接切播放器或直接 emitChat）。
- 是否有硬編 `/assets/...`。
- 事件新增時是否遵守 pre-effect → starter tag。
