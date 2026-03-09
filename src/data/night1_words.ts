import { NIGHT_01_QUESTION_BANK } from '../shared/questionBank/night01QuestionBank';

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

export const NIGHT1_WORDS: Night1WordEntry[] = NIGHT_01_QUESTION_BANK.map((q) => ({
  consonant: q.consonant,
  correctKeywords: q.correctKeywords,
  unknownKeywords: q.unknownKeywords,
  wordText: q.thaiWord,
  hintAppendPrefixLen: 2,
  audioKey: q.audioKey,
  comprehension: {
    question: `第${q.index}題線索：你覺得這個詞在故事裡代表什麼？`,
    options: [q.translationZh, '不知道'],
    correct: q.translationZh,
    keyword: q.translationZh,
    unknown: '不知道'
  },
  talkSeeds: {
    related: [`我查到是「${q.translationZh}」`, `這塊像在指向「${q.translationZh}」`],
    surprise: ['欸欸欸剛剛那個發音有點毛', '聊天室氣氛突然不對'],
    guess: ['這線索感覺還沒講完', '先記著，後面可能會回來']
  }
}));
