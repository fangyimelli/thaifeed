## Summary
- Audit-only: completed cross-layer investigation for sandbox story `bopomofo alias / debug state / scheduler phase` mismatch; no production logic changes.

## Changed
- Added `docs/sandbox-audit-bopomofo-debug-scheduler.md` with authoritative flow, mismatch findings, fix plan, and regression guards.
- Updated README / changelog / flow table to reference this audit-only investigation.

## Removed
- Item: None (audit-only)
- Reason: N/A
- Impact: N/A
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated
- [x] docs/sandbox-flow-table.md updated

## SSOT
- [x] No SSOT changes
- [ ] SSOT changed (list files + reasons below)

## Acceptance
- Debug fields checked: code-path audit only (no runtime behavior changes)
- Desktop check: not applicable (no visual change)
- Mobile check: not run
