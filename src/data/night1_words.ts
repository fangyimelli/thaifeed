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

const ROLE_UNKNOWN_KEYWORDS = [
  '媽媽', '母親', '女人', '女主人', '阿姨', '太太',
  '女孩', '小女孩', '姐姐', '姊姊', '女兒',
  '男孩', '弟弟', '哥哥', '兒子', '小男孩', '孩子'
];

const DEFAULT_UNKNOWN_KEYWORDS = ['不知道', '不知', '不確定', '不知道欸', 'ไม่รู้', ...ROLE_UNKNOWN_KEYWORDS];

export const NIGHT1_WORDS: Night1WordEntry[] = [
  { consonant: 'ร', correctKeywords: ['ร'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'รอ', hintAppendPrefixLen: 2, audioKey: 'ror', comprehension: { question: '這個字是什麼意思？', options: ['等', '房子', '門', '不知道'], correct: '等', keyword: '等', unknown: '不知道' }, talkSeeds: { related: ['像是在等誰', '節奏開始慢下來'], surprise: ['第一個字就不太對勁', '有種停住的感覺'], guess: ['下一個應該是地點', '可能會拼成一句話'] } },
  { consonant: 'บ', correctKeywords: ['บ'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'บ้าน', hintAppendPrefixLen: 2, audioKey: 'baan', comprehension: { question: '這個字比較接近？', options: ['房子', '聲音', '孩子', '不知道'], correct: '房子', keyword: '房子', unknown: '不知道' }, talkSeeds: { related: ['場景開始明確了', '像在指一間房子'], surprise: ['好像真的是屋內故事', '這一題很直接'], guess: ['下一個可能是人物', '應該會補齊情境'] } },
  { consonant: 'ด', correctKeywords: ['ด'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'เด็ก', hintAppendPrefixLen: 2, audioKey: 'dek', comprehension: { question: '這個詞的意思是？', options: ['孩子', '風', '回來', '不知道'], correct: '孩子', keyword: '孩子', unknown: '不知道' }, talkSeeds: { related: ['有角色出現了', '像是某個孩子'], surprise: ['越來越像鬼故事', '關鍵人物出來了'], guess: ['應該會有時間線', '可能要進夜晚'] } },
  { consonant: 'ก', correctKeywords: ['ก'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'กลางคืน', hintAppendPrefixLen: 2, audioKey: 'klang_kuen', comprehension: { question: '這個詞指的是？', options: ['夜晚', '白天', '門口', '不知道'], correct: '夜晚', keyword: '夜晚', unknown: '不知道' }, talkSeeds: { related: ['時間線定在夜裡', '越來越冷了'], surprise: ['這題把氣氛拉滿', '好像快出事了'], guess: ['下一步可能是門', '快到關鍵場景'] } },
  { consonant: 'ป', correctKeywords: ['ป'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ประตู', hintAppendPrefixLen: 2, audioKey: 'pratu', comprehension: { question: '這個詞是？', options: ['門', '窗', '房子', '不知道'], correct: '門', keyword: '門', unknown: '不知道' }, talkSeeds: { related: ['門開始被反覆提到', '像要不要開門'], surprise: ['門又出現了', '越看越毛'], guess: ['下一個可能是聲音', '應該會聽到動靜'] } },
  { consonant: 'ส', correctKeywords: ['ส'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'เสียง', hintAppendPrefixLen: 2, audioKey: 'siang', comprehension: { question: '這個詞是？', options: ['聲音', '腳步', '孩子', '不知道'], correct: '聲音', keyword: '聲音', unknown: '不知道' }, talkSeeds: { related: ['開始不是看畫面了', '像是在聽某種聲音'], surprise: ['耳機黨會怕', '感覺有人在走動'], guess: ['下一步可能是風', '快變成警告句'] } },
  { consonant: 'ล', correctKeywords: ['ล'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ลม', hintAppendPrefixLen: 2, audioKey: 'lom', comprehension: { question: '這個詞是？', options: ['風', '門', '等', '不知道'], correct: '風', keyword: '風', unknown: '不知道' }, talkSeeds: { related: ['像風從門縫進來', '畫面變得更空'], surprise: ['短字但超有壓力', '這題很不舒服'], guess: ['下一個可能是回來', '好像快組成一句'] } },
  { consonant: 'ก', correctKeywords: ['ก'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'กลับ', hintAppendPrefixLen: 2, audioKey: 'klab', comprehension: { question: '這個詞是？', options: ['回來', '離開', '等', '不知道'], correct: '回來', keyword: '回來', unknown: '不知道' }, talkSeeds: { related: ['像是在叫人回來', '語氣變得急迫'], surprise: ['這句開始不妙', '像有人在召喚'], guess: ['下一題也許會問原因', '快到結論了'] } },
  { consonant: 'ท', correctKeywords: ['ท'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ทำไม', hintAppendPrefixLen: 2, audioKey: 'thammai', comprehension: { question: '這個詞是？', options: ['為什麼', '在哪裡', '孩子', '不知道'], correct: '為什麼', keyword: '為什麼', unknown: '不知道' }, talkSeeds: { related: ['疑問句出現了', '像在質問誰'], surprise: ['壓力拉滿', '這題情緒很重'], guess: ['下一題應該是特殊事件', '可能會直接變警告'] } },
  { consonant: 'ห', correctKeywords: ['ห'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'หัน', hintAppendPrefixLen: 2, audioKey: 'han', comprehension: { question: '這個詞是？', options: ['轉頭', '回來', '門', '不知道'], correct: '轉頭', keyword: '轉頭', unknown: '不知道' }, talkSeeds: { related: ['這題明顯不對勁', '像有禁忌'], surprise: ['是不是要出事了', '最後這題太怪'], guess: ['可能直接出警告句', '接下來應該是收束'] } }
];
