import assert from 'node:assert/strict';

function simulateQuestionSendFailed() {
  const state = {
    cooldownMeta: { GHOST_PING: { nextAllowedAt: 123, lastCommittedAt: 100, lastRollbackAt: 0 } },
    freeze: { isFrozen: true, reason: 'tagged_question' },
    pause: true,
    qna: { status: 'AWAITING_REPLY', taggedUserHandle: 'player', questionMessageId: 'm1' },
    event: { inFlight: true, queue: ['VIEWER_SPIKE'] }
  };

  const starterTagSent = false;
  const preEffectTriggered = false;
  const abortedReason = 'question_send_failed';

  if (abortedReason === 'question_send_failed' && !starterTagSent && !preEffectTriggered) {
    state.freeze = { isFrozen: false, reason: null };
    state.pause = false;
    state.qna = { status: 'IDLE', taggedUserHandle: null, questionMessageId: null };
    state.event = { inFlight: false, queue: [] };
    state.cooldownMeta.GHOST_PING = {
      ...state.cooldownMeta.GHOST_PING,
      nextAllowedAt: 0,
      lastRollbackAt: Date.now()
    };
  }

  return state;
}

const result = simulateQuestionSendFailed();
assert.equal(result.freeze.isFrozen, false);
assert.equal(result.pause, false);
assert.equal(result.qna.status, 'IDLE');
assert.equal(result.event.inFlight, false);
assert.equal(result.event.queue.length, 0);
assert.equal(result.cooldownMeta.GHOST_PING.nextAllowedAt, 0);
console.log('question_send_failed rollback/recover simulation passed');
