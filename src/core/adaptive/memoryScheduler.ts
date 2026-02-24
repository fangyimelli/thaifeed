export interface MemoryNode {
  letter: string;
  easeFactor: number;
  interval: number;
  nextDue: number;
  lapseCount: number;
}

type ReviewResult = 'correct' | 'wrong' | 'pass';

const INITIAL_EASE_FACTOR = 2.3;
const INITIAL_INTERVAL_SECONDS = 20;
const INITIAL_DELAY_SECONDS = 10;

const memoryMap = new Map<string, MemoryNode>();

function nowMs() {
  return Date.now();
}

function toMs(seconds: number) {
  return seconds * 1000;
}

function createInitialNode(letter: string, now: number): MemoryNode {
  return {
    letter,
    easeFactor: INITIAL_EASE_FACTOR,
    interval: INITIAL_INTERVAL_SECONDS,
    nextDue: now + toMs(INITIAL_DELAY_SECONDS),
    lapseCount: 0
  };
}

export function getMemoryNode(letter: string): MemoryNode {
  const now = nowMs();
  const existing = memoryMap.get(letter);
  if (existing) return existing;

  const created = createInitialNode(letter, now);
  memoryMap.set(letter, created);
  return created;
}

function accelerateForCurse(curse: number, now: number) {
  if (curse <= 60) return;

  memoryMap.forEach((node, key) => {
    const remainingMs = Math.max(0, node.nextDue - now);
    const acceleratedRemainingMs = remainingMs * 0.8;
    memoryMap.set(key, {
      ...node,
      nextDue: now + acceleratedRemainingMs
    });
  });
}

export function markReview(letter: string, result: ReviewResult, curse: number) {
  const now = nowMs();
  const node = getMemoryNode(letter);

  if (result === 'correct') {
    const nextInterval = node.interval * node.easeFactor;
    const easeCap = curse > 80 ? 2.0 : Number.POSITIVE_INFINITY;

    memoryMap.set(letter, {
      ...node,
      interval: nextInterval,
      easeFactor: Math.min(easeCap, node.easeFactor + 0.1),
      nextDue: now + toMs(nextInterval)
    });
    return;
  }

  if (result === 'wrong') {
    const nextEase = Math.max(1.6, node.easeFactor - 0.2);
    memoryMap.set(letter, {
      ...node,
      interval: 15,
      easeFactor: nextEase,
      lapseCount: node.lapseCount + 1,
      nextDue: now + toMs(15)
    });
    return;
  }

  const nextEase = Math.max(1.5, node.easeFactor - 0.3);
  memoryMap.set(letter, {
    ...node,
    interval: 8,
    easeFactor: nextEase,
    lapseCount: node.lapseCount + 2,
    nextDue: now + toMs(8)
  });
}

export function pickScheduledLetter(
  letters: string[],
  previousLetter: string | undefined,
  allowRepeat: boolean,
  curse: number
): string {
  if (letters.length === 0) throw new Error('letter pool is empty');

  const now = nowMs();
  letters.forEach((letter) => {
    getMemoryNode(letter);
  });

  accelerateForCurse(curse, now);

  const candidates = allowRepeat || letters.length === 1 || !previousLetter
    ? letters
    : letters.filter((letter) => letter !== previousLetter);

  const scoped = candidates.length > 0 ? candidates : letters;
  const dueLetters = scoped.filter((letter) => getMemoryNode(letter).nextDue <= now);

  if (dueLetters.length > 0) {
    return dueLetters[Math.floor(Math.random() * dueLetters.length)];
  }

  return scoped.reduce((earliest, letter) => {
    const currentNode = getMemoryNode(letter);
    const earliestNode = getMemoryNode(earliest);
    return currentNode.nextDue < earliestNode.nextDue ? letter : earliest;
  }, scoped[0]);
}
