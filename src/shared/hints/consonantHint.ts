export function buildConsonantHint(params: { expected: string; aliases?: string[] }): string {
  const aliases = (params.aliases ?? []).filter(Boolean);
  const aliasHint = aliases.length > 1 ? `（可用：${aliases.join(' / ')}）` : '';
  return `提示：這題子音是「${params.expected}」${aliasHint}，請直接輸入子音；不確定可以回「不知道」。`;
}
