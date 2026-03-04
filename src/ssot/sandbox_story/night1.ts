import { guessTemplates, relatedTalkTemplates, surpriseTemplates } from '../../data/chat_templates';
import { NIGHT1_WORDS } from '../../data/night1_words';
import type { NightScript } from './types';

export const NIGHT1: NightScript = {
  meta: {
    id: 'night1_attention',
    label: 'Night 1 - 注意力（民間傳說拼圖）',
    version: '2.0.0',
    locale: 'zh-TW'
  },
  nodes: NIGHT1_WORDS.map((entry, index) => ({
    id: `n1-node-${String(index + 1).padStart(3, '0')}`,
    char: entry.consonant,
    word: entry.wordText,
    wordText: entry.wordText,
    highlightChar: entry.consonant,
    audioKey: entry.audioKey,
    talkSeeds: entry.talkSeeds,
    comprehensionQuestion: {
      text: entry.comprehension.question,
      options: entry.comprehension.options.map((text, optionIndex) => ({ id: String(optionIndex + 1), text })),
      correctOptionId: String(entry.comprehension.options.indexOf(entry.comprehension.correct) + 1),
      keyword: entry.comprehension.keyword,
      unknownKeyword: entry.comprehension.unknown
    }
  })),
  chatTemplates: {
    relatedTalk: relatedTalkTemplates,
    surprise: surpriseTemplates,
    guess: guessTemplates
  }
};
