## Summary
- Audit-only: traced sandbox/classic consonant_answer parse/judge chain and added debug observability fields (no functional fix yet).

## Changed
- Added shared-engine helper exports for accepted alias candidate introspection.
- Added sandbox audit debug payload in App debug state and debug panel.
- Added parser/judge audit snapshot into `lastReplyEval.audit` for per-input trace.
- Updated docs with audit state table and regression checklist.

## Removed
- Item: None (audit-only)
- Reason: N/A
- Impact: N/A
- Alternative: N/A

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [x] No SSOT changes
- [ ] SSOT changed (list files + reasons below)

## Acceptance
- Debug fields checked: yes (build + screenshot artifact)
- Desktop check: basic
- Mobile check: not run
