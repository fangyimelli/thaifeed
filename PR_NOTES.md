# 修正：事件 registry / debug 面板 / 鬼聲腳步聲驗證鏈路

## 變更摘要
- 針對 `ghost_female`、`footsteps` 與 `VOICE_CONFIRM/GHOST_PING/NAME_CALL/VIEWER_SPIKE` 進行全專案盤點，確認事件仍在 registry，並補上可視化驗證。
- 整合事件效果來源：`eventEffectsRegistry` 改由 `eventRegistry` 推導，避免雙份配置分裂。
- 啟動時新增 console 記錄：`event.registry.count`、`eventIds`、`hasGhostFemale/hasFootsteps`。
- debug 面板新增「資源對照檢查」欄位：
  - 已載入 audio keys
  - event 引用 audio keys
  - missing diff（紅字 + source eventId）
  - AudioContext state（distance player）
- 新增兩個可重複測試按鈕：
  - `Test Ghost SFX`
  - `Test Footsteps SFX`
  並在 console 輸出 `[EVENT_TRIGGERED]` / `[EVENT_SKIPPED] reason=lock/cd/missing_asset`。

## 事件 key/註冊盤點（重點）
- `ghost_female`：
  - `src/core/events/eventRegistry.ts`（VOICE_CONFIRM/GHOST_PING/NAME_CALL 的 pre/post，FEAR_CHALLENGE post）
  - `src/audio/SfxRegistry.ts`
  - `src/app/App.tsx` 事件播放流程
- `footsteps`：
  - `src/core/events/eventRegistry.ts`（VIEWER_SPIKE pre/post，FEAR_CHALLENGE pre）
  - `src/audio/SfxRegistry.ts`
  - `src/app/App.tsx` 事件播放流程
- `VOICE_CONFIRM` / `GHOST_PING` / `NAME_CALL` / `VIEWER_SPIKE`：
  - 定義與 pre/post effect：`src/core/events/eventRegistry.ts`
  - 觸發與 commit：`src/app/App.tsx`
  - 對話：`src/core/events/eventDialogs.ts`
  - QNA 對應：`src/game/qna/qnaFlows.ts`

## 修改檔案
- `src/core/events/eventRegistry.ts`
- `src/events/eventEffectsRegistry.ts`
- `src/audio/distanceApproach.ts`
- `src/ui/scene/SceneView.tsx`
- `src/app/App.tsx`
- `README.md`
- `docs/10-change-log.md`
- `docs/02-ssot-map.md`
- `PR_NOTES.md`

## SSOT / debug 欄位變更紀錄
- SSOT：事件 effect 映射改為以 `src/core/events/eventRegistry.ts` 為唯一來源，`src/events/eventEffectsRegistry.ts` 只負責轉譯成執行時結構。
- debug 新增欄位：
  - `audio.loadedKeys`
  - `audio.context.state(distance)`
  - `event.referencedAudioKeys`
  - `event.missingAudioRefs`
- debug 新增按鈕：
  - `Test Ghost SFX`
  - `Test Footsteps SFX`

## 驗證重點
1. 啟動後 console 出現 `[EVENT_REGISTRY]`，可見 count、eventIds、`hasGhostFemale/hasFootsteps`。
2. Debug Panel 觀察 `event.registry.manifest` 與 `event.referencedAudioKeys`。
3. 按 `Test Ghost SFX` / `Test Footsteps SFX`：
   - 成功時印 `[EVENT_TRIGGERED] <eventId> <audioKey>`。
   - 阻擋時印 `[EVENT_SKIPPED] reason=lock/cd/missing_asset`。
