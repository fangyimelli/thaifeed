import { SHARED_CONSONANT_QUESTION_BANK } from '../../shared/consonant-engine';
import { buildSandboxNightNodes } from '../../modes/sandbox_story/sandboxConsonantWordMap';
import type { NightScript } from './types';

export const NIGHT1: NightScript = {
  meta: {
    id: 'NIGHT_01',
    title: '誰在等',
    version: '2.0.0'
  },
  nodes: buildSandboxNightNodes(
    SHARED_CONSONANT_QUESTION_BANK.map((question) => ({ questionId: question.questionId, consonant: question.consonant }))
  )
};
