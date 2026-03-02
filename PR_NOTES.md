# Event-driven distance SFX + blackout flicker integration

## Changed
- Audio pipeline (`footsteps` / `ghost_female`) upgraded to WebAudio distance-approach playback via new module `src/audio/distanceApproach.ts`:
  - node chain per play: `BufferSource -> Gain -> Lowpass -> StereoPanner -> masterGain`
  - automation: gain / LPF / pan / playbackRate ramp for far-to-near feel
  - randomization: `startPan` in `[-0.35, 0.35]`, duration `±15%`, end pan converges toward center
  - limiter guard: `endGain <= 0.9`
- Event flow now couples SFX success with blackout scheduling:
  - only when event成立且 SFX 實際播放成功才會啟動
  - `delay=1000ms`, `duration=12000ms`, mode random(`full`/`dim75`)
  - flicker with seeded jitter + pulse at `4000ms` for `180ms`
- Pause/freeze integration:
  - `chat.pause.isPaused=true` blocks new SFX + blackout
  - if pause enters during blackout, blackout is immediately stopped
- Scene overlay integration:
  - added `#blackoutOverlay` on video layer top without changing video aspect ratio
  - opacity controlled by blackout SSOT state + rAF flicker loop

## Removed
- Removed legacy `<audio>` element playback path for one-shot scare SFX (`footsteps` / `ghost_female`) inside `SceneView`; these two now use one WebAudio approach pipeline to avoid mixed dual-output behavior.

## Debug fields changed + 3-PR rule check
新增 debug 欄位：
- `audio.lastApproach.key`
- `audio.lastApproach.startedAt`
- `audio.lastApproach.durationMs`
- `audio.lastApproach.startGain`
- `audio.lastApproach.endGain`
- `audio.lastApproach.startLPF`
- `audio.lastApproach.endLPF`
- `fx.blackout.isActive`
- `fx.blackout.mode`
- `fx.blackout.endsInMs`

3 次 PR 規則檢查：
1. 已在本 PR 完整列出新增欄位。  
2. 已接入 debug overlay，實際可觀測。  
3. 後續至少保留 3 次 PR 驗證後才可提議移除。

## SSOT impact
- No SSOT file modified.
- Existing SSOT behavior respected: event-driven trigger + cooldown gate + pause/freeze gate retained, and integrated with new audio/blackout behavior.

## Scope
- audio: `src/audio/distanceApproach.ts`, `src/ui/scene/SceneView.tsx`
- events/pause: `src/app/App.tsx`
- visual overlay: `src/ui/scene/SceneView.tsx`, `src/styles.css`
- docs: `README.md`, `docs/10-change-log.md`, `PR_NOTES.md`

## Validation
- `npm run build` passed.
- Playwright screenshot attempt failed in container due to browser crash (`SIGSEGV`), so no artifact generated in this run.
