import fs from 'node:fs';

const flowDoc = fs.readFileSync('docs/sandbox-flow-table.md', 'utf8');

const guards = [
  ['PREHEAT 30 秒規則', /PREHEAT_CHAT/.test(flowDoc) && /30 秒/.test(flowDoc)],
  ['單一路徑到 ADVANCE_NEXT', /PREJOIN[\s\S]*PREHEAT_CHAT[\s\S]*REVEAL_1[\s\S]*WAIT_REPLY_1[\s\S]*ADVANCE_NEXT/.test(flowDoc)],
  ['WAIT_REPLY gateType', /WAIT_REPLY_1[\s\S]*consonant_guess/.test(flowDoc)],
  ['system 限制', /禁止 system 出題/.test(flowDoc)],
  ['autoplay 依 gateType', /autoplayNightEnabled=true/.test(flowDoc)],
  ['debug 欄位要求', /state \/ gateType \/ canReply \/ lastReplyEval/.test(flowDoc)],
  ['spam 防護', /同 sender 在同 gate/.test(flowDoc)]
];

const failed = guards.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`FAIL: ${name}`);
  process.exit(1);
}
console.log(`PASS ${guards.length} sandbox experience-first guards`);
