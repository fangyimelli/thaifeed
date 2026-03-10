import consonantAliasesCommon from '../../content/pools/consonantAliasesCommon.json';
import { SHARED_CONSONANT_QUESTION_BANK } from './questionBank';
import type { ConsonantJudgeResult, ConsonantParseResult, SharedConsonantQuestion } from './types';

type AliasEntry = {
  letter: string;
  roman?: string[];
  bopomofo?: string[];
};

const ALIAS_BY_CONSONANT = new Map<string, AliasEntry>(
  (consonantAliasesCommon as AliasEntry[]).map((item) => [item.letter, item])
);

const QUESTION_BY_ID = new Map(SHARED_CONSONANT_QUESTION_BANK.map((question) => [question.questionId, question]));

function buildAcceptedAliasSet(question: SharedConsonantQuestion): Set<string> {
  const aliases = new Set<string>();
  aliases.add(normalizeInput(question.consonant));
  const common = ALIAS_BY_CONSONANT.get(question.consonant);
  (common?.roman ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  (common?.bopomofo ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  (question.acceptedAnswers ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  (question.aliases ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  return aliases;
}

export function getAcceptedAliasCandidatesForQuestion(question: SharedConsonantQuestion | undefined): string[] {
  if (!question) return [];
  return Array.from(buildAcceptedAliasSet(question)).filter(Boolean);
}

const ALL_ALIAS_TO_CONSONANT = new Map<string, string>();
for (const question of SHARED_CONSONANT_QUESTION_BANK) {
  for (const alias of buildAcceptedAliasSet(question)) {
    if (!alias) continue;
    if (!ALL_ALIAS_TO_CONSONANT.has(alias)) {
      ALL_ALIAS_TO_CONSONANT.set(alias, question.consonant);
    }
  }
}

export function normalizeInput(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/^(?:[\s　]*@[^\s　]+[\s　]*)+/u, '')
    .replace(/[\s　]+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .trim();
}

export function getSharedConsonantQuestionById(questionId: string): SharedConsonantQuestion | undefined {
  return QUESTION_BY_ID.get(questionId);
}

export function getAcceptedAliasCandidates(input: { questionId?: string; consonant?: string }): string[] {
  const byId = input.questionId ? getSharedConsonantQuestionById(input.questionId) : undefined;
  const question = byId ?? SHARED_CONSONANT_QUESTION_BANK.find((item) => item.consonant === input.consonant);
  return getAcceptedAliasCandidatesForQuestion(question);
}

export function parseConsonantAnswer(raw: string): ConsonantParseResult {
  const normalized = normalizeInput(raw);
  if (!normalized) {
    return { normalized, parsed: false, matchedQuestionId: null, matchedConsonant: null, matchedAlias: '' };
  }
  const matchedConsonant = ALL_ALIAS_TO_CONSONANT.get(normalized) ?? null;
  if (!matchedConsonant) {
    return { normalized, parsed: false, matchedQuestionId: null, matchedConsonant: null, matchedAlias: '' };
  }
  const matchedQuestion = SHARED_CONSONANT_QUESTION_BANK.find((question) => question.consonant === matchedConsonant) ?? null;
  return {
    normalized,
    parsed: true,
    matchedQuestionId: matchedQuestion?.questionId ?? null,
    matchedConsonant,
    matchedAlias: normalized
  };
}

export function judgeConsonantAnswer(parsed: ConsonantParseResult, target: { questionId: string; consonant: string }): ConsonantJudgeResult {
  if (!parsed.parsed || !parsed.matchedConsonant) {
    return { type: 'wrong_format', parsed };
  }
  if (parsed.matchedConsonant !== target.consonant) {
    return { type: 'wrong_answer', parsed };
  }
  return { type: 'correct', parsed };
}
