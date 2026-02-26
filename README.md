# ThaiFeed（現況文件）

本文件依目前程式碼與資產狀態整理（Vite + React + TypeScript）。

## 專案定位

ThaiFeed 是一個**偽直播（Pseudo-live）**的互動 Demo，主題是**老屋沉浸式恐怖氛圍**，核心玩法是**泰文子音辨識（roguelike 式壓力循環）**：

- 玩家在聊天室輸入答案（泰文字母/拼音/注音 alias）
- 答對降低 CURSE，答錯提高 CURSE
- CURSE 會反向影響場景、聊天壓力、插播頻率與聲音事件

---

## 專案檔案樹（掃描結果）

> 已忽略 `node_modules`、`dist`、`build`、`.git`。

```text
.
├─ index.html
├─ netlify.toml
├─ package.json
├─ package-lock.json
├─ README.md
├─ scripts/
│  └─ netlify-build.mjs
├─ public/
│  └─ assets/
│     ├─ icons/
│     │  └─ icon_crown.svg
│     ├─ overlays/
│     │  ├─ overlay_crack_glass.png
│     │  ├─ overlay_noise_film.png
│     │  ├─ overlay_smoke_room.png
│     │  └─ overlay_vignette.png
│     ├─ scenes/
│     │  ├─ oldhouse_room_loop.mp4
│     │  ├─ oldhouse_room_loop2.mp4
│     │  └─ oldhouse_room_loop3.mp4
│     └─ sfx/
│        ├─ fan_loop.wav
│        ├─ footsteps.wav
│        └─ ghost_female.wav
├─ src/
│  ├─ main.tsx
│  ├─ styles.css
│  ├─ app/
│  │  └─ App.tsx
│  ├─ config/
│  │  ├─ assetManifest.ts
│  │  └─ oldhousePlayback.ts
│  ├─ core/
│  │  ├─ adaptive/
│  │  │  └─ memoryScheduler.ts
│  │  ├─ engine/
│  │  │  └─ eventBus.ts
│  │  ├─ state/
│  │  │  ├─ reducer.ts
│  │  │  └─ types.ts
│  │  └─ systems/
│  │     ├─ answerParser.ts
│  │     ├─ chatEngineV2.ts
│  │     ├─ chatSystem.ts
│  │     ├─ consonantSelector.ts
│  │     ├─ curseSystem.ts
│  │     ├─ fakeAIEngine.ts
│  │     ├─ mentionV2.ts
│  │     ├─ personaSystem.ts
│  │     ├─ playerSpeechParser.ts
│  │     └─ vipSystem.ts
│  ├─ content/
│  │  ├─ aliases/consonantAliases.json
│  │  ├─ fakeAI/replies.json
│  │  ├─ memory/thaiConsonantMemory.json
│  │  ├─ pools/
│  │  │  ├─ consonantAliasesCommon.json
│  │  │  ├─ consonantPoolCommon.json
│  │  │  ├─ donatePools.json
│  │  │  ├─ thaiChatPools.json
│  │  │  └─ usernames.json
│  │  └─ thaiConsonants.json
│  ├─ renderer/renderer-2d/Renderer2D.ts
│  ├─ ui/
│  │  ├─ chat/
│  │  │  ├─ ChatMessage.tsx
│  │  │  ├─ ChatPanel.tsx
│  │  │  └─ TranslationToggle.tsx
│  │  ├─ hud/
│  │  │  ├─ CurseMeter.tsx
│  │  │  ├─ LiveHeader.tsx
│  │  │  └─ LoadingOverlay.tsx
│  │  └─ scene/
│  │     └─ SceneView.tsx
│  └─ utils/
│     ├─ inputNormalize.ts
│     ├─ preload.ts
│     ├─ random.ts
│     └─ timing.ts
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

---

## 入口檔與核心模組定位

- 入口：`index.html`、`src/main.tsx`、`src/app/App.tsx`
- 場景播放（雙 video crossfade）：`src/ui/scene/SceneView.tsx`
- 播放策略/排程（loop3 主循環 + loop/loop2/loop4 插播）：
  - SSOT 設定：`src/config/oldhousePlayback.ts`
  - 執行邏輯：`src/ui/scene/SceneView.tsx`
- CURSE 狀態來源與更新：
  - State 定義：`src/core/state/types.ts`
  - 更新規則：`src/core/state/reducer.ts`
  - 視覺分級：`src/core/systems/curseSystem.ts`
- 聲音系統（fan / footsteps / ghost，必要素材 gate）：
  - 素材列表（required）：`src/config/assetManifest.ts`
  - 啟動前驗證（fail-fast gate）：`src/ui/scene/SceneView.tsx`
- 聊天室 / TagV2（tag 只允許 activeUsers）：
  - activeUsers 蒐集：`src/core/systems/mentionV2.ts` 的 `collectActiveUsers`
  - mention 白名單清洗：`sanitizeMentions` + `getActiveUserSet`
  - 套用點：`src/core/systems/chatSystem.ts`（finalizeMessageMentions）

---

## 目前已實作功能清單

### 1) 影片與場景
- 雙 `<video>` 層交替，使用 crossfade 方式切換。
- 主循環固定 `loop3`（`oldhouse_room_loop3.mp4`）。
- 插播從 `loop1 / loop2 / loop4` 隨機挑選，插播結束後回主循環。
- 依 CURSE 變化調整下次插播間隔（CURSE 越高越頻繁）。
- 疊加老屋氛圍 overlay（煙、裂痕、雜訊、暗角）。

### 2) CURSE 系統
- 初始值 20。
- 答對 -10（最低 0）；答錯 +10（最高 100）；長時間沒輸入會自動 +2。
- CURSE 影響：
  - 場景視覺特效（blur、noise、distortion class）
  - 場景插播頻率
  - 聊天壓力/節奏（觀眾發言間隔與事件機率）

### 3) 音效系統（必要素材）
- 啟動直播前先驗證必要音檔：`fan_loop.wav`、`footsteps.wav`、`ghost_female.wav`。
- 驗證失敗直接阻止進入播放狀態（fail fast）。
- 成功後：
  - fan 持續循環
  - footsteps / ghost 以 CURSE 相關間隔排程播放

### 4) 聊天室與 TagV2
- 自動觀眾訊息、加入/離開事件、fake AI 波次訊息。
- mention 只保留 activeUsers（白名單外會被清掉）。
- 禁止 @聊天室/@大家 等泛稱與管理詞。

### 5) 手機版 UI
- 直播區與聊天室為行動優先排版（`mobile-frame` + `chat-container` 佈局）。
- 有 Loading 狀態機 overlay、直播 header、可切換翻譯顯示。

---

## 影片資產與播放策略（含 CURSE 影響）

### 影片資產
- `/public/assets/scenes/oldhouse_room_loop.mp4`
- `/public/assets/scenes/oldhouse_room_loop2.mp4`
- `/public/assets/scenes/oldhouse_room_loop3.mp4`（主循環）
- `/public/assets/scenes/oldhouse_room_loop4.mp4`（插播，程式支援；目前 repo 未放檔）

### 播放策略
- 主循環：`MAIN_LOOP = oldhouse_room_loop3`
- 插播池：`JUMP_LOOPS = [loop1, loop2, loop4]`
- 插播排程：
  - 以 `computeJumpIntervalMs(curse)` 計算下一次插播時間
  - CURSE 越高，間隔越短
- 插播結束：回 `MAIN_LOOP`，並重設下一次插播 timer

---

## 音效必要素材與啟動 gate 行為

### 必要素材清單
- `/public/assets/sfx/fan_loop.wav`
- `/public/assets/sfx/footsteps.wav`
- `/public/assets/sfx/ghost_female.wav`

### 啟動 gate
- `SceneView` 在使用者按「是」開始播放後，先執行 `verifyRequiredAudioAssets()`。
- 任一必要音檔載入失敗/逾時：
  - 設定 `requiredAudioError`
  - 阻止 `hasConfirmedPlayback` 進入有效播放流程
  - 畫面顯示必要音效錯誤訊息

---

## 主要資料流與模組責任

1. `index.html` 載入 `src/main.tsx`
2. `main.tsx` 掛載 `App`
3. `App.tsx`
   - `preloadAssets(ASSET_MANIFEST)` 進行資產預載
   - 初始化 `Renderer2D`
   - 驅動聊天室輪詢、加入/離開事件、玩家輸入提交流
   - 維護全域遊戲 state（`gameReducer`）
4. `SceneView.tsx`
   - 管理雙 video 與 crossfade
   - 管理 loop3 主循環與插播排程
   - 管理必要音效 gate 與 fan/footsteps/ghost 播放
5. `chatSystem.ts` + `mentionV2.ts`
   - 產生聊天訊息
   - 套用 mention 安全規則（只允許 activeUsers）

---

## 本機啟動 / 建置 / 預覽

```bash
npm install
npm run dev
npm run build
npm run preview
```

- 開發伺服器：Vite（`npm run dev`）
- 生產建置：`tsc -b && vite build`

---

## 常見問題

1. **iOS 鍵盤造成畫面位移**
   - 目前專案沒有額外 keyboard viewport 修正邏輯，若遇到可優先以 CSS 與容器高度策略調整。

2. **Autoplay 有聲限制（瀏覽器政策）**
   - 瀏覽器可能阻擋未經使用者手勢的有聲播放。
   - 專案已在 `SceneView` 透過點擊嘗試解鎖播放；若仍阻擋，需再次互動。

3. **快取導致舊素材**
   - 建議 hard refresh（Chrome: `Cmd/Ctrl + Shift + R`）或清除站點快取。

4. **loop4 或必要影片缺檔**
   - 目前為必要素材 gate，缺失時會進入 ERROR 狀態並列出缺檔 URL，不會進入 RUNNING。

---

## 環境變數與設定檔

目前沒有 `.env` 檔與自訂 runtime env。

主要設定檔：
- `vite.config.ts`
- `netlify.toml`（Netlify build command / publish path / Node 版本）

---

## 本次整合（移除舊邏輯，建立 SSOT）

- 已將老屋播放策略常數（loop key、主循環、插播池、路徑、必要音效）收斂到 `src/config/oldhousePlayback.ts`。
- `SceneView` 與 `assetManifest` 共同引用該設定，避免舊常數與新常數並存。
- 已移除舊版聊天室打字/送出/對錯音效流程，保留目前實際在場景中使用的必要音效系統。


## Loading 狀態機（Core Canon）

### 狀態定義（SSOT）
- `BOOT_START`：啟動畫面框架。
- `ASSETS_CHECKING`：預載必要素材（影片、必要音效、必要圖層）。
- `ASSETS_READY`：素材已可用，等待場景完成啟播前最後階段。
- `NEED_USER_GESTURE`：瀏覽器阻擋有聲 autoplay，提示使用者點一下畫面。
- `RUNNING`：直播正式開始。
- `ERROR`：初始化失敗，不進入 RUNNING。

### 規則
- 任一狀態都會顯示可見 UI，不會黑畫面。
- Loading 提示為直播口吻，且不含 emoji。
- 狀態提示顯示於專用 loading 區塊，不會把系統提示直接畫在影片內容上。
- 進入 `RUNNING` 後，聊天室會送出訊息：`初始化完成`。

### 必要素材缺失（fail fast but visible）
- fail fast 的意義是「不進入 `RUNNING`」，不是整個畫面中止。
- 進入 `ERROR` 時會顯示：
  - 錯誤摘要
  - 缺失資產清單（檔名 + URL）
  - 重試指示（重新整理或補齊檔案）
- `console.error` 會同步列出缺檔資訊。

### autoplay 解鎖流程
- 有聲播放維持 `muted=false`、`volume>0`。
- 若播放被政策阻擋，進入 `NEED_USER_GESTURE`。
- 使用者點擊畫面後再次嘗試播放，成功才轉入 `RUNNING`。
- 不使用靜音 fallback 來繞過限制。

### 影片 preload timeout 與 fallback
- 影片 preload 設有 timeout（3200ms）。
- timeout 時先檢查 `readyState >= HAVE_CURRENT_DATA`：
  - 成立：允許繼續。
  - 不成立：進入 `ERROR`，顯示「影片載入失敗」與對應 URL。
