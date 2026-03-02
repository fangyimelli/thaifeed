import assert from 'node:assert/strict';

function watchdogTick(state) {
  if (state.chat.freeze.isFrozen && state.chat.freezeCountdownRemaining <= 0) {
    state.chat.freeze = { isFrozen: false, reason: null };
    state.chat.pause = false;
    state.chat.autoScrollMode = 'FOLLOW';
    state.chat.lastScrollModeChange = 'freeze_watchdog_countdown_zero';
  }
  return state;
}

const initial = {
  chat: {
    freeze: { isFrozen: true, reason: 'tagged_question' },
    freezeCountdownRemaining: 0,
    pause: true,
    autoScrollMode: 'FROZEN',
    lastScrollModeChange: '-'
  }
};
const result = watchdogTick(initial);
assert.equal(result.chat.freeze.isFrozen, false);
assert.equal(result.chat.pause, false);
assert.equal(result.chat.autoScrollMode, 'FOLLOW');
console.log('freeze watchdog simulation passed');
