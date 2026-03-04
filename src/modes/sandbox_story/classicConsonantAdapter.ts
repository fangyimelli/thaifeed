import { normalizeInputForMatch } from '../../utils/inputNormalize';
import type { WordNode } from '../../ssot/sandbox_story/types';

export type ClassicConsonantContext = {
  nodeChar: string;
  node?: WordNode | null;
  activeUser?: string;
};

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
  debug?: { kind?: string; matchedAlias?: string; inputNorm?: string };
} {
  const normalized = normalizeInputForMatch(input);
  const keywords = (ctx.node?.correctKeywords ?? [ctx.nodeChar]).map((k) => normalizeInputForMatch(k));
  const matched = keywords.find((token) => token && (normalized === token || normalized.includes(token)));
  return {
    ok: Boolean(matched),
    matchedChar: matched ? ctx.nodeChar : undefined,
    debug: {
      kind: matched ? 'keyword' : 'none',
      matchedAlias: matched ?? '',
      inputNorm: normalized
    }
  };
}

export function judgeClassicConsonantAnswer(input: string, ctx: ClassicConsonantContext): 'correct' | 'wrong' | 'unknown' {
  const normalized = normalizeInputForMatch(input);
  const unknownKeywords = (ctx.node?.unknownKeywords ?? ['不知道', '不知', '不知道欸']).map((k) => normalizeInputForMatch(k));
  if (unknownKeywords.some((token) => token && (normalized === token || normalized.includes(token)))) return 'unknown';
  const parsed = tryParseClassicConsonantAnswer(input, ctx);
  if (parsed.ok) return 'correct';
  return normalized ? 'wrong' : 'wrong';
}

export function getHintForConsonantPrompt(ctx: ClassicConsonantContext): string {
  const expected = ctx.node?.correctKeywords?.[0] ?? ctx.nodeChar;
  const aliases = (ctx.node?.correctKeywords ?? [ctx.nodeChar]).filter(Boolean);
  const aliasHint = aliases.length > 1 ? `（可用：${aliases.join(' / ')}）` : '';
  return `提示：這題子音是「${expected}」${aliasHint}，請直接輸入子音；不確定可以回「不知道」。`;
}
