## Summary

### classic 為何未受影響
- classic mode 的 prompt wording / hint wording / judge pipeline 維持現狀；本次僅把 alias/acceptedCandidates 的來源收斂到同一 SSOT，並補齊 common playable 集合至 29 子音（含 `ฬ`）。
- classic 仍採隨機選題（common pool random + scheduler），未改 classic 出題流程與互動節奏。

### 29 子音 SSOT
- 新增 `src/shared/consonant-engine/consonantBank.ts`：
  - `AUTHORITATIVE_CONSONANT_BANK`（29）
  - 每項欄位：`consonant/revealWord/acceptedCandidates/imageMemoryHint`
  - `SANDBOX_NIGHT_CONSONANT_POOLS`（N1/N2/N3）
  - `HELP_REQUEST_KEYWORDS` + `isHelpRequest`

### sandbox night pools
- `src/ssot/sandbox_story/nightQuestionPools.ts` 改為由 SSOT bank + `SANDBOX_NIGHT_CONSONANT_POOLS` 建構。
- 每夜 10 題固定集合，questionId 依 NIGHT mapping 對齊，進夜仍由 runtime `questionOrder` shuffle。

### shared judge pipeline
- sandbox consonant gate 持續使用 `parseAndJudgeUsingClassic`。
- `acceptedCandidates` 統一取自 authoritative consonant bank，確保泰文/英文/注音 alias resolution 一致。

### image memory hint system
- HELP REQUEST 語意命中後：
  - 不判錯、不 reveal、不跳題
  - 保持 currentQuestion/gate
  - 由 viewer 發送 image memory 提示（`hint.source=imageMemoryLibrary`）
  - 留下 `help_requested` 判定與 telemetry

## Validation results
- `npm run test:sandbox-guards`：通過（含新增 regression guards：29 SSOT、help request、end_of_question_pool reason）。
- `npm run build`：通過。

