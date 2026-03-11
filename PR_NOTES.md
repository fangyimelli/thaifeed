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

## 2026-03-11 Sandbox NIGHT pool shuffle SSOT integration

### 新的 sandbox night question SSOT
- 新增 `src/ssot/sandbox_story/nightQuestionPools.ts`：
  - SSOT shape: `nightId -> questionId -> expectedConsonant/revealWord/acceptedCandidates`
  - 由 `buildNightScriptFromPool` 產生 sandbox 使用的 `NightScript`。

### NIGHT1 / NIGHT2 / NIGHT3 pool
- NIGHT_01 / NIGHT_02 / NIGHT_03 各自固定 10 題，不跨 NIGHT 抽題。
- 每題 acceptedCandidates 至少含：泰文子音 / 英文拼音 / 注音。

### shuffle 機制
- 進入 NIGHT（bootstrap/importSSOT）建立 `round.questionOrder`（只對當前 NIGHT pool shuffle）。
- 以 `round.currentQuestionCursor + round.questionOrder` 推進。
- 終止改為 `end_of_question_pool`，不再依賴固定 `end_of_nodes`。

### classic 未受影響的證據
- 未變更 `src/modes/classic/*` 流程邏輯。
- classic adapter 只增加「若 sandbox node 已帶 authoritative acceptedCandidates 則優先使用」，不改 classic gate/flow。

### 驗證方式
- `npm run build`
- `node scripts/regression-sandbox-night-pool-ssot.mjs`
- `node scripts/sandbox-v2-regression-guards.mjs`
