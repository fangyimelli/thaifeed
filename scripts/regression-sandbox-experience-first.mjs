import fs from 'node:fs';

const flowDoc = fs.readFileSync('docs/sandbox-flow-table.md', 'utf8');
const words = fs.readFileSync('src/data/night1_words.ts', 'utf8');

const guards = [
  ['PREHEAT 30 秒規則', /PREHEAT \(30 秒\)/.test(flowDoc)],
  ['每題 10 段節奏', /每題固定 10 段節奏/.test(flowDoc)],
  ['WAIT_REPLY freeze', /WAIT_REPLY Freeze/.test(flowDoc)],
  ['backlog flush', /backlog flush/.test(flowDoc)],
  ['題1~3 身份線索', /題 1~3：身份/.test(flowDoc)],
  ['題4 正式猜身份', /題 4：第一次正式猜身份/.test(flowDoc)],
  ['題5~8 動機線索', /題 5~8：動機線索/.test(flowDoc)],
  ['題9 正式猜動機', /題 9：正式猜動機/.test(flowDoc)],
  ['題10 恐怖總結', /題 10：恐怖總結/.test(flowDoc)],
  ['Night1 Q10 恐怖選項', /看你後面/.test(words) && /我在你後面/.test(words)],
  ['autoplay debug 欄位', /autoplayNightEnabled/.test(flowDoc) && /waitingForMockReply/.test(flowDoc)],
  ['角色分工', /角色分工/.test(flowDoc) && /VIP/.test(flowDoc) && /mod_live/.test(flowDoc)]
];

const failed = guards.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`FAIL: ${name}`);
  process.exit(1);
}
console.log(`PASS ${guards.length} sandbox experience-first guards`);
