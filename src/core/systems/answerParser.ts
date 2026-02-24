import type { ThaiConsonant } from './consonantSelector';
import { normalizeInputForMatch } from '../../utils/inputNormalize';

function includesToken(text: string, token: string): boolean {
  if (!token) return false;

  if (/^[a-z]+$/.test(token)) {
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z])${escapedToken}([^a-z]|$)`).test(text);
  }

  return text.includes(token);
}

function matchAnswerContains(normalized: string, consonant: ThaiConsonant): boolean {
  const singleLetterWhitelist = ['y'];

  if (normalized.includes(consonant.letter)) {
    return true;
  }

  for (const p of consonant.pinyin) {
    const token = p.toLowerCase();

    if (token.length === 1) {
      if (!singleLetterWhitelist.includes(token)) {
        continue;
      }

      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^a-z])${escapedToken}([^a-z]|$)`).test(normalized)) {
        return true;
      }

      continue;
    }

    if (includesToken(normalized, token)) {
      return true;
    }
  }

  for (const b of consonant.bopomofo) {
    if (normalized.includes(b)) {
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
