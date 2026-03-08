
## 2026-03-07（audit only）SSOT 判讀補充：有效題目狀態

- sandbox 有效作答 target 的 SSOT 以 `sandboxStoryMode.state.prompt.current`（含 `promptId/kind`）為主。
- `consonant.promptText` / `consonant.promptCurrent` 屬文案/顯示輔助狀態，不可單獨作為「正在等待作答」判斷。
- 是否進入判題應同時看：
  1. `flow.step ∈ WAIT_REPLY_1/2/3`
  2. `prompt.current.kind === 'consonant'`
  3. `answerGate.waiting === true`

# 02｜SSOT Map（唯一真相索引）

## 這份文件在管什麼

列出 ThaiFeed 各子系統的唯一真相檔案與職責，避免「同功能多份配置」。

## SSOT 索引表

| 範疇 | SSOT 檔案 | 職責 |
|---|---|---|
| 播放器核心 | `src/core/player/playerCore.ts` | `init/switchTo/crossfade/enforceAudio/stop`，確保 active video 音訊規則 |
| 播放策略 | `src/config/oldhousePlayback.ts` | `MAIN_LOOP`、`JUMP_LOOPS`、key→url 映射、插播候選來源 |
| 事件註冊 | `src/director/EventRegistry.ts` | 所有事件 `EventSpec` 定義 |
| 事件執行 | `src/director/EventEngine.ts` | 依 registry 執行，輸出事件 payload，不直接發言 |
| 聊天行文資源 | `src/chat/LineRegistry.ts` | line key 對應文案與變體 |
| 聊天類型 | `src/chat/ChatTypes.ts` | type metadata（語言、規則、分類） |
| 聊天挑選/規則 | `src/chat/ChatSelector.ts`、`src/chat/ChatRules.ts` | 類型權重、tag 限制、節奏相關規則 |
| SFX 註冊 | `src/audio/SfxRegistry.ts` | 音效 key 與資源映射、可播放鍵值 |
| 音訊引擎 | `src/audio/AudioEngine.ts` | fan_loop WebAudio 排程、SFX 播放流程 |
| 素材路徑與 base path | `src/config/assetUrls.ts`、`src/config/assetManifest.ts` | `assets/...` 相對路徑與 base URL 解析 |
| Mode Router（classic/sandbox_story） | `src/app/App.tsx` | 以 `?mode=` 為主、debug-only 可讀 `localStorage['app.currentMode']` 的單一路徑 mode 決策 |
| 主頁整合入口 | `src/app/App.tsx`、`src/ui/scene/SceneView.tsx` | 系統初始化、畫面組裝、debug overlay |
| Sandbox chat 語料池 | `src/sandbox/chat/chat_pools.ts` | `CHAT_POOLS` 10 池（2050 entries）與 Thai viewer 結構化欄位唯一來源 |
| Sandbox chat 路由引擎 | `src/sandbox/chat/chat_engine.ts` | phase/SAN 驅動池路由、emit 節流、Thai/VIP 訊息輸出 |
| Sandbox story flow gate | `src/modes/sandbox_story/sandboxStoryMode.ts` | `flow.questionIndex+step`、`introGate/preheat/answerGate/last` 單一路徑推進與去重 |

## Base path 規範

- 素材路徑一律存放為 `assets/...`。
- URL 組合必須透過統一 helper（例如 `ASSET_BASE_URL` + `joinUrl`）。
- 不可在功能碼中直接寫死 `/assets/...`。

## 當你準備改程式時

1. 先查此頁，確認你要改的功能 SSOT 是哪個檔案。
2. 若發現同職責散落多檔，先做收斂再加功能。
3. 改完後同步更新：
   - 對應 docs 分頁
   - README 索引
   - `docs/10-change-log.md`

## 2026-03-02 補充（events/audio）

- 事件定義 SSOT：`src/core/events/eventRegistry.ts`（event key、cooldown、pre/post effect）。
- 事件效果執行映射：`src/events/eventEffectsRegistry.ts`（由 eventRegistry 推導，不可手動維護第二份真值）。
- 音效資源 SSOT：`src/audio/SfxRegistry.ts`。
- Debug 資源對照來源：`src/ui/scene/SceneView.tsx`（loaded audio keys vs event referenced keys vs missing diff）。

## 2026-03-04（sandbox input + prompt glyph）SSOT 補充

- sandbox 子音題輸入 normalize / parser SSOT：`src/modes/sandbox_story/classicConsonantAdapter.ts`
  - `normalizeSandboxConsonantInput()`
  - `tryParseClassicConsonantAnswer()`
  - `judgeClassicConsonantAnswer()`
- sandbox 子音題 parse/debug state SSOT：`src/modes/sandbox_story/sandboxStoryMode.ts` 的 `state.consonant.parse`。
- sandbox prompt glyph 顏色 token 與 scope SSOT：`src/styles.css` 的 `.video-area.sandbox-story-mode .sandbox-story-prompt-glyph`。


## 2026-03-08（sandbox warmup gate SSOT 補充）

- warmup gate prompt SSOT：`src/app/App.tsx -> askSandboxWarmupTagNow()`（唯一允許發出 `@<player> 嗨嗨，第一次看這台嗎？` 的入口）。
- PREHEAT direct mention SSOT：`src/sandbox/chat/chat_director.ts`（僅 casual direct mention，不承載可 consume gate）。
- warmup consume SSOT：`src/app/App.tsx -> consumePlayerReply()` 在 `flow.step==='WARMUP_TAG_REPLY'` 時的 strip mention + 非空 consume 規則。
