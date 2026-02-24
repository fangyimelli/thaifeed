type UnfamiliarEntry = {
  count: number;
  lastTime: number;
};

const unfamiliarDB: Record<string, UnfamiliarEntry> = {};

function upsert(letter: string, delta: number) {
  const now = Date.now();
  const prev = unfamiliarDB[letter] ?? { count: 0, lastTime: now };
  const nextCount = Math.max(0, prev.count + delta);

  unfamiliarDB[letter] = {
    count: nextCount,
    lastTime: now
  };

  return unfamiliarDB[letter];
}

export function markPassed(letter: string) {
  return upsert(letter, 2);
}

export function markWrong(letter: string) {
  return upsert(letter, 1);
}

export function markCorrect(letter: string) {
  return upsert(letter, -1);
}

export function getUnfamiliarEntry(letter: string) {
  return unfamiliarDB[letter];
}

export function getUnfamiliarCount(letter: string) {
  return unfamiliarDB[letter]?.count ?? 0;
}

