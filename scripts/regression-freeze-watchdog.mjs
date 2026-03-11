import assert from 'node:assert/strict';

const isWaitReplyStep = (step) => /^WAIT_REPLY_\d+$/.test(step);

function sandboxFlowCanEmit({ step, sourceTag }) {
  if (isWaitReplyStep(step)) return false;
  return sourceTag.startsWith('sandbox_tag_player_')
    || sourceTag === 'sandbox_consonant_prompt'
    || sourceTag === 'sandbox_crowd_react_word'
    || sourceTag === 'sandbox_vip_summary_1'
    || sourceTag === 'sandbox_vip_summary_2'
    || sourceTag === 'sandbox_discuss_pronounce'
    || sourceTag === 'sandbox_tech_backlog_flush'
    || sourceTag === 'sandbox_possession_autosend';
}

assert.equal(sandboxFlowCanEmit({ step: 'PREJOIN', sourceTag: 'sandbox_consonant_prompt' }), true);
assert.equal(sandboxFlowCanEmit({ step: 'WAIT_REPLY_1', sourceTag: 'sandbox_crowd_react_word' }), false);
assert.equal(sandboxFlowCanEmit({ step: 'WAIT_REPLY_2', sourceTag: 'sandbox_preheat_join' }), false);
assert.equal(sandboxFlowCanEmit({ step: 'TAG_PLAYER_1', sourceTag: 'sandbox_chat_engine' }), false);
console.log('sandbox flow freeze watchdog regression passed');
