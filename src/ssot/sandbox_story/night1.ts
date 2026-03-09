import { NIGHT_01_QUESTION_BANK } from '../../shared/questionBank/night01QuestionBank';
import type { NightScript } from './types';

export const NIGHT1: NightScript = {
  meta: {
    id: 'NIGHT_01',
    title: '誰在等',
    version: '2.0.0'
  },
  nodes: NIGHT_01_QUESTION_BANK.map((q) => ({
    id: q.id,
    char: q.consonant,
    wordText: q.thaiWord,
    word: q.thaiWord,
    translationZh: q.translationZh,
    audioKey: q.audioKey,
    correctKeywords: q.correctKeywords,
    unknownKeywords: q.unknownKeywords
  }))
};
