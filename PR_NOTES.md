# SFX 消失排查（footsteps / ghost_female）與 Debug 可觀測化

## Changed
- 新增 Debug Overlay「SFX Tests」區塊：
  - `Play footsteps`
  - `Play ghost_female`
  - `Stop all`
  - `Ignore pause`
  - `Ignore cooldown`
  - `Master` 音量滑桿（0~1）
- SFX 播放入口改為回傳可觀測 `PlayResult`（成功/失敗含 reason），不再 silent fail。
- 在播放管線加完整 trace 打點：
  - `play_called`
  - `asset_loaded`
  - `paused_gate`
  - `cooldown_gate`
  - `audio_locked`
  - `node_chain_ready`
  - `play_started`
  - `ended`
  - `error`
- 事件效果新增觀測：
  - `event.lastEvent.effects.plan`
  - `event.lastEvent.effects.applied`
- 距離接近模型（approach）加入保底參數：
  - `startGain >= 0.05`
  - `endGain <= 0.9`
  - `start/end LPF >= 200Hz`
  - `playbackRate 0.95~1.08`

## Root Cause
根因為**多重 gate 疊加且缺乏可觀測回傳**，導致 `footsteps/ghost_female` 在 pause/cooldown/audio lock 等情況下被擋下時看起來像「完全沒聲音」：
- 先前多處僅 `return false` 或 catch 後 warning，沒有統一 reason。
- 距離接近起始增益偏低時，若再疊加音量條件，容易主觀判定為沒播。

## Key / Asset / Manifest 對照表
| key | 檔名 | 路徑 | 載入方式 |
|---|---|---|---|
| footsteps | footsteps.wav | public/assets/sfx/footsteps.wav | `SFX_REGISTRY -> oldhousePlayback -> resolveAssetUrl -> fetch/decodeAudioData` |
| ghost_female | ghost_female.wav | public/assets/sfx/ghost_female.wav | `SFX_REGISTRY -> oldhousePlayback -> resolveAssetUrl -> fetch/decodeAudioData` |
| fan_loop | fan_loop.wav | public/assets/sfx/fan_loop.wav | `AudioEngine.startFanLoop`（WebAudio 主路徑） |

## Removed
- None

## SSOT files changed
- `src/audio/distanceApproach.ts`
  - Reason: SFX approach 播放與參數邏輯 SSOT。
- `src/ui/scene/SceneView.tsx`
  - Reason: Debug overlay / SFX 播放入口 / 觀測欄位 SSOT。
- `src/app/App.tsx`
  - Reason: Event effects plan/applied 追蹤 SSOT。

## Debug fields changed + 3-PR rule check
新增 debug 欄位：
- `audio.lastPlayResult`
- `audio.trace[]`
- `audio.lastApproach.currentGain`
- `event.lastEvent.effects.plan`
- `event.lastEvent.effects.applied`

3 次 PR 規則檢查：
1. 本 PR 已完整列出新增欄位。  
2. 本 PR 已接入 Debug overlay 可直接觀測。  
3. 後續至少連續 3 次 PR 保留並驗證，再討論是否下修。  

## Validation
- `npm run build` ✅
