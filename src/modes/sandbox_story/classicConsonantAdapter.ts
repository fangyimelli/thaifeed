import type { NightNode } from '../../ssot/sandbox_story/types';
import { getAcceptedAliasCandidates, getSharedConsonantQuestionById, parseConsonantAnswer } from '../../shared/consonant-engine';
import { judgeConsonantAnswer, normalizeInput, parseThaiConsonant } from '../classic/consonantJudge';

type PromptInput = { nodeChar: string; node?: NightNode; activeUser: string };

type ParseJudgeInput = PromptInput;

type JudgeResult = 'correct' | 'wrong_format' | 'wrong_answer';

export function getClassicConsonantPrompt(input: PromptInput) {
  const sharedQuestion = input.node?.id ? getSharedConsonantQuestionById(input.node.id) : undefined;
  return {
    promptText: `@${input.activeUser} ${sharedQuestion?.promptText ?? `子音題：${input.nodeChar}`}`
  };
}

export function parseAndJudgeUsingClassic(raw: string, input: ParseJudgeInput): {
  parsed: string;
  result: JudgeResult;
  audit: {
    parse: {
      raw: string;
      normalized: string;
      kind: string;
      ok: boolean;
      blockReason: string;
      allowedKinds: string[];
      matchedAlias: string;
    };
    judge: {
      expectedConsonant: string;
      acceptedCandidates: string[];
      compareInput: string;
      compareMode: string;
      result: JudgeResult;
      resultReason: string;
    };
  };
} {
  const normalized = normalizeInput(raw);
  const parsed = parseThaiConsonant(normalized, input);
  const result = judgeConsonantAnswer(parsed, input);
  const parsedFromShared = parseConsonantAnswer(raw);
  const acceptedCandidates = getAcceptedAliasCandidates({ questionId: input.node?.id, consonant: input.nodeChar });
  return {
    parsed: parsed.normalized,
    result,
    audit: {
      parse: {
        raw,
        normalized: parsed.normalized,
        kind: parsedFromShared.parsed ? 'consonant_alias' : 'unknown',
        ok: parsedFromShared.parsed,
        blockReason: parsedFromShared.parsed ? '' : 'alias_not_found',
        allowedKinds: ['thai_char', 'roman_alias', 'bopomofo_alias', 'question_alias'],
        matchedAlias: parsedFromShared.matchedAlias
      },
      judge: {
        expectedConsonant: input.nodeChar,
        acceptedCandidates,
        compareInput: parsed.normalized,
        compareMode: 'normalized_alias_membership',
        result,
        resultReason: result
      }
    }
  };
}
