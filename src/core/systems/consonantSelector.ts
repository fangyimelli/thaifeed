import thaiConsonants from '../../content/thaiConsonants.json';
import consonantAliasesCommon from '../../content/pools/consonantAliasesCommon.json';
import { pickScheduledLetter } from '../adaptive/memoryScheduler';

type ThaiConsonantBase = (typeof thaiConsonants)[number];
type CommonAlias = (typeof consonantAliasesCommon)[number];

export type ThaiConsonant = ThaiConsonantBase & {
  pinyin: string[];
  bopomofo: string[];
  allowSingleLetter?: boolean;
};

const commonAliasMap = new Map((consonantAliasesCommon as CommonAlias[]).map((item) => [item.letter, item]));
const consonantMap = new Map(
  (thaiConsonants as ThaiConsonantBase[]).map((item) => {
    const alias = commonAliasMap.get(item.letter);
    return [
      item.letter,
      {
        ...item,
        pinyin: alias?.roman ?? item.pinyin,
        bopomofo: alias?.bopomofo ?? item.bopomofo,
        allowSingleLetter: alias?.allowSingleLetter
      } satisfies ThaiConsonant
    ];
  })
);
const commonLetterSet = new Set((consonantAliasesCommon as CommonAlias[]).map((item) => item.letter));

export const consonantPool = (thaiConsonants as ThaiConsonantBase[])
  .filter((item) => commonLetterSet.has(item.letter))
  .map((item) => findConsonant(item.letter));
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
