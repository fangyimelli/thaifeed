## Summary
- Fix sandbox v2 startup chain so entering `sandbox_story` always starts formal flow: `BOOT -> PREHEAT_CHAT`, with non-empty transitions and initialized `scheduler.phase/questionIndex/introGate`.
- Remove legacy join spam path in sandbox mode by hard-blocking the old `system_ui` join loop and replacing preheat output with a controlled sandbox v2 preheat contract.
- Implement controlled preheat sequence with natural chat-dominant lines and capped joins (`SANDBOX_PREHEAT_JOIN_CAP=4`), including anti-flood same-sender guard.
- Extend sandbox regression guards with startup/phase invariants and preheat spam-block checks.

## Root cause
1. Sandbox v2 root state existed, but flow startup could appear stalled when runtime wasn’t consistently driven through explicit preheat orchestration.
2. A legacy global join emitter effect kept running regardless of sandbox mode and produced parallel join noise.
3. A separate preheat block emitted `viewer_xxx 進來了` as `mod_live` chat lines, causing join spam to dominate.

## Validation
- npm run test:sandbox-guards
- npm run build

## Scope guard
- Only sandbox runtime / chat emitter / debug-hydration-adjacent behavior touched.
- Classic mode pipeline remains isolated.
