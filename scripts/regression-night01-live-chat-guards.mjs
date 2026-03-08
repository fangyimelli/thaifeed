import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app/App.tsx', 'utf8');
const adapter = fs.readFileSync('src/modes/sandbox_story/classicConsonantAdapter.ts', 'utf8');
const flowDoc = fs.readFileSync('docs/sandbox-flow-table.md', 'utf8');

const checks = [
  ['preheat_min_30s', /minDurationMs:\s*30_000/.test(fs.readFileSync('src/modes/sandbox_story/sandboxStoryMode.ts', 'utf8'))],
  ['no_system_exam_prompt_text', !/請回覆本題子音|直接輸入：|請回答|本題答案/.test(adapter)],
  ['tag_player_1_emitter_exists', /flow\.step === 'TAG_PLAYER_1'[\s\S]*@\$\{taggedUser\} 你知道那個字怎麼唸嗎？/.test(app)],
  ['wait_reply_has_gate_type_usage', /sandboxFlow\.gateType !== 'none'/.test(app)],
  ['autoplay_reaches_advance_chain', /WAIT_REPLY_1[\s\S]*POST_ANSWER_GLITCH_1/.test(app) && /NETWORK_ANOMALY_1[\s\S]*ADVANCE_NEXT/.test(app)],
  ['lastReplyEval_written_each_submit_path', /writeSandboxLastReplyEval\(\{ rawInput: raw, normalizedInput: stripped, consumed: false, reason: 'no_gate'/.test(app) && /reason: 'consume_success'/.test(app)],
  ['sender_gate_duplicate_guard_exists', /sandbox_same_sender_duplicate_in_gate/.test(app)],
  ['debug_flag_not_authoritative', /sandbox\.debug\.isolatedTagLock: \{String\(debugIsolatedTagLock\)\} \(visual only\)/.test(app)],
  ['flow_doc_contains_required_sequence', /PREJOIN[\s\S]*PREHEAT_CHAT[\s\S]*INTRO_CHAT_RIOT[\s\S]*REVEAL_1[\s\S]*CHAT_RIOT[\s\S]*WAIT_REPLY_1[\s\S]*POST_ANSWER_GLITCH[\s\S]*NETWORK_ANOMALY[\s\S]*ADVANCE_NEXT/.test(flowDoc)]
];

for (const [name, ok] of checks) {
  assert.equal(ok, true, `failed: ${name}`);
}

console.log(`regression-night01-live-chat-guards: ${checks.length} checks passed`);
