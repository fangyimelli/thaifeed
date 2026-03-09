## Summary
- Fix sandbox_story v2 initialization crash caused by legacy debug nested reads (`promptVsReveal`) against partially hydrated state.
- Added formal sandbox v2 initial runtime/debug shape and state-shape normalizer so `getState()` always returns safe nested objects.
- Removed legacy sandbox debug field rendering and switched mismatch display to v2-safe prompt/reveal comparison.
- Added regression guard script for shape presence, safe access, and legacy field read removal.

## Root cause
- App debug/hydration logic directly accessed `sandboxState.mismatch.promptVsReveal` while `mismatch` was absent during early sandbox v2 init.

## Validation
- npm run test:sandbox-guards
- npm run build

## Scope guard
- Only sandbox-related runtime/debug initialization safety paths were changed.
- No classic mode behavior changes.
