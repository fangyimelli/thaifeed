import consonantAliases from '../../content/aliases/consonantAliases.json';

const fullWidthAsciiRegex = /[！-～]/g;
const fullWidthSpaceRegex = /\u3000/g;
const removablePunctuationRegex = /[,.!?()\[\]{}"'，。！？（）［］｛｝「」『』【】‘’“”]/g;
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const bopomofoRegex = /[\u3100-\u312F\u31A0-\u31BF]/;
const asciiWordRegex = /^[a-z]+$/;

function toHalfWidth(text: string) {
  return text
    .replace(fullWidthSpaceRegex, ' ')
    .replace(fullWidthAsciiRegex, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

export function normalizeInputForMatch(raw: string) {
  return toHalfWidth(raw)
    .trim()
    .toLowerCase()
    .replace(emojiRegex, '')
    .replace(removablePunctuationRegex, '')
    .replace(/\s+/g, '');
}

export function matchAnswerContains(normalizedInput: string, targetConsonant: string) {
  const aliases = (consonantAliases[targetConsonant as keyof typeof consonantAliases] ?? [])
    .map((alias) => normalizeInputForMatch(alias))
    .filter(Boolean);

  const letter = normalizeInputForMatch(targetConsonant);
  const pinyin = aliases.filter((token) => asciiWordRegex.test(token) && token.length >= 2);
  const bopomofo = aliases.filter((token) => bopomofoRegex.test(token));

  return (
    (letter ? normalizedInput.includes(letter) : false) ||
    pinyin.some((token) => normalizedInput.includes(token)) ||
    bopomofo.some((token) => normalizedInput.includes(token))
  );
}
