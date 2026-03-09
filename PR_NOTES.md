## Summary
- Stop story feature expansion; fix sandbox_story v2 root runtime mount only.
- Built formal sandbox v2 root initial state with guaranteed object presence for flow/scheduler/prompt/reply/theory/backlog/ambient/ghost/ssot.
- Ensure mode entry mounts this root state and keeps it in the runtime path.
- Debug hydration now maps directly from real v2 root state (not legacy assembled fallbacks).
- Added regression guards for initial shape, runtime mount, hydration source, ssot version, and non-dash flow/scheduler values.

## Root cause
- Debug path read mixed legacy/fallback fields before v2 root object existed, so UI looked like sandbox mode while core root state stayed effectively unmounted (`sandbox.ssot.version` became `-`).

## Validation
- npm run test:sandbox-guards
- npm run build

## Scope guard
- Only sandbox runtime mount + hydration paths were changed.
- Classic mode behavior unchanged.
