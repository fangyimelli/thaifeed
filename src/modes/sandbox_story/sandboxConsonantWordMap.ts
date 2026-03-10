import type { NightNode } from '../../ssot/sandbox_story/types';

export type SandboxConsonantWordMapEntry = {
  questionId: string;
  wordKey: string;
  thaiWord: string;
  translationZh: string;
  audioKey: string;
};

export const SANDBOX_CONSONANT_WORD_MAP: SandboxConsonantWordMapEntry[] = [
  { questionId: 'n01_q01_wait', wordKey: 'n01_q01_wait', thaiWord: 'รอ', translationZh: '等', audioKey: 'ror' },
  { questionId: 'n01_q02_house', wordKey: 'n01_q02_house', thaiWord: 'บ้าน', translationZh: '房子', audioKey: 'baan' },
  { questionId: 'n01_q03_child', wordKey: 'n01_q03_child', thaiWord: 'เด็ก', translationZh: '孩子', audioKey: 'dek' },
  { questionId: 'n01_q04_night', wordKey: 'n01_q04_night', thaiWord: 'กลางคืน', translationZh: '夜晚', audioKey: 'klang_kuen' },
  { questionId: 'n01_q05_door', wordKey: 'n01_q05_door', thaiWord: 'ประตู', translationZh: '門', audioKey: 'pratu' },
  { questionId: 'n01_q06_sound', wordKey: 'n01_q06_sound', thaiWord: 'เสียง', translationZh: '聲音', audioKey: 'siang' },
  { questionId: 'n01_q07_wind', wordKey: 'n01_q07_wind', thaiWord: 'ลม', translationZh: '風', audioKey: 'lom' },
  { questionId: 'n01_q08_return', wordKey: 'n01_q08_return', thaiWord: 'กลับ', translationZh: '回來', audioKey: 'klap' },
  { questionId: 'n01_q09_why', wordKey: 'n01_q09_why', thaiWord: 'ทำไม', translationZh: '為什麼', audioKey: 'thammai' },
  { questionId: 'n01_q10_turn', wordKey: 'n01_q10_turn', thaiWord: 'หัน', translationZh: '轉頭', audioKey: 'han' }
];

const DEFAULT_KEYWORDS = ['不知道', '不知', '不確定', '不知道欸', 'ไม่รู้'];

export function buildSandboxNightNodes(questionConsonants: Array<{ questionId: string; consonant: string }>): NightNode[] {
  const mapByQuestionId = new Map(SANDBOX_CONSONANT_WORD_MAP.map((item) => [item.questionId, item]));
  return questionConsonants.map((question) => {
    const mapping = mapByQuestionId.get(question.questionId);
    if (!mapping) {
      throw new Error(`sandbox word mapping missing for questionId: ${question.questionId}`);
    }
    return {
      id: mapping.wordKey,
      char: question.consonant,
      wordText: mapping.thaiWord,
      word: mapping.thaiWord,
      translationZh: mapping.translationZh,
      audioKey: mapping.audioKey,
      correctKeywords: [question.consonant],
      unknownKeywords: DEFAULT_KEYWORDS
    };
  });
}
