import thaiConsonants from '../../content/thaiConsonants.json';
import { getUnfamiliarCount } from '../adaptive/unfamiliarStore';

export type ThaiConsonant = (typeof thaiConsonants)[number];

export const consonantPool = thaiConsonants as ThaiConsonant[];

function pickWeighted(pool: ThaiConsonant[]): ThaiConsonant {
  const totalWeight = pool.reduce((total, item) => total + 1 + getUnfamiliarCount(item.letter), 0);
  let threshold = Math.random() * totalWeight;

  for (const item of pool) {
    threshold -= 1 + getUnfamiliarCount(item.letter);
    if (threshold <= 0) return item;
  }

  return pool[pool.length - 1];
}

export function getNextConsonant(previousLetter?: string, allowRepeat = true): ThaiConsonant {
  if (consonantPool.length === 0) throw new Error('thai consonant pool is empty');
  if (allowRepeat || consonantPool.length === 1 || !previousLetter) {
    return pickWeighted(consonantPool);
  }

  const filtered = consonantPool.filter((item) => item.letter !== previousLetter);
  return pickWeighted(filtered);
}

export const pickRandomConsonant = getNextConsonant;
