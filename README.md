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


## 音效：無縫循環（fan_loop）

`fan_loop.wav` 已改為 **Web Audio SSOT（`src/audio/AudioEngine.ts`）**，不再依賴 `HTMLAudioElement.loop` 作為主播放路徑。

### 為何 HTMLAudio loop 容易出現斷點

- `audio.loop=true` 在不同瀏覽器可能受解碼邊界、裝置省電策略、媒體管線切換影響，循環邊界容易出現 click/gap。
- 若在場景切換時 `pause()/play()` 或重設 `currentTime/src`，會放大邊界不連續問題。
- 長時間播放（環境音）對邊界更敏感，需避免「單段播完再重播」模型。

### WebAudio 交疊循環做法

- 單例 `AudioEngine`：只建立一次 `AudioContext`（lazy init），`fetch + decodeAudioData` 後快取 `AudioBuffer`。
- `fan_loop` 改為「提前排程」模型，不使用 `onended`：
  - `nextStartTime` 初始為 `audioContext.currentTime`。
  - 每次建立新的 `AudioBufferSourceNode + GainNode`，並直接排入時間軸。
  - 下一段開始時間固定為 `endTime - xfade`（目前 `xfade=2s`）。
  - 使用 `setTimeout(duration - xfade - 1s)` 提前排下一段，避免等待尾端才觸發。
- fade 參數：淡入 `0.3s`、淡出 `2s`，以降低邊界可聽縫隙。
- `fan_loop` 與影片切換解耦：切換 loop/loop2/loop3 不會重建 fan source，也不會重新 decode。

### iOS / visibility 注意事項

- 監聽 `visibilitychange`：回到 visible 時會嘗試 `resume()` 並檢查 fan 狀態，必要時重啟排程。
- 監聽使用者互動（pointer/touch）以處理 iOS/Safari suspend 後恢復。
- 若 WebAudio 不可用，才退回單例 `<audio loop preload="auto">`，且不在切片時重設 src/pause/play。

### debug=1 如何確認 fan loop 狀態

在右上角 Debug ON 後，可於 overlay 看到：

- `audioContext.state`
- `fan playing/currentTime`
- `fan nextStartTime/xfade/currentTime/scheduled`
- `fan bufferDuration`
- `fan lastRestartReason/mode`

若上述欄位持續更新且 `fan playing=true`，代表 fan loop 排程持續運作。

## 自動插播排程可靠性（timer + watchdog）

- 播放策略 SSOT（`src/config/oldhousePlayback.ts`）：
  - `MAIN_LOOP = oldhouse_room_loop3`（主畫面常駐）
  - `JUMP_LOOPS = [oldhouse_room_loop, oldhouse_room_loop2]`（插播僅兩支，暫停 loop4）
- 插播間隔（`computeJumpIntervalMs(curse)`）：
  - `debug=1`：固定 `10,000 ~ 15,000 ms`（驗收快速回歸用）
  - 正式模式：
  - `CURSE=0`：`90,000 ~ 120,000 ms`（1.5~2 分鐘）
  - `CURSE=100`：`30,000 ~ 60,000 ms`
  - 下限保護：不會低於 `30,000 ms`（30 秒）
- 插播影片播放到自然 `ended` 後回 `MAIN_LOOP`，並立刻重排下一次插播。
- `plannedJump` 為排程 SSOT：`dueAt/key/url/scheduledAt/timerId/lastTimerFiredAt/lastWatchdogFiredAt/lastExecReason/lastExecResult`。
- `scheduleNextJump()` 每次都先清掉舊 timer 再重排，避免 timer 被覆寫或遺失。
- `execPlannedJump(reason)` 是唯一執行入口（`timer | watchdog | force`），禁止重 pick。
- timer callback 一定寫入 `lastTimerFiredAt`；若 guard 擋住，寫 `skipped_guard` 並 500ms 後重試（同時 watchdog 也會補觸發）。
- watchdog：每秒檢查 `now >= dueAt` 未執行則補跑 `execPlannedJump('watchdog')`，避免瀏覽器節流造成漏跳。
- 監聽 `visibilitychange`：頁面回到 visible 時若已過 due，立即以 watchdog 補執行。
- `switchTo()` 使用 `try/finally` 強制釋放 `isSwitching` lock，任何失敗都不會卡死。
- `preloadIntoBuffer()` 有 timeout fallback：
  - 3.2 秒內若 `readyState >= HAVE_CURRENT_DATA` 視為可播。
  - 超時且仍不可播則進 ERROR UI（不黑畫面，保留錯誤資訊）。
- 插播影片若 `ended` 未回主循環，另有 fallback timer（至少 45 秒，且會參考素材時長再延長）強制切回 `MAIN_LOOP` 並重排下一次插播。

## 插播選片與除錯（`?debug=1`）

- SSOT 清單位置：`src/config/oldhousePlayback.ts`
  - `MAIN_LOOP = oldhouse_room_loop3`
  - `JUMP_LOOPS = [oldhouse_room_loop, oldhouse_room_loop2]`
  - `VIDEO_PATH_BY_KEY` 為 key->url 唯一 mapping。
- 選片規則：`src/ui/scene/SceneView.tsx` 的 `pickNextJumpKey()`
  - 僅從 `JUMP_LOOPS` 可用候選中抽選。
  - 硬規則：插播不得選到 `MAIN_LOOP`，若抽到會最多重抽 10 次。
  - 若候選清單為空或重抽仍等於 MAIN，會回報 error（不 silent fallback）。
  - Console 會輸出 `[JUMP_PICK] { candidates, pickedKey, reason, curse, intervalMs }`。
- `debug=1` overlay 觀察欄位：
  - `now / dueAt / diffMs`（`nextJumpDueIn` 唯一由 `dueAt-now` 計算）
  - `plannedJump key/url/scheduledAt/timerId`
  - `lastTimerFiredAt/lastWatchdogFiredAt`
  - `lastExec reason/result/at`、`executedAt/executedForDueAt`
  - `why not jumped?`（missing planned / guard locked / timer never fired / executed already / last error）
  - `unavailableJumps`（被 gate 的 key 與原因）
  - `lastFallback`（from/to/reason，包含 timeout 或 switch 失敗）
  - `sceneMapDigest`（loop / loop2 / loop3 對應 URL 摘要）
- 常見「永遠 loop3」原因：
  - 候選清單空（JUMPS 全被 gate 掉）
  - key->url mapping 錯誤（撞到 loop3 URL 或空字串）
  - preload/switch 失敗後 fallback 但先前沒有可視化
  - 目前已改為在 debug overlay 顯示 fallback 與 unavailable 原因，避免無聲退回。


## Debug 測試控制面板（`?debug=1`）

- 使用方式：
  - 進入主頁後開啟 `?debug=1`（或按右上角 `Debug ON`），畫面下方 debug overlay 會顯示測試控制按鈕。
  - 此控制面板僅在 `debug=1` render，正式模式不會顯示。
- 按鈕用途：
  - `▶ Force LOOP`：直接呼叫 `switchTo('oldhouse_room_loop')`。
  - `▶ Force LOOP2`：直接呼叫 `switchTo('oldhouse_room_loop2')`。
  - `▶ Force MAIN`：直接呼叫 `switchTo('oldhouse_room_loop3')`。
  - `⚡ Force Planned Jump Now`：直接執行目前已排程的 `plannedJump`（不重 pick、不重排 schedule）。
  - `🔁 Reschedule Jump`：重新呼叫 `scheduleNextJump()`，重新計算 `dueAt` 與 `plannedJump`。
- 用於排查插播不切換：
  - 若 `Force LOOP` 可切成功但自動插播不會切，表示排程 / planned jump 還有問題。
  - 若 `Force LOOP` 都無法切換，表示 `switchTo` 或 buffer 覆寫仍有衝突。
  - 看 `Why not jumped?` 可直接判斷卡在 timer/guard/missing planned/已執行/執行錯誤。
  - 每次點按都會輸出 `console.log('[DEBUG_FORCE]', { action, currentKey, plannedKey, bufferBefore, bufferAfter })`，可快速對照切換前後狀態。

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

## Mobile Layout：打字時保留影片畫面 + 輸入列即時出現

- 手機版改為三段式 layout（header / video / chat）：
  - `@media (max-width: 1023px)` 下使用 grid，保留影片最小高度 `max(30vh, 180px)`，避免鍵盤打開時影片整塊被推離畫面。
  - 桌機維持原本 grid（`header/video + chat` 雙欄）不套用 mobile 高度修正。
- 輸入列改為「永遠 render」：
  - 初始化未完成時仍顯示輸入框，僅禁用送出按鈕並顯示 `初始化中…`。
  - loading 訊息改放在聊天室訊息區（`chat-loading-banner`），不再阻擋輸入列出現。
- 動態 viewport 高度（mobile-only）：
  - 透過 `visualViewport.height`（fallback `window.innerHeight`）寫入 CSS 變數 `--vvh`。
  - `.app-shell` 使用 `height: var(--vvh, 100dvh)`，降低 iOS/Android 鍵盤與網址列高度跳動造成黑區。
- chat 不遮最後一行訊息：
  - 使用 `ResizeObserver` 量測 chat input 實際高度。
  - 動態套用 chat scroll `padding-bottom = inputHeight + 8px`，確保 sticky input 不蓋住最新訊息。
- 鍵盤關閉後維持既有行為：
  - 送出後會 blur input（手機）並補一次捲到底，避免鍵盤收起時視圖跳動後落點錯誤。

### debug=1 驗證方式（mobile）

- 進入 `?debug=1`，可在主畫面看到 mobile layout debug 資訊：
  - `visualViewport.height`
  - `window.innerHeight`
  - `container height`
  - `video/chat/header/input` 高度
  - `keyboard open` 判定（`innerHeight - visualViewport.height > 120`）
- 驗收重點：
  - 首次載入就可見輸入框（即使仍在初始化）。
  - 鍵盤打開時影片仍保有可見高度。
  - 送出後可自動收鍵盤並維持聊天室在底部。
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
  - 不做 mobile 專用高度變數重算，桌機維持原始雙欄與滾動行為。
- **MobileLayout（<1024px）**
  - 維持三區塊：`TopDock`（頂部固定）/ `ChatScroll`（可捲動）/ `InputDock`（底部固定）。
  - 啟用 `100dvh` + `visualViewport.resize` 捲底修正，確保鍵盤彈出時 header 與聊天輸入區不消失。
  - `html/body/#root/.app-shell` 在 mobile 下固定為 viewport 高度並禁止整頁滾動，避免鍵盤導致整頁亂跳。

### 為何 Desktop 不做行動端鍵盤補償

- 桌機通常沒有行動鍵盤遮擋問題，套用行動端補償會造成不必要的高度抖動與版面壓縮。
- 因此桌機維持穩定雙欄布局，不加 mobile 專用鍵盤捲底策略。


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


## Mobile layout 設計規則

- 避免 `100vh`：行動瀏覽器在鍵盤彈出時，`100vh` 常包含或錯算 URL bar / 系統 UI，容易造成黑畫面、header 被推離視窗、聊天室高度崩潰。
- 改用 `100dvh`：所有主佈局高度改為 `height: 100dvh`（必要 fallback 時採 `height: 100vh; height: 100dvh;`，並確保 `100dvh` 在最後）。
- 採用 flex column 三區塊：`app-root` 內固定 `Header`、`VideoArea`，並讓 `ChatArea` 以 `flex:1` 佔剩餘空間；訊息列表使用獨立捲動容器，禁止 body scroll。
- `visualViewport` 修正：送出後先 `after-append` 捲底，再於手機 `closeKeyboard()`（`blur + focus sink`），最後在 `250ms` 與 `visualViewport.resize`（500ms 內）補捲到底，避免黑區與焦點殘留位移。

## 回歸檢查摘要

- 已執行 TypeScript 編譯（`node ./node_modules/typescript/bin/tsc -b --pretty false`）確認型別與編譯通過。
- 已手動檢查桌機/行動兩種 viewport 的版面分流：
  - 桌機恢復雙欄布局（影片 + 聊天室並排）。
  - 行動維持 TopDock + ChatScroll + InputDock 架構。
- 聊天室送出與滾動、影片渲染、插播切換相關邏輯未改動（僅 layout 調整）。



## 全功能回歸檢查（本次）

- PASS：`scripts/netlify-build.mjs` 新增 rollup optional dependency 自動修復（偵測缺少 `@rollup/rollup-*` 時先 `npm install` 再重試 `vite build`）。
- PASS：`main.tsx` debug route 判斷改為先計算 `shouldRenderDebugPlayer`，避免 CI/Deploy 出現 `TS6133 isDebugPlayerRoute declared but never read`。
- PASS：`npm run build`。
- PASS：`/debug/player` 手動切換可見（已截圖）。
- PASS：`/debug/player` Auto toggle 60 秒（程式邏輯為固定 interval，未出現 lock guard 持續占用）。
- PASS：主頁可正常載入與既有樣式維持（已截圖）。
- PASS：播放器核心改為 SSOT（主頁與 debug 共用 `playerCore`）。

## Mobile：送出後自動收鍵盤

### 原因

手機送出訊息後，虛擬鍵盤會造成 `visualViewport` 高度瞬間變化；若此時聊天室捲動沒有在正確時機補償，容易出現黑區、捲動錯亂或 header 視覺消失。

### 解法（SSOT）

- 裝置判斷統一使用 `src/utils/isMobile.ts` 的 `isMobileDevice()`（`pointer: coarse` + `userAgent` 保守判斷）。
- 聊天室送出成功後，固定流程：
  1. `requestAnimationFrame` 先做一次 `scrollChatToBottom('after-append')`
  2. 僅手機執行 `closeKeyboard()`：先 `input.blur()`，若 focus 還在 input，再走 hidden focus sink 的 `focus -> blur`
  3. `250ms` 後補一次 `scrollChatToBottom('after-closeKeyboard')`
  4. 在 `closeKeyboard` 後 500ms 內，若收到 `visualViewport.resize`，再補一次捲底
- 嚴禁在聊天室送出流程使用 `window.scrollTo` 假裝收鍵盤。

### `debug=1` 如何確認

開啟 `?debug=1` 後，送出訊息會在 Console 印出 `[CHAT_DEBUG]`，包含：

- `activeElement`（tagName/className）
- `isMobile`
- `chatScroll`（`scrollTop/scrollHeight/clientHeight`）
- `visualViewportHeight`

可用來確認：

1. blur 後 activeElement 是否已離開 input
2. 送出後是否有執行捲底補償
3. keyboard 收合造成 viewport 變化時，聊天室是否仍維持在底部

## Chat System v2：類型驅動

### 類型列表與用途
- `SYSTEM_PROMPT`：系統引導與節奏提醒
- `FEAR_SELF_DOUBT`：自我懷疑、心理壓力
- `DREAD_BUILDUP`：平靜中的不安鋪陳
- `SOCIAL_REPLY`：聊天室互動與 tag 回覆
- `UI_STATUS`：系統狀態提示
- `IDLE_BORING`：loop3 期間「沒事發生但越看越毛」
- `SCENE_FLICKER_REACT`：loop/loop2/loop4 的燈閃反應
- `SFX_REACT_FAN` / `SFX_REACT_FOOTSTEPS` / `SFX_REACT_GHOST`：音效事件反應

### 規則
- 文字正規化：移除全形句點、壓縮空白、修正語助詞前空白
- 禁止工程口吻/戲劇台詞：命中 deny pattern 直接丟棄重抽
- 不混中泰：語言依 type metadata 決定，整句單語
- 去重：全域 recent hash + persona 專屬 recent hash
- 20 人格：每個人格獨立句池，不共用模板，近期視窗不可重複
- Tag 規則：
  - 僅能 tag active users
  - active users < 3 禁止 tag
  - 禁止 tag `VIP/system/you/fake_ai/mod_live/chat_mod`
  - 若模板含 `@{tag}` 但無合法 target，自動降級為不 tag 版本
- 翻譯按鈕：僅 `language === 'th'` 會顯示

### 事件與觸發
- `IDLE_TICK`：自然聊天節奏
- `SCENE_SWITCH(toKey)`：切到 loop/loop2/loop4 後 5 秒進入 reaction window
- `SFX_START(sfxKey)`：音效開始後 2 秒進入 reaction window
- `USER_SENT`：玩家送出訊息觸發社交回應/壓力回應
- `CURSE_CHANGE`：調整 reaction window 密度（高 curse 提高句數、縮短間隔）

### 如何新增新類型
1. 在 `src/chat/ChatTypes.ts` 新增 enum 與 metadata
2. 在 `src/chat/ChatPools.ts` 補人格句池與 fallback 池
3. 在 `src/chat/ChatSelector.ts` 增加事件分支/權重
4. `ChatEngine` 不需改介面，直接吃新 type metadata

### debug=1 驗證
- 右上角開啟 debug 後，可在 overlay 看到：
  - `chat.lastEvent`
  - `chat.lastPickedType`
  - `chat.persona/tag`
  - `chat.reactionWindow`
  - `chat.activeUsers`
  - `chat.recentDedupHashes`

## Event Registry（資料驅動 SSOT）

- 單一來源：`src/director/EventRegistry.ts`。
- 新增/刪除事件原則：
  1. 只在 `EVENT_REGISTRY` 新增或刪除 `EventSpec`。
  2. 事件對應台詞只在 `src/chat/LineRegistry.ts` 新增或刪除同名 `lineKey`。
  3. 若事件要播放音效，僅引用 `src/audio/SfxRegistry.ts` 內註冊 `key`。
- 事件引擎 `src/director/EventEngine.ts` 只讀 registry 執行，不再散落 if/else 大樹。

## SFX Registry（資料驅動 SSOT）

- 單一來源：`src/audio/SfxRegistry.ts`。
- 新增/刪除音效：僅修改 `SFX_REGISTRY`。
- `playSfx` 僅接受已註冊 `SfxKey`（避免硬編字串與拼字錯誤）。
- `fan_loop` 保持常駐；`footsteps` / `ghost_female` 已移除固定頻率排程，改由事件驅動 request 觸發。

## 去重/語氣輪替規則

- 單一來源：`src/chat/LineRegistry.ts` + `src/director/EventEngine.ts`。
- 每個 `LineKey` 皆提供至少 12 個 `LineVariant`。
- 引擎去重與輪替規則：
  - `variantId`：最近 M（目前 6）次不重複。
  - `tone`：最近 2 次不重複。
  - `persona`：最近 N（目前 6）句不重複。
- 事件新增/刪除時，不需改引擎邏輯。

## Lock 事件化流程

- 任一 tag 行為可觸發 `LOCK_START`。
- `LOCK_START` 透過 `followUps` 自動排程：
  - `LOCK_REMIND_20S`
  - `LOCK_REMIND_40S`
  - `LOCK_ESCALATE_60S`
- 所有 lock 句子都由 `LineRegistry` 變體提供。
- Lock 狀態、目標、經過時間、聊天室速度倍率在 debug 狀態中可見。

## debug=1 驗證資料驅動事件/音效

- 主畫面開 `?debug=1` 後，overlay 可檢查：
  - `event.lastEvent/reason`
  - `event.line/variant/tone/persona`
  - `event.sfx/reason`
  - `event.sfxCooldowns`
  - `event.lock`
  - `event.queue/blocked`
- 事件若要求切 scene，會透過 request 流程給 Scene 層處理，不在事件中直接硬切。

## 修正：聊天室顯示帳號來源（viewer -> 真實用戶）

- `EventEngine` 現在不再把所有觀眾事件固定顯示為 `viewer`。
- 規則：
  1. 若 `actor='viewer'` 且 `LineVariant.persona` 可對應 `PERSONA_USERS`，使用對應帳號。
  2. 若 persona 無對應，fallback 為 `usernames.json` 隨機帳號。
  3. `user/ghost/system` 仍維持既定固定發言者名稱。
- 這樣可恢復原本聊天室「看起來是不同觀眾在說話」的行為。
