import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const adapter = fs.readFileSync('src/modes/sandbox_story/classicConsonantAdapter.ts', 'utf8');

const checks = [
  ['extract_payload_helper_exists', /export function extractConsonantAnswerPayload/.test(adapter)],
  ['extract_pipeline_strips_mentions_and_wrappers', /LEADING_MENTION/.test(adapter) && /LEADING_REPLY_WRAPPER/.test(adapter) && /INLINE_MENTION/.test(adapter)],
  ['consonant_gate_ignores_target_mismatch', /targetIgnoredByGate = gate\.replyGateType === 'consonant_answer' \|\| gate\.replyGateType === 'consonant_guess'/.test(app)],
  ['target_mismatch_only_blocks_non_consonant', /if \(!targetIgnoredByGate && expectedTarget && inboundTarget && expectedTarget !== inboundTarget\)/.test(app)],
  ['answer_pipeline_written_to_telemetry', /answerPipeline: 'raw>detect_mentions>strip_mentions>normalize>candidate_compare>judge>consume'/.test(app)],
  ['judge_pipeline_uses_raw_then_extraction', /parseAndJudgeUsingClassic\(raw, \{/.test(app) && /const extraction = extractConsonantAnswerPayload\(raw\);/.test(app)]
];

for (const [name, ok] of checks) {
  assert.equal(ok, true, `failed: ${name}`);
}

console.log(`regression-consonant-mention-pipeline: ${checks.length} checks passed`);
