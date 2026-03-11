## Summary
- sandbox only：修正 `consonant_answer` 在第二題因 tag/target mismatch 擋掉正確答案的問題，建立單一 answer extraction pipeline，並補齊 audit/telemetry。

## Changed
- `extractConsonantAnswerPayload`：提取 mentions、strip leading mentions/reply wrapper、輸出 normalized payload。
- `consumePlayerReply`：`consonant_answer` 不再以 reply target 作為 consume 阻擋條件；所有輸入走同一 ANSWER_EVAL judge pipeline。
- docs/README/flow table 與 regression guards 同步更新。

## Removed
- Item: `consonant_answer` consume 的 `target_mismatch` hard block。
- Reason: 與 UI tag/thread 包裝衝突，造成正確答案被 gate 擋掉。
- Impact: 有無 tag / tag 對象均不影響 judge；thread 資訊僅留作 trace/debug。
- Alternative: 保留 target 於 telemetry/audit（non-blocking）。

## Docs
- [x] README.md updated
- [x] docs/10-change-log.md updated
- [x] PR_NOTES.md updated

## SSOT
- [x] No SSOT changes
- [ ] SSOT changed (list files + reasons below)

## Acceptance
- Debug fields checked: `lastReplyEval`, `judge.*`, `reply.consume*`, `renderSync.reason`, `scheduler.phase(non-authoritative)`
- Desktop check: regression scripts + type/build
- Mobile check: N/A（logic-only）


---

(Keep this template aligned with PR_NOTES.md for each change.)
