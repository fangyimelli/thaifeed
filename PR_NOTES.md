## Summary
- Align sandbox SSOT reply-gate schema to enforced integration contract: rename formal fields to `gateType` and `targetPlayerId`, while preserving backward-compatible hydration from legacy `type/targetActor`.
- Ensure flow/state/debug share one authority by syncing derived gate state back into sandbox mode each tick (`gateType`, `replyGateActive`, `canReply`, `replySourceMessageId`, `replySourceType`, `consumePolicy`).
- Update debug panel labels to read the same formal replyGate keys (`gateType/armed`, `sourceMessageId/targetPlayerId`).
- Add regression guard checks to prevent replyGate schema/debug drift.

## Root cause
1. Sandbox runtime still carried mixed reply-gate naming (`type/targetActor` vs `gateType/targetPlayerId`), creating schema ambiguity.
2. Derived gate lived mostly in UI-side computed state; formal mode state could lag key fields used by debug and audits.

## Validation
- npm run test:sandbox-guards
- npm run build

## Scope guard
- Only sandbox_story flow/state/debug integration path was changed.
- Classic mode logic remains untouched.
