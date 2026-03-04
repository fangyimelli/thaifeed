import { isAnswerCorrect } from '../../core/systems/answerParser';
import { resolvePlayableConsonant } from '../../core/systems/consonantSelector';
import { normalizeInputForMatch } from '../../utils/inputNormalize';
import type { WordNode } from '../../ssot/sandbox_story/types';

export type ClassicConsonantContext = {
  nodeChar: string;
  node?: WordNode | null;
};

export function getClassicConsonantPrompt(ctx: ClassicConsonantContext): { promptText: string; expectedChar?: string; meta?: any } {
  const consonant = resolvePlayableConsonant(ctx.nodeChar);
  const promptText = `@You 好像看到了某個子音…這個子音怎麼唸呢？（可用泰文/拼音/注音）`;
  return {
    promptText,
    expectedChar: consonant.letter,
    meta: {
      classicSource: 'src/core/state/reducer.ts initialState.messages[0]',
      consonantName: consonant.name_th
    }
  };
}

export function tryParseClassicConsonantAnswer(input: string, ctx: ClassicConsonantContext): {
  ok: boolean;
  matchedChar?: string;
  debug?: { kind?: string; matchedAlias?: string; inputNorm?: string };
} {
  const normalized = normalizeInputForMatch(input);
  const consonant = resolvePlayableConsonant(ctx.nodeChar);
  const ok = isAnswerCorrect(input, consonant);
  let kind = 'none';
  let matchedAlias = '';
  if (normalized.includes(consonant.letter)) {
    kind = 'thai';
    matchedAlias = consonant.letter;
  } else if (consonant.bopomofo.some((alias) => normalized.includes(alias))) {
    kind = 'bopomofo';
    matchedAlias = consonant.bopomofo.find((alias) => normalized.includes(alias)) ?? '';
  } else {
    const roman = consonant.pinyin.map((token) => token.toLowerCase());
    const token = roman.find((alias) => normalized.includes(alias));
    if (token) {
      kind = 'roman';
      matchedAlias = token;
    }
  }

  return {
    ok,
    matchedChar: ok ? consonant.letter : undefined,
    debug: {
      kind,
      matchedAlias,
      inputNorm: normalized
    }
  };
}
