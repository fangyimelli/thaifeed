import thaiConsonants from '../../content/thaiConsonants.json';
import commonConsonantPool from '../../content/pools/consonantPoolCommon.json';
import { pickScheduledLetter } from '../adaptive/memoryScheduler';

export type ThaiConsonant = (typeof thaiConsonants)[number];

const consonantMap = new Map((thaiConsonants as ThaiConsonant[]).map((item) => [item.letter, item]));
const commonLetterSet = new Set(commonConsonantPool);

export const consonantPool = (thaiConsonants as ThaiConsonant[]).filter(
  (item) => item.isCommon && commonLetterSet.has(item.letter)
);
const playableLetterSet = new Set(consonantPool.map((item) => item.letter));

function randomFromCommonPool(): ThaiConsonant {
  if (consonantPool.length === 0) throw new Error('thai consonant pool is empty');
  return consonantPool[Math.floor(Math.random() * consonantPool.length)];
}

function findConsonant(letter: string): ThaiConsonant {
  const found = consonantMap.get(letter);
  if (!found) throw new Error(`consonant not found for letter: ${letter}`);
  return found;
}

export function isCommonConsonantLetter(letter: string): boolean {
  return playableLetterSet.has(letter);
}

export function resolvePlayableConsonant(letter?: string): ThaiConsonant {
  if (!letter || !isCommonConsonantLetter(letter)) {
    return randomFromCommonPool();
  }
  return findConsonant(letter);
}

export function getNextConsonant(
  previousLetter?: string,
  allowRepeat = true,
  curse = 0
): ThaiConsonant {
  if (consonantPool.length === 0) throw new Error('thai consonant pool is empty');

  const nextLetter = pickScheduledLetter(
    consonantPool.map((item) => item.letter),
    previousLetter,
    allowRepeat,
    curse
  );

  return findConsonant(nextLetter);
}

export const pickRandomConsonant = getNextConsonant;
