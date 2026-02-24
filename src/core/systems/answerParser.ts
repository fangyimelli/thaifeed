import type { ThaiConsonant } from './consonantSelector';
import { normalizeInputForMatch } from '../../utils/inputNormalize';

function includesSingleRomanBoundary(text: string, token: string): boolean {
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escapedToken}([^a-z]|$)`).test(text);
}

function matchAnswerContains(normalized: string, consonant: ThaiConsonant): boolean {
  if (normalized.includes(consonant.letter)) {
    return true;
  }

  for (const b of consonant.bopomofo) {
    if (normalized.includes(b)) {
      return true;
    }
  }

  const allowSingleLetter = Boolean(consonant.allowSingleLetter);

  for (const p of consonant.pinyin) {
    const token = p.toLowerCase();

    if (token.length >= 2 && normalized.includes(token)) {
      return true;
    }

    if (token.length === 1 && allowSingleLetter && includesSingleRomanBoundary(normalized, token)) {
      return true;
    }
  }

  return false;
}

export function isAnswerCorrect(raw: string, targetConsonant: ThaiConsonant) {
  const normalized = normalizeInputForMatch(raw);
  if (!normalized) return false;

  return matchAnswerContains(normalized, targetConsonant);
}
