import thaiConsonants from '../../content/thaiConsonants.json';

export type ThaiConsonant = (typeof thaiConsonants)[number];

export const consonantPool = thaiConsonants as ThaiConsonant[];

export function pickRandomConsonant(previousLetter?: string, allowRepeat = true): ThaiConsonant {
  if (consonantPool.length === 0) throw new Error('thai consonant pool is empty');
  if (allowRepeat || consonantPool.length === 1 || !previousLetter) {
    return consonantPool[Math.floor(Math.random() * consonantPool.length)];
  }

  const filtered = consonantPool.filter((item) => item.letter !== previousLetter);
  return filtered[Math.floor(Math.random() * filtered.length)];
}
