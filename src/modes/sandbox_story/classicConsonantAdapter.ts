import type { WordNode } from '../../ssot/sandbox_story/types';
import { buildConsonantHint } from '../../shared/hints/consonantHint';

export type ClassicConsonantContext = {
  nodeChar: string;
  node?: WordNode | null;
  activeUser?: string;
};

export type ClassicConsonantJudgeResult = 'correct' | 'wrong' | 'unknown' | 'pass';

const BOPOMOFO_RE = /[\u3100-\u312F\u02C7\u02CA\u02CB\u02D9]/u;
const THAI_RE = /[\u0E00-\u0E7F]/u;
const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;

export type SandboxInputNormalizeResult = {
  raw: string;
  norm: string;
  compact: string;
  allowedSetsHit: {
    latin: boolean;
    bopomofo: boolean;
    thai: boolean;
    cjk: boolean;
  };
};

export function normalizeSandboxConsonantInput(raw: string): SandboxInputNormalizeResult {
  const norm = raw
    .replace(/\u3000/g, ' ')
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const compact = norm.toLowerCase().replace(/\s+/g, '');
  return {
    raw,
    norm,
    compact,
    allowedSetsHit: {
      latin: /[a-z]/i.test(norm),
      bopomofo: BOPOMOFO_RE.test(norm),
      thai: THAI_RE.test(norm),
      cjk: CJK_RE.test(norm)
    }
  };
}

const toCompact = (value: string): string => value.toLowerCase().replace(/\u3000/g, ' ').replace(/\s+/g, '');

export function getClassicConsonantPrompt(ctx: ClassicConsonantContext): { promptText: string; expectedChar?: string; meta?: any } {
  const expected = ctx.node?.correctKeywords?.[0] ?? ctx.nodeChar;
  const user = (ctx.activeUser || 'you').replace(/^@+/, '');
  const promptText = `@${user} 請回覆本題子音（直接輸入：${expected}），或回覆：不知道`;
  return {
    promptText,
    expectedChar: ctx.nodeChar,
    meta: {
      source: 'sandbox_story_consonant_qna'
    }
  };
}

export function tryParseClassicConsonantAnswer(input: string, ctx: ClassicConsonantContext): {
  ok: boolean;
  matchedChar?: string;
  debug?: { kind?: string; matchedAlias?: string; inputNorm?: string; inputRaw?: string; matched?: string; blockedReason?: string; normalize?: SandboxInputNormalizeResult };
} {
  const normalize = normalizeSandboxConsonantInput(input);
  const keywords = (ctx.node?.correctKeywords ?? [ctx.nodeChar]).map((k) => toCompact(k));
  const passKeywords = ['pass', 'skip', 'p'];
  if (passKeywords.includes(normalize.compact)) {
    return {
      ok: false,
      debug: {
        kind: 'pass',
        matchedAlias: '',
        inputNorm: normalize.norm,
        matched: 'pass',
        blockedReason: '',
        normalize
      }
    };
  }
  const matchedKeyword = keywords.find((token) => token && (normalize.compact === token || normalize.compact.includes(token)));
  const aliasCandidates = [
    { token: 'a', matched: 'A' },
    { token: '1', matched: 'A' },
    { token: 'b', matched: 'B' },
    { token: '2', matched: 'B' },
    { token: 'c', matched: 'C' },
    { token: '3', matched: 'C' }
  ];
  const matchedAlias = aliasCandidates.find((entry) => normalize.compact === entry.token);
  const keywordByAlias = matchedAlias
    ? (ctx.node?.correctKeywords ?? [ctx.nodeChar])[['A', 'B', 'C'].indexOf(matchedAlias.matched)]
    : '';
  const isMatched = Boolean(matchedKeyword || (matchedAlias && keywordByAlias));
  return {
    ok: isMatched,
    matchedChar: isMatched ? ctx.nodeChar : undefined,
    debug: {
      kind: isMatched ? (matchedAlias ? 'option_alias' : 'keyword') : 'none',
      matchedAlias: matchedKeyword ?? keywordByAlias ?? '',
      inputNorm: normalize.norm,
      matched: matchedAlias?.matched ?? (matchedKeyword ? 'keyword' : ''),
      blockedReason: normalize.norm ? '' : 'input_sanitized_to_empty',
      normalize
    }
  };
}

export function judgeClassicConsonantAnswer(input: string, ctx: ClassicConsonantContext): 'correct' | 'wrong' | 'unknown' | 'pass' {
  const normalized = normalizeSandboxConsonantInput(input);
  const compact = normalized.compact;
  const unknownKeywords = (ctx.node?.unknownKeywords ?? ['不知道', '不知', '不確定', 'idk', '不知道欸', '?', '？']).map((k) => toCompact(k));
  if (compact === '?' || compact === '？') return 'unknown';
  if (unknownKeywords.some((token) => token && (compact === token || compact.includes(token)))) return 'unknown';
  if (compact === 'pass' || compact === 'skip' || compact === 'p') return 'pass';
  const parsed = tryParseClassicConsonantAnswer(input, ctx);
  if (parsed.ok) return 'correct';
  return compact ? 'wrong' : 'wrong';
}

export function parseAndJudgeUsingClassic(input: string, ctx: ClassicConsonantContext): {
  parsed: ReturnType<typeof tryParseClassicConsonantAnswer>;
  result: ClassicConsonantJudgeResult;
  hintText?: string;
  debugMeta: {
    source: 'classic_consonant_core';
    parityChecked: true;
  };
} {
  const parsed = tryParseClassicConsonantAnswer(input, ctx);
  const result = judgeClassicConsonantAnswer(input, ctx);
  const hintText = result === 'unknown' ? getHintForConsonantPrompt(ctx) : undefined;
  return {
    parsed,
    result,
    hintText,
    debugMeta: {
      source: 'classic_consonant_core',
      parityChecked: true
    }
  };
}

export function getHintForConsonantPrompt(ctx: ClassicConsonantContext): string {
  const expected = ctx.node?.correctKeywords?.[0] ?? ctx.nodeChar;
  const aliases = (ctx.node?.correctKeywords ?? [ctx.nodeChar]).filter(Boolean);
  return buildConsonantHint({ expected, aliases });
}
