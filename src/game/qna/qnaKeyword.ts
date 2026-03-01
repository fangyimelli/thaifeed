import type { QnaOption } from './qnaTypes';

export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/[\s，。！？,.!?:：;；]+/g, ' ');
}

export function matchOptions(text: string, options: QnaOption[]): { option: QnaOption; keyword: string } | null {
  const normalized = normalize(text);
  const unknown = options.filter((option) => option.id === 'UNKNOWN');
  const regular = options.filter((option) => option.id !== 'UNKNOWN');
  const ordered = [...unknown, ...regular];
  for (const option of ordered) {
    for (const keyword of option.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (!normalizedKeyword) continue;
      if (normalized.includes(normalizedKeyword)) {
        return { option, keyword };
      }
    }
  }
  return null;
}
