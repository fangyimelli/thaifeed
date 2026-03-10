import type { NightNode } from '../../ssot/sandbox_story/types';
import consonantAliasesCommon from '../../content/pools/consonantAliasesCommon.json';

type CommonAliasEntry = {
  letter: string;
  roman?: string[];
  bopomofo?: string[];
};

const COMMON_ALIAS_MAP = new Map<string, CommonAliasEntry>(
  (consonantAliasesCommon as CommonAliasEntry[]).map((item) => [item.letter, item])
);

export type ThaiConsonantParseResult = {
  ok: boolean;
  normalized: string;
  matchedAlias: string;
};

export function normalizeInput(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/^(?:[\s　]*@[^\s　]+[\s　]*)+/u, '')
    .replace(/[\s　]+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .trim();
}

function buildAliasSet(input: { nodeChar: string; node?: NightNode }) {
  const aliases = new Set<string>();
  aliases.add(input.nodeChar);
  const commonAlias = COMMON_ALIAS_MAP.get(input.nodeChar);
  (commonAlias?.roman ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  (commonAlias?.bopomofo ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  (input.node?.correctKeywords ?? []).forEach((item) => aliases.add(normalizeInput(item)));
  (input.node?.unknownKeywords ?? ['不知道', '不知', 'ไม่รู้', '不會']).forEach((item) => aliases.add(normalizeInput(item)));
  return aliases;
}

export function parseThaiConsonant(rawNormalized: string, input: { nodeChar: string; node?: NightNode }): ThaiConsonantParseResult {
  const normalized = normalizeInput(rawNormalized);
  if (!normalized) return { ok: false, normalized, matchedAlias: '' };
  const aliases = buildAliasSet(input);
  if (!aliases.has(normalized)) {
    return { ok: false, normalized, matchedAlias: '' };
  }
  return { ok: true, normalized, matchedAlias: normalized };
}

export function judgeConsonantAnswer(parsed: ThaiConsonantParseResult, input: { nodeChar: string; node?: NightNode }): 'correct' | 'wrong_format' | 'unknown' {
  if (!parsed.ok) {
    return 'wrong_format';
  }
  const unknownKeywords = new Set((input.node?.unknownKeywords ?? ['不知道', '不知', 'ไม่รู้', '不會']).map((item) => normalizeInput(item)));
  if (unknownKeywords.has(parsed.normalized)) {
    return 'unknown';
  }
  return 'correct';
}
