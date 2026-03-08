# PR Notes - Sandbox Experience-First Rebuild

## Scope
- Applied on current branch (no new branch).
- Sandbox-only integration patch; classic mode left untouched.

## What changed
1. `sandboxFlow` expanded as SSOT fields:
   - `phase`, `phaseStartedAt`, `replyGateActive`, `replyTarget`
   - `currentEmitter`, `currentStepHasEmitted`
   - `pendingBacklogMessages`, `pendingGlyph`, `pendingWord`
   - `playerLastReply`, `sanityPressure`
   - `autoplayNightEnabled`, `autoplayNightStatus`, `waitingForMockReply`
2. PREHEAT keeps 30s warmup before first question.
3. WAIT_REPLY is hard freeze; non-player chatter disabled from scheduler path.
4. Player reply now drives backlog flush -> immediate word reveal progression.
5. Tag emitter normalized to single `mod_live` to avoid duplicate mixed tags.
6. Auto play night injects mock replies during WAIT_REPLY and advances flow.
7. Night1 question text updated to align with identity/motive/horror arc.

## Regression guards
- Added script `scripts/regression-sandbox-experience-first.mjs` to validate flow-table/spec invariants.
