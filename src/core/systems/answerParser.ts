import type { ThaiConsonant } from './consonantSelector';

export function normalizeInput(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export function isAnswerCorrect(raw: string, targetConsonant: ThaiConsonant) {
  const normalized = normalizeInput(raw);
  if (!normalized) return false;

  if (normalized === normalizeInput(targetConsonant.letter)) return true;
  if (targetConsonant.pinyin.some((item) => normalizeInput(item) === normalized)) return true;
  return targetConsonant.bopomofo.some((item) => normalizeInput(item) === normalized);
}
