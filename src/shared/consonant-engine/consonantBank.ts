export type AuthoritativeConsonantEntry = {
  consonant: string;
  revealWord: string;
  acceptedCandidates: string[];
  imageMemoryHint: string;
};

export const AUTHORITATIVE_CONSONANT_BANK: AuthoritativeConsonantEntry[] = [
  { consonant: 'ข', revealWord: 'ข้าง', acceptedCandidates: ['ข', 'kh', 'ㄎ'], imageMemoryHint: '「恐」龍' },
  { consonant: 'ฉ', revealWord: 'ฉัน', acceptedCandidates: ['ฉ', 'chh', 'ㄑ'], imageMemoryHint: '敲小鈸噴氣' },
  { consonant: 'ถ', revealWord: 'ถ้ำ', acceptedCandidates: ['ถ', 'th', 'ㄊ'], imageMemoryHint: '雞躺蛋' },
  { consonant: 'ผ', revealWord: 'ผี', acceptedCandidates: ['ผ', 'ph', 'ㄆ'], imageMemoryHint: '蜜蜂噴氣' },
  { consonant: 'ฝ', revealWord: 'ฝน', acceptedCandidates: ['ฝ', 'f', 'ㄈ'], imageMemoryHint: '掀蓋子 ffff' },
  { consonant: 'ส', revealWord: 'เสียง', acceptedCandidates: ['ส', 's', 'ㄙ'], imageMemoryHint: '雞脖子 S' },
  { consonant: 'ห', revealWord: 'หัน', acceptedCandidates: ['ห', 'h', 'ㄏ'], imageMemoryHint: '箱子哈氣' },
  { consonant: 'ก', revealWord: 'กลางคืน', acceptedCandidates: ['ก', 'k', 'ㄍ'], imageMemoryHint: '雞的台語' },
  { consonant: 'จ', revealWord: 'เจอ', acceptedCandidates: ['จ', 'j', 'ㄐ'], imageMemoryHint: '英文 J' },
  { consonant: 'ด', revealWord: 'เด็ก', acceptedCandidates: ['ด', 'd', 'ㄉ'], imageMemoryHint: '豆芽' },
  { consonant: 'ต', revealWord: 'ตา', acceptedCandidates: ['ต', 't', 'ㄊ'], imageMemoryHint: '坍塌' },
  { consonant: 'บ', revealWord: 'บ้าน', acceptedCandidates: ['บ', 'b', 'ㄅ'], imageMemoryHint: '葉子 B' },
  { consonant: 'ป', revealWord: 'ประตู', acceptedCandidates: ['ป', 'p', 'ㄆ'], imageMemoryHint: '魚憋氣' },
  { consonant: 'อ', revealWord: 'ออก', acceptedCandidates: ['อ', "'", 'ʔ', '喉音'], imageMemoryHint: '空水盆喉塞' },
  { consonant: 'ค', revealWord: 'คน', acceptedCandidates: ['ค', 'kh', 'ㄎ'], imageMemoryHint: '空洞' },
  { consonant: 'ง', revealWord: 'งู', acceptedCandidates: ['ง', 'ng', 'ㄥ'], imageMemoryHint: 'ng /ŋ/' },
  { consonant: 'ช', revealWord: 'ช้า', acceptedCandidates: ['ช', 'chh', 'ㄑ'], imageMemoryHint: '醜龍' },
  { consonant: 'ซ', revealWord: 'ซ่อน', acceptedCandidates: ['ซ', 's', 'ㄙ'], imageMemoryHint: 'S' },
  { consonant: 'ท', revealWord: 'ทำไม', acceptedCandidates: ['ท', 'th', 'ㄊ'], imageMemoryHint: '駱駝' },
  { consonant: 'น', revealWord: 'นอน', acceptedCandidates: ['น', 'n', 'ㄋ'], imageMemoryHint: 'N' },
  { consonant: 'พ', revealWord: 'พา', acceptedCandidates: ['พ', 'ph', 'ㄆ'], imageMemoryHint: 'PP' },
  { consonant: 'ฟ', revealWord: 'ฟัง', acceptedCandidates: ['ฟ', 'f', 'ㄈ'], imageMemoryHint: 'ffff' },
  { consonant: 'ม', revealWord: 'มอง', acceptedCandidates: ['ม', 'm', 'ㄇ'], imageMemoryHint: 'mmm' },
  { consonant: 'ย', revealWord: 'อยู่', acceptedCandidates: ['ย', 'y', 'ㄧ'], imageMemoryHint: 'Y' },
  { consonant: 'ร', revealWord: 'รอ', acceptedCandidates: ['ร', 'r', 'ㄖ', 'ro', 'rorua'], imageMemoryHint: 'rrr' },
  { consonant: 'ล', revealWord: 'ลม', acceptedCandidates: ['ล', 'l', 'ㄌ'], imageMemoryHint: 'L 香蕉' },
  { consonant: 'ว', revealWord: 'วิ่ง', acceptedCandidates: ['ว', 'w', 'ㄨ'], imageMemoryHint: 'W 戒指' },
  { consonant: 'ฮ', revealWord: 'ห้อง', acceptedCandidates: ['ฮ', 'h', 'ㄏ'], imageMemoryHint: 'ha' },
  { consonant: 'ฬ', revealWord: 'ฬา', acceptedCandidates: ['ฬ', 'l', 'ㄌ'], imageMemoryHint: 'l 音' }
];

export const SANDBOX_NIGHT_CONSONANT_POOLS: Record<string, string[]> = {
  NIGHT_01: ['ร', 'บ', 'ด', 'ก', 'ป', 'ส', 'ล', 'ก', 'ท', 'ห'],
  NIGHT_02: ['ข', 'ฉ', 'ถ', 'ผ', 'ฝ', 'จ', 'ต', 'อ', 'ค', 'ง'],
  NIGHT_03: ['ช', 'ซ', 'น', 'พ', 'ฟ', 'ม', 'ย', 'ว', 'ฮ', 'ฬ']
};

export const HELP_REQUEST_KEYWORDS = new Set([
  '不知道', '不會', '不懂', '提示', 'hint', 'help', '?', '？？？', '???', '看不懂', '我不會', '我不知道'
]);

export const CONSONANT_BANK_BY_CHAR = new Map(AUTHORITATIVE_CONSONANT_BANK.map((entry) => [entry.consonant, entry]));

export function isHelpRequest(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  return HELP_REQUEST_KEYWORDS.has(normalized);
}
