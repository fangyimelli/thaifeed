import type { NightNode } from '../../ssot/sandbox_story/types';

type PromptInput = { nodeChar: string; node?: NightNode; activeUser: string };

type ParseJudgeInput = PromptInput;

type JudgeResult = 'correct' | 'wrong' | 'unknown';

export function getClassicConsonantPrompt(input: PromptInput) {
  return {
    promptText: `@${input.activeUser} 子音題：${input.nodeChar}`
  };
}

export function parseAndJudgeUsingClassic(raw: string, input: ParseJudgeInput): { parsed: string; result: JudgeResult } {
  const normalized = raw.trim();
  if (!normalized) return { parsed: normalized, result: 'unknown' };
  if (normalized === input.nodeChar || input.node?.correctKeywords?.includes(normalized)) {
    return { parsed: normalized, result: 'correct' };
  }
  if (['不知道', '不知', 'ไม่รู้'].includes(normalized)) {
    return { parsed: normalized, result: 'unknown' };
  }
  return { parsed: normalized, result: 'wrong' };
}
