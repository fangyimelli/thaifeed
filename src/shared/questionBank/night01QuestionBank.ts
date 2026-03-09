export type SharedConsonantQuestion = {
  id: string;
  index: number;
  consonant: string;
  thaiWord: string;
  translationZh: string;
  audioKey: string;
  correctKeywords: string[];
  unknownKeywords: string[];
};

const UNKNOWN_KEYWORDS = ['不知道', '不知', '不確定', '不知道欸', 'ไม่รู้'];

export const NIGHT_01_QUESTION_BANK: SharedConsonantQuestion[] = [
  { id: 'n01_q01_wait', index: 1, consonant: 'ร', thaiWord: 'รอ', translationZh: '等', audioKey: 'ror', correctKeywords: ['ร'] , unknownKeywords: UNKNOWN_KEYWORDS},
  { id: 'n01_q02_house', index: 2, consonant: 'บ', thaiWord: 'บ้าน', translationZh: '房子', audioKey: 'baan', correctKeywords: ['บ'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q03_child', index: 3, consonant: 'ด', thaiWord: 'เด็ก', translationZh: '孩子', audioKey: 'dek', correctKeywords: ['ด'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q04_night', index: 4, consonant: 'ก', thaiWord: 'กลางคืน', translationZh: '夜晚', audioKey: 'klang_kuen', correctKeywords: ['ก'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q05_door', index: 5, consonant: 'ป', thaiWord: 'ประตู', translationZh: '門', audioKey: 'pratu', correctKeywords: ['ป'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q06_sound', index: 6, consonant: 'ส', thaiWord: 'เสียง', translationZh: '聲音', audioKey: 'siang', correctKeywords: ['ส'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q07_wind', index: 7, consonant: 'ล', thaiWord: 'ลม', translationZh: '風', audioKey: 'lom', correctKeywords: ['ล'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q08_return', index: 8, consonant: 'ก', thaiWord: 'กลับ', translationZh: '回來', audioKey: 'klap', correctKeywords: ['ก'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q09_why', index: 9, consonant: 'ท', thaiWord: 'ทำไม', translationZh: '為什麼', audioKey: 'thammai', correctKeywords: ['ท'], unknownKeywords: UNKNOWN_KEYWORDS },
  { id: 'n01_q10_turn', index: 10, consonant: 'ห', thaiWord: 'หัน', translationZh: '轉頭', audioKey: 'han', correctKeywords: ['ห'], unknownKeywords: UNKNOWN_KEYWORDS }
];
