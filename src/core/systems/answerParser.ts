import consonantAliases from '../../content/aliases/consonantAliases.json';

export function parseAnswer(raw: string) {
  return raw.trim().toLowerCase();
}

export function isAnswerCorrect(raw: string, targetConsonant: string) {
  const normalized = parseAnswer(raw);
  const aliases = consonantAliases[targetConsonant as keyof typeof consonantAliases] ?? [];
  return aliases.map((alias) => alias.toLowerCase()).includes(normalized);
}
