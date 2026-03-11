## 2026-03-11 PROJECT LEVEL INTEGRATED FLOW REPAIR (sandbox NIGHT_01)

### Root Cause Report
- Primary: NIGHT_01 had split ownership (`TAG_PLAYER_2_PRONOUNCE` / `TAG_PLAYER_3_MEANING` plus generic `TAG_PLAYER_x`) causing per-question divergence and fragile handoff at Q3/Q4.
- Secondary: `ADVANCE_NEXT` could still apply multi-step updates (`advance` then `prompt` then `step`) with non-atomic behavior risk.
- Latent: regression checks were biased to Q1~Q3 patterns and did not enforce unified generic flow ownership.

### What changed
- Unified tag flow naming to `TAG_PLAYER_x` for all questions (removed Q2/Q3 special step names).
- Introduced sandbox atomic emitter action: `advancePromptAtomically()` in `sandboxStoryMode`.
- `ADVANCE_NEXT` now consumes atomic emitter in App and uses emitted payload for next-scene request.
- Regression guard script updated to enforce atomic path and generic tag step resolution.

### Required docs sync
- README updated.
- docs/10-change-log.md updated.
- docs/sandbox-flow-table.md updated with owner/enter/exit/blocked/side-effect table.

### Scope
- Sandbox-only changes.
- Classic mode untouched.
