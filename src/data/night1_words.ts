import { SHARED_CONSONANT_QUESTION_BANK } from '../shared/consonant-engine';
import { SANDBOX_CONSONANT_WORD_MAP } from '../modes/sandbox_story/sandboxConsonantWordMap';

export type Night1WordEntry = {
  consonant: string;
  correctKeywords: string[];
  unknownKeywords: string[];
  wordText: string;
  hintAppend?: string;
  hintAppendPrefixLen?: number;
  audioKey: string;
  comprehension: {
    question: string;
    options: string[];
    correct: string;
    keyword: string;
    unknown: string;
  };
  talkSeeds: {
    related: string[];
    surprise: string[];
    guess: string[];
  };
};

const UNKNOWN_KEYWORDS = ['不知道', '不知', '不確定', '不知道欸', 'ไม่รู้'];

const SANDBOX_MAP_BY_QUESTION = new Map(SANDBOX_CONSONANT_WORD_MAP.map((entry) => [entry.questionId, entry]));

export const NIGHT1_WORDS: Night1WordEntry[] = SHARED_CONSONANT_QUESTION_BANK.map((q, index) => {
  const mappedWord = SANDBOX_MAP_BY_QUESTION.get(q.questionId);
  if (!mappedWord) {
    throw new Error(`sandbox word mapping missing for questionId: ${q.questionId}`);
  }
  const questionNo = index + 1;
  return {
    consonant: q.consonant,
    correctKeywords: [q.consonant],
    unknownKeywords: UNKNOWN_KEYWORDS,
    wordText: mappedWord.thaiWord,
    hintAppendPrefixLen: 2,
    audioKey: mappedWord.audioKey,
    comprehension: {
      question: `第${questionNo}題線索：你覺得這個詞在故事裡代表什麼？`,
      options: [mappedWord.translationZh, '不知道'],
      correct: mappedWord.translationZh,
      keyword: mappedWord.translationZh,
      unknown: '不知道'
    },
    talkSeeds: {
      related: [`我查到是「${mappedWord.translationZh}」`, `這塊像在指向「${mappedWord.translationZh}」`],
      surprise: ['欸欸欸剛剛那個發音有點毛', '聊天室氣氛突然不對'],
      guess: ['這線索感覺還沒講完', '先記著，後面可能會回來']
    }
  };
});
