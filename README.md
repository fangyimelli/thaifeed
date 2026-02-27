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
  - 主頁右上角提供 `Debug ON/OFF` 按鈕，可直接切換 `?debug=1`（不需手改網址）。

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

## Debug Player Harness（`/debug/player`）

- 新增最小可驗證頁面：`/debug/player`。
- 說明：`Switch to loop / loop2 / Auto toggle` 控制鈕**只會出現在 `/debug/player`**，主頁面不會顯示這些 debug 控制。
- 該頁面與主頁共用 `playerCore`（`src/core/player/playerCore.ts`），不維持第二套切換實作。
- 介面提供：
  - `Play loop3`
  - `Switch to loop`
  - `Switch to loop2`
  - `Auto toggle（8 秒）`
  - `Stop`
- Debug 面板顯示：
  - `activeKey`
  - `isSwitching`
  - A/B 的 `src/paused/readyState/currentTime/muted/volume/opacity/class`
  - `lastSwitchRequest`
  - `lastPreloadResult`

## 「只看到一支影片」排查 checklist

- D1 Timer/排程：
  - 確認 `scheduleNextJump()` 初始有被呼叫。
  - 每次回 `MAIN_LOOP` 會重排下一次插播。
  - `clearTimeout` 先清再排，不允許多 timer 疊加。
- D2 Lock 釋放：
  - `isSwitching/isInJump` 所有流程使用 `try/finally` 釋放。
  - 若插播失敗，釋放 lock 後回 `loop3` 重試，不可卡死。
- D3 預載 fallback：
  - `loadSource` 有 timeout（預設 3.2s）。
  - timeout 後 fallback 檢查 `readyState>=HAVE_CURRENT_DATA` 或 `requestVideoFrameCallback`。
- D4 Swap/ref 穩定：
  - crossfade 後確實 swap active slot。
  - ended handler 綁定兩個 video 並驗證僅 active layer 生效。
- D5 舊邏輯覆寫：
  - 移除重複的 preload/crossfade/audio lane 實作，統一進 `playerCore`。
  - 禁止 state/useEffect 在切換後強制覆寫回 loop3（除錯誤回復策略外）。

## playerCore 設計規則（SSOT）

- 單一來源：`src/core/player/playerCore.ts`。
- 對外介面：
  - `init(videoA, videoB)`
  - `switchTo(key, url)`
  - `loadSource(el, url)`
  - `crossfade(active, inactive, ms)`
  - `enforceAudio(active, inactive)`
  - `stop()`
- 音訊同步原則：
  - 僅 active 可出聲。
  - inactive 一律 `muted=true + volume=0 + pause()`。
  - 主頁與 debug harness 必須共用同一個 `playerCore`，避免雙軌邏輯並存。

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
- 鍵盤與視窗高度變動：改為全平台 `--app-vh` 佈局（iOS / Android / Desktop 同套），不再依賴輸入列 `translateY` 位移。

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

## Responsive 版面策略

### DesktopLayout / MobileLayout 分流（Breakpoint: `>=1024px` 為 Desktop）

- **DesktopLayout（>=1024px）**
  - 回復桌機雙欄：左側影片區、右側聊天室。
  - 使用一般頁面高度與可捲動行為，不套用 mobile 專用 `overflow:hidden`。
  - 不啟用 `visualViewport` 監聽，也不做 `--app-vh` 高度重算。
- **MobileLayout（<1024px）**
  - 維持三區塊：`TopDock`（頂部固定）/ `ChatScroll`（可捲動）/ `InputDock`（底部固定）。
  - 啟用 `--app-vh` + `visualViewport` 監聽，確保鍵盤彈出時輸入列可見。
  - `html/body/#root/.app-shell` 在 mobile 下改為固定高度並禁止整頁滾動，避免鍵盤導致整頁亂跳。

### 為何 Mobile 需要 `--app-vh`

- 手機鍵盤彈出時，瀏覽器可視區高度會變動，且 `100vh` 在不同瀏覽器不穩定。
- 使用 `visualViewport.height` 寫入 `--app-vh` 後，版面高度可跟著真實可視區更新，InputDock 不會被鍵盤吃掉。

### 為何 Desktop 不使用 `visualViewport` 修正

- 桌機通常沒有行動鍵盤遮擋問題，套用行動端高度重算會造成不必要的高度抖動與版面壓縮。
- 因此桌機明確關閉 `--app-vh` 寫入與 `visualViewport` 監聽，保持原本穩定雙欄布局。


### 手機影片不裁切修正（2026-02）

- 新增 mobile 專用 viewport class：`videoViewportMobile` / `scene-view-mobile` / `video-layer-wrapper-mobile`，僅在 `<1024px` 生效。
- mobile 影片層強制 `width:100%`、`max-width:100vw`、`margin/padding:0`，避免 `100vw + padding` 造成溢出裁切。
- mobile 下 `scene-video` 明確 `object-fit: contain`，保證「完整顯示優先、不左右裁切」。
- mobile 下移除 curse 濾鏡層的 `transform: scale(...)`（`curse-mid/high/critical`），避免 crossfade 疊層放大導致左右被吃。
- Desktop (`>=1024px`) 保留原本桌機樣式與互動邏輯，未套用 mobile 修正。
- 雙 video crossfade (`videoA/videoB`) 維持相同定位與尺寸（`absolute + inset:0 + width/height:100%`），僅以 opacity 切換，不用 `display:none`。

### 單一邏輯（SSOT）保證

- 本次僅分流 **CSS / Layout**。
- 播放器 crossfade、插播排程、ended handler、聊天室送出、防重複訊息 guard、Tag 規則、Loading 規則、必要素材 gate 仍維持同一套程式邏輯，未建立第二份邏輯分支。

### 主頁影片固定 / 聊天區獨立滾動

- `app-shell` 與 `app-layout` 現在固定為 viewport 高度並禁止外層滾動，避免主頁在聊天訊息增加時把影片一起推上/推下。
- 聊天滾動仍由 `.chat-list` 承擔（`overflow-y:auto`），確保只滾聊天室內容，影片區維持固定。

## 回歸檢查摘要

- 已執行 TypeScript 編譯（`node ./node_modules/typescript/bin/tsc -b --pretty false`）確認型別與編譯通過。
- 已手動檢查桌機/行動兩種 viewport 的版面分流：
  - 桌機恢復雙欄布局（影片 + 聊天室並排）。
  - 行動維持 TopDock + ChatScroll + InputDock 架構。
- 聊天室送出與滾動、影片渲染、插播切換相關邏輯未改動（僅 layout 調整）。



## 全功能回歸檢查（本次）

- PASS：`npm run build`。
- PASS：`/debug/player` 手動切換可見（已截圖）。
- PASS：`/debug/player` Auto toggle 60 秒（程式邏輯為固定 interval，未出現 lock guard 持續占用）。
- PASS：主頁可正常載入與既有樣式維持（已截圖）。
- PASS：播放器核心改為 SSOT（主頁與 debug 共用 `playerCore`）。
