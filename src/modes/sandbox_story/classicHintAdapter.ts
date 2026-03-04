import type { WordNode } from '../../ssot/sandbox_story/types';
import { getHintForConsonantPrompt } from './classicConsonantAdapter';

export function getSandboxConsonantHint(params: { nodeChar: string; node?: WordNode | null; activeUser?: string }): string {
  return getHintForConsonantPrompt(params);
}
