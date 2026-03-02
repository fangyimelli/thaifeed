# Event transaction hardening: Prepare → Commit → Effects

## Changed
- Event execution was refactored into a transaction pipeline in `App`:
  - **Prepare**: choose actor + build tagged question + send line.
  - **Commit**: gate checks (`paused`, `audio_locked`, `assets_missing`, `sfx_cooldown_active`, `video_src_empty`, `video_not_ready`).
  - **Effects**: only when committed, run SFX/video/blackout in the same call chain.
- Fixed silent-fail path where tagged question could be sent but effects never played.
- Pause ordering adjusted to recommended strategy A:
  - run event effects first
  - then `scrollThenPauseForTaggedQuestion` (avoid commit being blocked by pause set too early).
- Added full blocked-reason observability in debug for commit abort cases.
- `TV_EVENT` now always resolves via registry mapping to `loop4`, with explicit source readiness checks before commit.

## SSOT impact
- Added new SSOT file: `src/events/eventEffectsRegistry.ts`.
- Reason: centralize event→effects mapping (`sfx/video/blackout`) to remove scattered if/else logic and prevent drift between event engines.

## Debug fields changed + 3-PR rule check
新增 debug 欄位：
- `event.lastEvent.questionMessageId`
- `event.lastEvent.commitBlockedReason`
- `event.lastEventCommitBlockedReason`
- `event.lastEffects.sfxPlayed[]`
- `event.lastEffects.videoSwitchedTo`
- `event.lastEffects.blackoutStartedAt`
- `event.lastEffects.mode`

3 次 PR 規則檢查：
1. 本 PR 已完整列出新增欄位。  
2. 本 PR 已接入 Debug overlay 可直接觀測。  
3. 後續至少連續 3 次 PR 保留並驗證，再討論是否下修。  

## Scope
- events: `src/app/App.tsx`, `src/events/eventEffectsRegistry.ts`
- debug UI: `src/ui/scene/SceneView.tsx`
- docs: `README.md`, `docs/10-change-log.md`, `PR_NOTES.md`

## Validation
- `npm run build` passed.
