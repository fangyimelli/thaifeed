## 2026-03-20 Sandbox pinned reply first-submit repair

### Scope
- Sandbox integration mode only.
- No classic mode changes.

### Audit summary
1. sandbox pinned reply authority was split between `App.tsx` local state and sandbox runtime state.
2. sandbox reply preview was still gated by classic `qnaStatus`, so first-turn sandbox prompts could miss the same-turn pinned render.
3. debug pinned reason/source used a different derivation path than the formal UI.

### Implemented fix
- Added authoritative sandbox `pinnedReply` SSOT in `sandboxStoryMode`.
- Routed prompt pin / auto-pin / clear / advance cleanup through that SSOT.
- Updated ChatPanel sandbox preview gating to use sandbox authority instead of classic `qnaStatus`.
- Synced debug pinned reason/source/summary with authoritative pinned state.
- Added regression guards for pinned SSOT and sandbox preview gating.

### Verification
- `npm run build`
- `node scripts/sandbox-v2-regression-guards.mjs`

### Deprecated/Removed
- Removed sandbox local `useState(sandboxPinnedEntry)` as the authoritative pinned source.
- Removed sandbox preview dependence on classic `qnaStatus`.
