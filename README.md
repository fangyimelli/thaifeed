# ThaiFeed（現況文件）

本文件依目前程式碼與資產狀態整理（Vite + React + TypeScript）。

## 專案定位

ThaiFeed 是一個**偽直播（Pseudo-live）**的互動 Demo，主題是**老屋沉浸式恐怖氛圍**，核心玩法是**泰文子音辨識（roguelike 式壓力循環）**。

## 本機啟動

```bash
npm install
npm run dev
```

## 必要素材清單（程式檢查 SSOT，必須與 `public/` 相對路徑一致）

> 程式以相對路徑 `assets/...` 做檢查，部署時會自動套用 base path；請勿把素材路徑硬寫成 `/assets/...`。

### 必要影片（3 支）

- `assets/scenes/oldhouse_room_loop.mp4`
- `assets/scenes/oldhouse_room_loop2.mp4`
- `assets/scenes/oldhouse_room_loop3.mp4`

### 必要音效（3 支）

- `assets/sfx/fan_loop.wav`
- `assets/sfx/footsteps.wav`
- `assets/sfx/ghost_female.wav`

### 放置位置

- 開發時請放在 `public/assets/...`，例如：
  - `public/assets/scenes/oldhouse_room_loop3.mp4`
  - `public/assets/sfx/fan_loop.wav`

## Base path / 部署路徑說明

專案已改成以單一來源 `ASSET_BASE_URL` 解析素材 URL，優先順序如下：

1. `<base href>`
2. `import.meta.env.BASE_URL`（Vite）
3. `document.baseURI`
4. fallback `/`

所有素材 URL 都透過 `joinUrl(base, relativePath)` 組合，因此在以下環境可共用同一份程式：

- localhost 根路徑
- GitHub Pages 子路徑（例如 `/<repoName>/`）
- 其他有自訂 base href 的部署

## 必要素材缺失時的錯誤資訊

若任一必要素材不存在或 URL 解析錯誤，初始化會停在 ERROR，且畫面與 Console 會顯示同一份 missing 清單，每筆包含：

- 素材類型與名稱（video/audio + name）
- 相對路徑（例如 `assets/scenes/oldhouse_room_loop3.mp4`）
- 實際檢查 URL（已套用 base path）
- 檢查失敗原因（HEAD/GET status 或其他 fetch error）

錯誤訊息也會明確提示：

- **素材未加入專案**
- 或 **base path 設定錯誤**

## 目前程式中的素材檢查策略

- `verifyRequiredAssets()`
  - `verifyVideos()`：先 `HEAD`，不支援時 fallback `GET`
  - `verifyAudio()`：使用 fetch 檢查存在，不用 `canplaythrough` 當存在判斷
- 缺失資料會整合為 `missing[]`，統一提供 UI 與 Console。

## 音訊同步規則

- 雙 video crossfade（videoA/videoB）採「單一真相」：**僅 active video 可出聲**。
  - 切換時在 buffer video `play()` 成功後、淡入前，立即把 audio lane 切到 buffer。
  - inactive video 一律 `muted=true`、`defaultMuted=true`、`volume=0`。
  - crossfade 結束後，舊的 current video 會 `pause()` 並維持靜音/零音量，避免殘留聲音。
- 獨立 audio 僅保留三套：
  - 常駐：`fan_loop`
  - 排程觸發：`footsteps`、`ghost_female`
- 已移除 per-video ambient mapping 舊邏輯，避免「影片音軌 + per-video ambient」並存導致錯誤判讀。
- Debug 排查（`?debug=1`）：
  - overlay 會顯示 activeKey、兩支 video 的 `paused/muted/volume`。
  - overlay 會顯示目前正在播放的 audio elements（fan/footsteps/ghost）。
  - Console 會輸出 `[AUDIO-DEBUG]` snapshot/tick，可快速定位是否有多來源同播。

## 插播排查（timer / ended / lock / timeout）

- 播放策略 SSOT（`src/config/oldhousePlayback.ts`）：
  - `MAIN_LOOP = oldhouse_room_loop3`（主畫面常駐）
  - `JUMP_LOOPS = [oldhouse_room_loop, oldhouse_room_loop2]`（插播僅兩支，暫停 loop4）
- 插播間隔（`computeJumpIntervalMs(curse)`）：
  - `CURSE=0`：`90,000 ~ 120,000 ms`（1.5~2 分鐘）
  - `CURSE=100`：`30,000 ~ 60,000 ms`
  - 下限保護：不會低於 `30,000 ms`（30 秒）
- 插播影片播放到自然 `ended` 後回 `MAIN_LOOP`，並立刻重排下一次插播。
- `scheduleNextJump()` 每次都先清掉舊 timer 再重排，避免重複或遺失。
- `triggerJumpOnce()` 會檢查 `isSwitching` / `isInJump` / `currentKey===MAIN_LOOP`，並輸出 debug log。
- `switchTo()` 使用 `try/finally` 強制釋放 `isSwitching` lock，任何失敗都不會卡死。
- `preloadIntoBuffer()` 有 timeout fallback：
  - 3.2 秒內若 `readyState >= HAVE_CURRENT_DATA` 視為可播。
  - 超時且仍不可播則進 ERROR UI（不黑畫面，保留錯誤資訊）。
- 插播影片若 `ended` 未回主循環，另有 fallback timer（至少 45 秒，且會參考素材時長再延長）強制切回 `MAIN_LOOP` 並重排下一次插播。

## 聊天室送出穩定性

- 單一路徑：`App.tsx` 的 `submitChat(text)` 是唯一送出入口。
- 行為保證：
  - 空字串不送。
  - 送出時 `isSending=true`，延遲 1~5 秒後一定執行送出流程。
  - `finally` 一律 `isSending=false`，避免按鈕/狀態卡住。
- 事件綁定：
  - `form onSubmit`：`preventDefault()` 後呼叫 `onSubmit`。
  - `button onClick` / `onTouchEnd`：呼叫同一個 `onSubmit`。
  - `onKeyDown Enter`：排除 IME 組字（`isComposing`/`keyCode===229`）才送出。
- iOS 鍵盤：仍用 `visualViewport` 修正輸入列位置，並提高輸入列 `z-index` 與 `pointer-events`，避免透明層或覆蓋層吞點擊。

## 聊天室主題與影片狀態連動

- 影片切換成功後，`switchTo()` 在 `currentKey` 更新完成時會發出 `emitSceneEvent({ type: "VIDEO_ACTIVE", key, startedAt })`。
  - `startedAt` 以 `play()` 成功且第一幀可用後時間點為準。
  - `loop3`、`loop`、`loop2` 都會發送，作為聊天室 topic state 的單一來源。
- 聊天室 topicMode：
  - `oldhouse_room_loop3`（主循環）→ `CALM_PARANOIA`。
  - `oldhouse_room_loop` / `oldhouse_room_loop2`（插播）→ 先維持 `NORMAL`，播放滿 5 秒後進入 `LIGHT_FLICKER_FEAR`。
  - `LIGHT_FLICKER_FEAR` 持續時間為隨機 10~12 秒，結束後回到正常節奏。
- 取消條件：
  - 若插播 5 秒內切回 `loop3`，會清除 `lightFearTimer`，不會誤觸發燈光恐懼討論。
  - 回到 `loop3` 時也會清除 fear duration timer，立即恢復 `CALM_PARANOIA`。
- 與人格 / TagV2 / 節奏模型關係：
  - 沿用既有 20 人格風格（標點、語助詞、網路語感）只替換 topic 語料池。
  - `TagV2` 規則不變：只 tag activeUsers、activeUsers < 3 禁止 tag、輸出前仍經 `sanitizeMentions`。
  - 同一套 chat scheduler 會依 topicMode 調整頻率：`CALM_PARANOIA` 偏慢、`LIGHT_FLICKER_FEAR` 較密但不刷版，未新增第二套 interval。

## 其他

- 目前不再要求 `oldhouse_room_loop4.mp4`；只要上述 3 支必要影片與 3 支必要音效存在，即可進入 RUNNING。

## 本次衝突點調整（專案級）

- 已完成全域檢查並統一移除舊式絕對路徑（`/assets/...`）在執行期 UI 元件中的用法，改為 `resolveAssetUrl(...)`：
  - Scene overlays（smoke / crack / vignette / noise）
  - VIP crown icon
- 以上調整可避免在子路徑部署（例如 GitHub Pages）時，載入層與聊天室圖示走舊邏輯導致 404，而與專案既有的 `ASSET_BASE_URL` / `joinUrl` 新邏輯衝突。
