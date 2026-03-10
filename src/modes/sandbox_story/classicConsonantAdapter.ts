import type { NightNode } from '../../ssot/sandbox_story/types';
import { judgeConsonantAnswer, normalizeInput, parseThaiConsonant } from '../classic/consonantJudge';

type PromptInput = { nodeChar: string; node?: NightNode; activeUser: string };

type ParseJudgeInput = PromptInput;

type JudgeResult = 'correct' | 'wrong_format' | 'unknown';

export function getClassicConsonantPrompt(input: PromptInput) {
  return {
    promptText: `@${input.activeUser} 子音題：${input.nodeChar}`
  };
}

export function parseAndJudgeUsingClassic(raw: string, input: ParseJudgeInput): { parsed: string; result: JudgeResult } {
  const normalized = normalizeInput(raw);
  const parsed = parseThaiConsonant(normalized, input);
  const result = judgeConsonantAnswer(parsed, input);
  return { parsed: parsed.normalized, result };
}
