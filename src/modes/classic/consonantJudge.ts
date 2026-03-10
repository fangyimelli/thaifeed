import type { NightNode } from '../../ssot/sandbox_story/types';
import { judgeConsonantAnswer as judgeSharedConsonantAnswer, normalizeInput as normalizeSharedInput, parseConsonantAnswer } from '../../shared/consonant-engine';

export type ThaiConsonantParseResult = {
  ok: boolean;
  normalized: string;
  matchedAlias: string;
  matchedConsonant: string;
};

export function normalizeInput(raw: string): string {
  return normalizeSharedInput(raw);
}

export function parseThaiConsonant(raw: string, _input: { nodeChar: string; node?: NightNode }): ThaiConsonantParseResult {
  const parsed = parseConsonantAnswer(raw);
  return {
    ok: parsed.parsed,
    normalized: parsed.normalized,
    matchedAlias: parsed.matchedAlias,
    matchedConsonant: parsed.matchedConsonant ?? ''
  };
}

export function judgeConsonantAnswer(parsed: ThaiConsonantParseResult, input: { nodeChar: string; node?: NightNode }): 'correct' | 'wrong_format' | 'wrong_answer' {
  const judged = judgeSharedConsonantAnswer(
    {
      normalized: parsed.normalized,
      parsed: parsed.ok,
      matchedQuestionId: null,
      matchedConsonant: parsed.matchedConsonant || null,
      matchedAlias: parsed.matchedAlias
    },
    { questionId: input.node?.id ?? 'legacy', consonant: input.nodeChar }
  );
  return judged.type;
}
