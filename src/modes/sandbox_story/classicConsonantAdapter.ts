import type { NightNode } from '../../ssot/sandbox_story/types';
import { getAcceptedAliasCandidates, getSharedConsonantQuestionById, parseConsonantAnswer } from '../../shared/consonant-engine';
import { judgeConsonantAnswer, normalizeInput, parseThaiConsonant } from '../classic/consonantJudge';

type PromptInput = { nodeChar: string; node?: NightNode; activeUser: string };

type ParseJudgeInput = PromptInput;

type JudgeResult = 'correct' | 'wrong_format' | 'wrong_answer';

const LEADING_MENTION = /^[\s\u3000]*[@＠]([^\s@,，。.!！？?、:：;；()\[\]{}"'「」『』]+)[\s\u3000]*/u;
const LEADING_REPLY_WRAPPER = /^[\s\u3000]*(?:回覆|回复|reply(?:ing)?\s*to|to)\s*[@＠]?([^\s\u3000:：]+)\s*[:：]?\s*/iu;
const INLINE_MENTION = /[@＠]([^\s@,，。.!！？?、:：;；()\[\]{}"'「」『』]+)/gu;

export function extractConsonantAnswerPayload(raw: string): { raw: string; mentions: string[]; stripped: string; normalized: string } {
  const mentions = Array.from(raw.matchAll(INLINE_MENTION)).map((match) => match[1] || '').filter(Boolean);
  let stripped = raw.trim();
  let changed = true;
  while (changed && stripped) {
    changed = false;
    const mentionMatch = stripped.match(LEADING_MENTION);
    if (mentionMatch) {
      stripped = stripped.slice(mentionMatch[0].length).trimStart();
      changed = true;
    }
    const wrapperMatch = stripped.match(LEADING_REPLY_WRAPPER);
    if (wrapperMatch) {
      stripped = stripped.slice(wrapperMatch[0].length).trimStart();
      changed = true;
    }
  }
  return {
    raw,
    mentions,
    stripped,
    normalized: normalizeInput(stripped)
  };
}

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
      mentions: string[];
      stripped: string;
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
  const extraction = extractConsonantAnswerPayload(raw);
  const parsed = parseThaiConsonant(extraction.stripped, input);
  const result = judgeConsonantAnswer(parsed, input);
  const parsedFromShared = parseConsonantAnswer(extraction.stripped);
  const acceptedCandidates = getAcceptedAliasCandidates({ questionId: input.node?.id, consonant: input.nodeChar });
  return {
    parsed: parsed.normalized,
    result,
    audit: {
      parse: {
        raw,
        mentions: extraction.mentions,
        stripped: extraction.stripped,
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
