# Debug Force Execute Events (Prepare → Commit → Effects)

## Changed
- Added debug-only public force execution entry in app event system via `debugForceExecuteEvent(eventKey, options)` and exposed it as `window.__THAIFEED_DEBUG_FORCE_EVENT__`.
- Force execution still runs the full transaction pipeline (`Prepare → Commit → Effects`), no direct effect bypass.
- Commit gate now supports force options:
  - `ignorePause`
  - `ignoreCooldown`
  - `skipTagRequirement`
- Added commit blocked reasons and tracking for force path:
  - `paused`
  - `cooldown`
  - `no_tag`
- Added freeze-deadlock guard:
  - forced event with `ignorePause=true` skips `scrollThenPauseForTaggedQuestion`, so effects can run without entering pause freeze.
- Debug Panel updated:
  - Events list shows all event keys.
  - Each event row now has `Force {eventKey}` button.
  - Added force override checkboxes (`Ignore Cooldowns`, `Ignore Pause`, `Skip Tag Requirement`).
  - Added forced-run observability fields in overlay.

## Removed
- None.

## SSOT files changed
- `src/app/App.tsx`
  - Reason: event transaction/commit gate logic is centralized here; force-entry and override policy must be implemented at this SSOT layer.
- `src/ui/scene/SceneView.tsx`
  - Reason: debug overlay state typing SSOT for new force debug fields.

## Debug fields changed + 3-PR rule check
新增 debug 欄位：
- `event.debug.lastForcedEventKey`
- `event.debug.lastForcedAt`
- `event.debug.lastForcedOptions`
- `event.debug.forcedEventCount`
- `event.lastCommitBlockedReason`
- `event.lastEvent.forcedByDebug`
- `event.lastEvent.forceOptions`

3 次 PR 規則檢查：
1. 本 PR 已完整列出新增欄位。  
2. 本 PR 已接入 Debug overlay 可直接觀測。  
3. 後續至少連續 3 次 PR 保留並驗證，再討論是否下修。  

## Scope
- events/debug/audio/player/chat:
  - `src/app/App.tsx`
  - `src/ui/scene/SceneView.tsx`
- docs:
  - `README.md`
  - `docs/10-change-log.md`
  - `PR_NOTES.md`

## Validation
- `npm run build` ✅
- Screenshot: failed due to Playwright Chromium crash (SIGSEGV) in this environment.
