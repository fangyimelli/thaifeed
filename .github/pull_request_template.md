## 2026-03-11 WAIT_REPLY_4+ / Dynamic WAIT_REPLY_x guard extension

### Root Cause Report
- Existing guards enforced `WAIT_REPLY_2/3 -> ANSWER_EVAL`, but did not explicitly lock `WAIT_REPLY_4+` / dynamic `WAIT_REPLY_x` consume-success behavior.
- Some guard expectations risked remaining tied to fixed 1~3 wait-reply assumptions instead of dynamic wait-step helpers.
- `scene_not_synced_warning` needed an explicit render-only contract to avoid submit-blocking misuse.

### What changed
- Updated `scripts/sandbox-v2-regression-guards.mjs` with dynamic wait-reply consume coverage:
  - consume success for `WAIT_REPLY_x` must enter `ANSWER_EVAL` (including `WAIT_REPLY_4+`).
  - direct consume shortcut to `ADVANCE_NEXT` is forbidden.
  - consume-success path must not fall back to `submit_rejected`.
- Added guard checks that freeze/render answerable logic must rely on `isSandboxWaitReplyStep` + `parseSandboxWaitReplyIndex`, not fixed `WAIT_REPLY_1~3` literals.
- Added guard checks that `scene_not_synced_warning` can only exist in render-sync warning context and must never appear as submit/consume blocked reason.

### Required docs sync
- README updated.
- docs/10-change-log.md updated.
- docs/sandbox-flow-table.md updated.
- PR_NOTES and `.github/pull_request_template.md` synchronized.

### Scope
- Sandbox regression guard + documentation only.
- Runtime behavior unchanged by this patch (guard/doc reinforcement).
