import assert from 'node:assert/strict';

const isWaitReplyStep = (step) => /^WAIT_REPLY_\d+$/.test(step);

function deriveReplyGateFromSandboxFlow(flow) {
  return {
    replyGateArmed: isWaitReplyStep(flow.step),
    replyGateType: isWaitReplyStep(flow.step) ? 'consonant_wait_reply' : null,
    replyTarget: flow.replyTarget
  };
}

function pushBacklog(flow, now, lastAt) {
  if (flow.step !== 'WAIT_REPLY_3') return { flow, lastAt: 0 };
  if (lastAt <= 0) return { flow, lastAt: now };
  if (now - lastAt < 30_000) return { flow, lastAt };
  return {
    flow: {
      ...flow,
      backlogTechMessages: [...flow.backlogTechMessages, '技術故障：訊號不穩，暫時卡住', '技術故障：系統延遲，先別重整'].slice(-8)
    },
    lastAt: now
  };
}

const noGate = deriveReplyGateFromSandboxFlow({ step: 'PREHEAT', replyTarget: null });
assert.equal(noGate.replyGateArmed, false);

const activeGate = deriveReplyGateFromSandboxFlow({ step: 'WAIT_REPLY_2', replyTarget: 'mod_live' });
assert.equal(activeGate.replyGateArmed, true);
assert.equal(activeGate.replyGateType, 'consonant_wait_reply');

const baseFlow = { step: 'WAIT_REPLY_2', backlogTechMessages: [] };
assert.equal(pushBacklog(baseFlow, 60_000, 30_000).flow.backlogTechMessages.length, 0);

const wait3 = { step: 'WAIT_REPLY_3', backlogTechMessages: [] };
const seeded = pushBacklog(wait3, 31_000, 0);
const appended = pushBacklog(seeded.flow, 61_500, seeded.lastAt);
assert.equal(appended.flow.backlogTechMessages.length, 2);
console.log('sandbox reply gate + backlog regression passed');
