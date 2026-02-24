import { normalizeInput } from './answerParser';

const speechKeywordGroups = [
  ['好可怕', '超可怕', '好恐怖', '很恐怖', '怕爆'],
  ['哪裡有', '在哪', '哪一邊', '在哪邊', '在哪裡'],
  ['真假', '真的假的', '真的假的啦'],
  ['別鬧', '不要鬧'],
  ['不要嚇我', '別嚇我'],
  ['你們看到嗎', '你們有看到嗎'],
  ['剛剛有嗎', '剛剛是不是有'],
  ['是我看錯嗎', '我看錯嗎'],
  ['那是什麼', '那啥', '那是啥'],
  ['有東西嗎', '那邊有東西嗎'],
  ['我不敢看', '不敢看了'],
  ['我雞皮疙瘩', '雞皮疙瘩起來了'],
  ['空氣怪怪的', '氣氛怪怪的'],
  ['這裡有問題', '這邊有問題'],
  ['有人嗎', '這裡有人嗎']
].map((group) => group.map(normalizeInput));

export function parsePlayerSpeech(input: string): string[] | null {
  const normalized = normalizeInput(input);
  if (!normalized) return null;

  for (const group of speechKeywordGroups) {
    if (group.some((keyword) => normalized.includes(keyword))) return group;
  }

  return null;
}
