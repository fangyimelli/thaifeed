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
| 主頁整合入口 | `src/app/App.tsx`、`src/ui/scene/SceneView.tsx` | 系統初始化、畫面組裝、debug overlay |

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
