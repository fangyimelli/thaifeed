# 04｜Audio System（音訊系統）

## 這份文件在管什麼

環境音（fan_loop）、事件音效（SFX）與音訊可觀測欄位的維護規範。

## SSOT

- 音訊引擎：`src/audio/AudioEngine.ts`
- 音效註冊：`src/audio/SfxRegistry.ts`

## fan_loop：WebAudio 排程

- fan_loop 以 WebAudio 作為主路徑，不依賴 `HTMLAudioElement.loop`。
- 使用提前排程 + crossfade（xfade）避免循環接縫。
- 切換影片不得重建 fan loop 播放器。

## SFX Registry 規則

- 所有可播放音效都必須先註冊在 `SFX_REGISTRY`。
- 禁止在業務邏輯中以裸字串硬呼叫未知 sfx key。
- `footsteps` / `ghost_female` 採事件觸發，不走固定頻率輪播。

## 互斥 / 冷卻

- 同類型驚嚇音效需有冷卻，避免短時間重疊洗版。
- 事件層提出播放請求，最終由 AudioEngine 套用冷卻與播放裁決。
- 若被冷卻擋下，需可在 debug 資訊看到原因。

## Debug 必看欄位

- `audioContext.state`
- `fan playing/currentTime`
- `fan nextStartTime/xfade/scheduled`
- `fan bufferDuration`
- `event.sfx` / `event.sfxCooldowns`

## 驗收清單

1. fan_loop 長時間播放無明顯斷點。
2. 切換 loop/loop2/loop3 不會讓 fan 重啟。
3. 被冷卻擋下的 SFX 可追蹤原因。
4. active/inactive video 音訊規則與 player 一致。

## 相關文件

- [03 Player System](./03-player-system.md)
- [06 Event System](./06-event-system.md)
- [07 Debug System](./07-debug-system.md)
- [09 Troubleshooting](./09-troubleshooting.md)
