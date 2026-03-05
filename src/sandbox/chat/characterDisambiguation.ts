const FULLWIDTH_START = 0xff01;
const FULLWIDTH_END = 0xff5e;
const FULLWIDTH_OFFSET = 0xfee0;

const COMMON_PUNCTUATION_RE = /[\s\u3000`~!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>/?，。！？、；：「」『』（）〔〕【】《》〈〉…—～]+/gu;

const CATEGORY_SYNONYMS: Record<'woman' | 'girl' | 'boy', string[]> = {
  woman: ['媽媽', '母親', '女人', '女主人', '阿姨', '太太'],
  girl: ['女孩', '小女孩', '姐姐', '姊姊', '女兒'],
  boy: ['男孩', '弟弟', '哥哥', '兒子', '小男孩', '孩子']
};

const normalize = (input: string): string => {
  const folded = Array.from(input || '').map((char) => {
    const code = char.charCodeAt(0);
    if (code >= FULLWIDTH_START && code <= FULLWIDTH_END) {
      return String.fromCharCode(code - FULLWIDTH_OFFSET);
    }
    return char;
  }).join('');
  return folded
    .toLowerCase()
    .replace(COMMON_PUNCTUATION_RE, '');
};

const synonymMap = new Map<string, 'woman' | 'girl' | 'boy'>();
(Object.entries(CATEGORY_SYNONYMS) as Array<['woman' | 'girl' | 'boy', string[]]>).forEach(([category, values]) => {
  values.forEach((value) => {
    synonymMap.set(normalize(value), category);
  });
});

const matchCategory = (text: string): 'woman' | 'girl' | 'boy' | null => {
  const norm = normalize(text);
  if (!norm) return null;
  return synonymMap.get(norm) ?? null;
};

export const characterDisambiguation = {
  normalize,
  matchCategory
};
