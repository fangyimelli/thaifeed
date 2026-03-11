import fs from 'node:fs';

const poolFile = fs.readFileSync(new URL('../src/ssot/sandbox_story/nightQuestionPools.ts', import.meta.url), 'utf8');
const modeFile = fs.readFileSync(new URL('../src/modes/sandbox_story/sandboxStoryMode.ts', import.meta.url), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

for (const night of ['NIGHT_01', 'NIGHT_02', 'NIGHT_03']) {
  const block = poolFile.match(new RegExp(`${night}:\\s*[A-Z0-9_]+`, 'm'));
  assert(block, `missing pool map for ${night}`);
}

for (const arr of ['const N1: PoolEntry[] = [', 'const N2: PoolEntry[] = [', 'const N3: PoolEntry[] = [']) {
  const start = poolFile.indexOf(arr);
  assert(start >= 0, `missing ${arr}`);
  const end = poolFile.indexOf('];', start);
  const seg = poolFile.slice(start, end);
  const count = (seg.match(/questionId:/g) || []).length;
  assert(count === 10, `${arr} expected 10 questions got ${count}`);
}

for (const token of ["'ข', 'kh', 'ㄎ'", "'ฉ', 'chh', 'ㄑ'", "'ถ', 'th', 'ㄊ'", "'ผ', 'ph', 'ㄆ'", "'ฝ', 'f', 'ㄈ'"]) {
  assert(poolFile.includes(token), `missing candidate set ${token}`);
}

for (const token of ['questionOrder: shuffledOrder', 'currentQuestionCursor', 'currentQuestionId', 'remainingQuestionCount', 'authoritativeQuestionSource']) {
  assert(modeFile.includes(token), `missing round state token ${token}`);
}
assert(modeFile.includes('end_of_question_pool'), 'advance still depends on end_of_nodes only');
assert(modeFile.includes('resolveRoundNode(state, ssot).node'), 'current node not authoritative by round');

console.log('regression-sandbox-night-pool-ssot: ok');
