import thaiConsonants from '../../content/thaiConsonants.json';
import { pickScheduledLetter } from '../adaptive/memoryScheduler';

export type ThaiConsonant = (typeof thaiConsonants)[number];

export const consonantPool = thaiConsonants as ThaiConsonant[];

function findConsonant(letter: string): ThaiConsonant {
  const found = consonantPool.find((item) => item.letter === letter);
  if (!found) throw new Error(`consonant not found for letter: ${letter}`);
  return found;
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
