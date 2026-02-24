export function normalizeInputForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s]/g, '')
    .replace(/[.,!?()\[\]{}"'，。！？（）【】]/g, '')
    .replace(/[ˊˇˋ˙]/g, '');
}

