# ThaiFeed - Vite + React + TypeScript Demo

單一房間 Demo（可擴充 Roguelike 結構）

## 安裝與啟動

```bash
npm install
npm run dev
```

## 素材放置路徑
請把素材放到 `public/assets`：

- `public/assets/scenes/oldhouse_room_loop.mp4`
- `public/assets/overlays/overlay_smoke_room.png`
- `public/assets/overlays/overlay_crack_glass.png`
- `public/assets/overlays/overlay_noise_film.png`
- `public/assets/overlays/overlay_vignette.png`
- `public/assets/icons/icon_crown.svg`
- `public/assets/sfx/sfx_typing.wav`
- `public/assets/sfx/sfx_send.wav`
- `public/assets/sfx/sfx_success.wav`
- `public/assets/sfx/sfx_error.wav`
- `public/assets/sfx/sfx_glitch.wav`
- (optional) `public/assets/sfx/sfx_ambient_low.wav`

## 如何新增子音 aliases
編輯 `src/content/aliases/consonantAliases.json`。

格式範例：

```json
"ผ": ["ผ", "ph", "ㄆ"]
```

`answerParser.ts` 會把輸入轉小寫後，比對該子音 aliases。

## 如何新增聊天池訊息
編輯 `src/content/pools/thaiChatPools.json`，分成：

- `low` (0-30)
- `mid` (31-60)
- `high` (61-100)

每則訊息都要有 `th` / `zh`：

```json
{ "th": "...", "zh": "..." }
```

## Demo 操作方式
- 房型：IDENTIFY
- 目標子音：`ผ`
- 在右側輸入框輸入任一答案：
  - `ผ`
  - `ph`
  - `ㄆ`

答對：curse -10（最小 0）、聊天室成功訊息、必出 DonateToast、success 音效。

答錯：curse +10（最大 100）、聊天室依 curse 分級訊息、連錯 3 次會觸發一次 `_still_here` VIP 訊息、error 音效。

## 新增：畫面提示與 AI VIP 回覆
- SceneView 會閃爍顯示題目子音（提示玩家看見的字）。
- 聊天室視窗高度固定，避免訊息區域跳動。
- VIP 改成內建免費規則式小 AI（不需外部 API）：
  - 可依玩家輸入語言（泰文/拼音/注音）做鏡像回覆
  - `_still_here` 連錯觸發時會用 AI 句型回覆

## 黑畫面排查

若出現全黑畫面，請依序檢查：

1. **JS runtime error 導致未 render**
   - 左上角開發用 debug badge 會顯示 `BOOT OK` 或 `BOOT FAIL`。
   - `BOOT FAIL` 時請先看 Console 的 `window.onerror` / `unhandledrejection` / `[boot] react render error` 訊息。
2. **CSS 或版面遮蔽**
   - 確認 `.loading-overlay` 是否一直存在。
   - 檢查 `#root`、`.app-shell`、`.video-container` 是否有高度（`100dvh/100svh`、`aspect-ratio`）。
3. **影片資源載入失敗**
   - 到 Network 看 `public/assets/scenes/*.mp4` 是否 404。
   - preload 已加入 timeout 與 `readyState >= HAVE_CURRENT_DATA` fallback，避免 `canplaythrough` 長時間 pending。
4. **必要音效 gate 失敗**
   - 必要素材缺失時，畫面會顯示錯誤 UI（缺檔清單 + 路徑），並提示重新整理重試。
   - Console 會印出 `[asset-required]`、`[audio-required]` 詳細資訊與 URL。

### 錯誤 UI 說明

- 初始化失敗不再呈現全黑：
  - 會顯示 loading/error overlay（缺檔清單）。
  - 保留 live header、video 區、chat 區的 placeholder，方便定位問題。
- 初始化成功後，聊天室會出現「系統初始化完成」。
