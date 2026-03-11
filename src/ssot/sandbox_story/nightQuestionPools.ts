import type { NightNode, NightScript } from './types';

type PoolEntry = {
  questionId: string;
  expectedConsonant: string;
  revealWord: string;
  acceptedCandidates: string[];
};

const UNKNOWN_KEYWORDS = ['不知道', '不知', '不確定', '不知道欸', 'ไม่รู้'];

const N1: PoolEntry[] = [
  { questionId: 'n01_q01_wait', expectedConsonant: 'ร', revealWord: 'รอ', acceptedCandidates: ['ร', 'r', 'ㄖ', 'ro', 'rorua'] },
  { questionId: 'n01_q02_house', expectedConsonant: 'บ', revealWord: 'บ้าน', acceptedCandidates: ['บ', 'b', 'ㄅ'] },
  { questionId: 'n01_q03_child', expectedConsonant: 'ด', revealWord: 'เด็ก', acceptedCandidates: ['ด', 'd', 'ㄉ'] },
  { questionId: 'n01_q04_night', expectedConsonant: 'ก', revealWord: 'กลางคืน', acceptedCandidates: ['ก', 'k', 'ㄍ'] },
  { questionId: 'n01_q05_door', expectedConsonant: 'ป', revealWord: 'ประตู', acceptedCandidates: ['ป', 'p', 'ㄆ'] },
  { questionId: 'n01_q06_sound', expectedConsonant: 'ส', revealWord: 'เสียง', acceptedCandidates: ['ส', 's', 'ㄙ'] },
  { questionId: 'n01_q07_wind', expectedConsonant: 'ล', revealWord: 'ลม', acceptedCandidates: ['ล', 'l', 'ㄌ'] },
  { questionId: 'n01_q08_return', expectedConsonant: 'ก', revealWord: 'กลับ', acceptedCandidates: ['ก', 'k', 'ㄍ'] },
  { questionId: 'n01_q09_why', expectedConsonant: 'ท', revealWord: 'ทำไม', acceptedCandidates: ['ท', 'th', 'ㄊ'] },
  { questionId: 'n01_q10_turn', expectedConsonant: 'ห', revealWord: 'หัน', acceptedCandidates: ['ห', 'h', 'ㄏ'] }
];

const N2: PoolEntry[] = [
  { questionId: 'n02_q01_side', expectedConsonant: 'ข', revealWord: 'ข้าง', acceptedCandidates: ['ข', 'kh', 'ㄎ'] },
  { questionId: 'n02_q02_i', expectedConsonant: 'ฉ', revealWord: 'ฉัน', acceptedCandidates: ['ฉ', 'chh', 'ㄑ'] },
  { questionId: 'n02_q03_cave', expectedConsonant: 'ถ', revealWord: 'ถ้ำ', acceptedCandidates: ['ถ', 'th', 'ㄊ'] },
  { questionId: 'n02_q04_ghost', expectedConsonant: 'ผ', revealWord: 'ผี', acceptedCandidates: ['ผ', 'ph', 'ㄆ'] },
  { questionId: 'n02_q05_rain', expectedConsonant: 'ฝ', revealWord: 'ฝน', acceptedCandidates: ['ฝ', 'f', 'ㄈ'] },
  { questionId: 'n02_q06_meet', expectedConsonant: 'จ', revealWord: 'เจอ', acceptedCandidates: ['จ', 'j', 'ㄐ'] },
  { questionId: 'n02_q07_eye', expectedConsonant: 'ต', revealWord: 'ตา', acceptedCandidates: ['ต', 't', 'ㄊ'] },
  { questionId: 'n02_q08_out', expectedConsonant: 'อ', revealWord: 'ออก', acceptedCandidates: ['อ', "'", 'ʔ'] },
  { questionId: 'n02_q09_person', expectedConsonant: 'ค', revealWord: 'คน', acceptedCandidates: ['ค', 'kh', 'ㄎ'] },
  { questionId: 'n02_q10_snake', expectedConsonant: 'ง', revealWord: 'งู', acceptedCandidates: ['ง', 'ng', 'ㄥ'] }
];

const N3: PoolEntry[] = [
  { questionId: 'n03_q01_slow', expectedConsonant: 'ช', revealWord: 'ช้า', acceptedCandidates: ['ช', 'chh', 'ㄑ'] },
  { questionId: 'n03_q02_hide', expectedConsonant: 'ซ', revealWord: 'ซ่อน', acceptedCandidates: ['ซ', 's', 'ㄙ'] },
  { questionId: 'n03_q03_sleep', expectedConsonant: 'น', revealWord: 'นอน', acceptedCandidates: ['น', 'n', 'ㄋ'] },
  { questionId: 'n03_q04_take', expectedConsonant: 'พ', revealWord: 'พา', acceptedCandidates: ['พ', 'ph', 'ㄆ'] },
  { questionId: 'n03_q05_listen', expectedConsonant: 'ฟ', revealWord: 'ฟัง', acceptedCandidates: ['ฟ', 'f', 'ㄈ'] },
  { questionId: 'n03_q06_look', expectedConsonant: 'ม', revealWord: 'มอง', acceptedCandidates: ['ม', 'm', 'ㄇ'] },
  { questionId: 'n03_q07_stay', expectedConsonant: 'ย', revealWord: 'อยู่', acceptedCandidates: ['ย', 'y', 'ㄧ'] },
  { questionId: 'n03_q08_run', expectedConsonant: 'ว', revealWord: 'วิ่ง', acceptedCandidates: ['ว', 'w', 'ㄨ'] },
  { questionId: 'n03_q09_room', expectedConsonant: 'ฮ', revealWord: 'ห้อง', acceptedCandidates: ['ฮ', 'h', 'ㄏ'] },
  { questionId: 'n03_q10_lula', expectedConsonant: 'ฬ', revealWord: 'ฬา', acceptedCandidates: ['ฬ', 'l', 'ㄌ'] }
];

export const SANDBOX_NIGHT_QUESTION_POOLS: Record<string, PoolEntry[]> = {
  NIGHT_01: N1,
  NIGHT_02: N2,
  NIGHT_03: N3
};

export function buildNightScriptFromPool(meta: NightScript['meta']): NightScript {
  const pool = SANDBOX_NIGHT_QUESTION_POOLS[meta.id] ?? [];
  const nodes: NightNode[] = pool.map((entry) => ({
    id: entry.questionId,
    char: entry.expectedConsonant,
    wordText: entry.revealWord,
    word: entry.revealWord,
    translationZh: entry.revealWord,
    audioKey: entry.questionId,
    correctKeywords: entry.acceptedCandidates,
    unknownKeywords: UNKNOWN_KEYWORDS,
    acceptedCandidates: entry.acceptedCandidates,
    expectedConsonant: entry.expectedConsonant,
    revealWord: entry.revealWord
  }));
  return { meta, nodes };
}
