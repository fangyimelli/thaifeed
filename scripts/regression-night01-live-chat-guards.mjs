import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const mode = fs.readFileSync('src/modes/sandbox_story/sandboxStoryMode.ts', 'utf8');
const flowDoc = fs.readFileSync('docs/sandbox-flow-table.md', 'utf8');

const checks = [
  ['boot_transitions_into_reveal_start', /setFlowStepInternal\('REVEAL_1_START', 'intro_passed'\)/.test(mode)],
  ['reveal_before_riot_guard', /flow\.step === 'REVEAL_1_RIOT'[\s\S]*hasSandboxQuestionPrerequisites\(sandboxState\)/.test(app)],
  ['prompt_before_tag_guard', /flow\.step === 'TAG_PLAYER_1'[\s\S]*hasSandboxQuestionPrerequisites\(sandboxState\)/.test(app)],
  ['gate_before_ask_player_guard', /flow\.step === 'WAIT_REPLY_1'[\s\S]*hasSandboxQuestionPrerequisites\(sandboxState\)[\s\S]*@\$\{taggedUser\} 你知道剛剛閃過那個字怎麼唸嗎？/.test(app)],
  ['mention_extraction_pipeline_before_judge', /extractConsonantAnswerPayload\(raw\)/.test(app) && /parseAndJudgeUsingClassic\(raw/.test(app)],
  ['last_reply_eval_contains_extracted_answer', /extractedAnswer/.test(app)],
  ['ambient_burst_is_finite', /glitchCount < 2/.test(app) && /unresolvedAmbient/.test(app)],
  ['flow_doc_contains_boot_reveal_riot_tag_wait_contract', /PREJOIN[\s\S]*PREHEAT[\s\S]*REVEAL_1_START[\s\S]*REVEAL_1_RIOT[\s\S]*TAG_PLAYER_1[\s\S]*WAIT_REPLY_1/.test(flowDoc)]
];

for (const [name, ok] of checks) {
  assert.equal(ok, true, `failed: ${name}`);
}

console.log(`regression-night01-live-chat-guards: ${checks.length} checks passed`);
