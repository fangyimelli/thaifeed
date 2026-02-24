export function normalizeInputForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/[ˊˇˋ˙]/g, '');
}
