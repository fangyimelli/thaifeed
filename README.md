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
