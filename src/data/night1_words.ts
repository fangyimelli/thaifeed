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

const DEFAULT_UNKNOWN_KEYWORDS = ['不知道', '不知', '不確定', '不知道欸', 'ไม่รู้'];

export const NIGHT1_WORDS: Night1WordEntry[] = [
  { consonant: 'บ', correctKeywords: ['บ'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'บ้าน', hintAppendPrefixLen: 2, audioKey: 'baan', comprehension: { question: '第一題只看線索：它比較像在指向『誰／哪種存在』？', options: ['บ้าน', 'ต้นไม้', 'ประตู', '不知道'], correct: 'บ้าน', keyword: 'บ้าน', unknown: '不知道' }, talkSeeds: { related: ['像在說房子的事', '感覺是熟悉的地方'], surprise: ['欸怎麼是บ้าน', '突然有點安靜'], guess: ['下一個可能是門邊線索', '會不會跟屋內位置有關'] } },
  { consonant: 'ร', correctKeywords: ['ร'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'รอ', hintAppendPrefixLen: 2, audioKey: 'ror', comprehension: { question: '第二題延伸線索：它的語氣比較像在描述哪種對象？', options: ['等待', '風聲', '糖果', '不知道'], correct: '等待', keyword: '等待', unknown: '不知道' }, talkSeeds: { related: ['像在提醒先等等', '節奏突然慢下來'], surprise: ['等一下 這詞有停住感', '這個轉折好怪'], guess: ['下一題可能會更明確', '是不是在引導先觀察'] } },
  { consonant: 'น', correctKeywords: ['น'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'นาก', hintAppendPrefixLen: 2, audioKey: 'nak', comprehension: { question: '第三題再補一條身份線索：聊天室開始懷疑它在指誰？', options: ['นาก', 'บ้าน', 'กลางคืน', '不知道'], correct: 'นาก', keyword: 'นาก', unknown: '不知道' }, talkSeeds: { related: ['這字讓人想到傳說角色', '聊天室開始聯想故事'], surprise: ['欸 這個字有點熟', '突然有點起雞皮疙瘩'], guess: ['下一步可能拼出場景', '是不是會接到地點詞'] } },
  { consonant: 'ต', correctKeywords: ['ต'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ต้นไม้', hintAppendPrefixLen: 2, audioKey: 'tonmai', comprehension: { question: '第四題正式收束：你覺得它最可能在指哪種身份？', options: ['樹', '門', '聲音', '不知道'], correct: '樹', keyword: '樹', unknown: '不知道' }, talkSeeds: { related: ['像是院子裡那棵樹', '畫面感變得更外面'], surprise: ['欸 為什麼是樹', '空氣感突然變重'], guess: ['也許下一個是室內線索', '可能會拼到入口'] } },
  { consonant: 'ป', correctKeywords: ['ป'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ประตู', hintAppendPrefixLen: 2, audioKey: 'pratu', comprehension: { question: '第五題轉向動機：它為什麼一直停在這裡？', options: ['門', '風', '玩偶', '不知道'], correct: '門', keyword: '門', unknown: '不知道' }, talkSeeds: { related: ['門這個意象很明確', '像是要不要打開的感覺'], surprise: ['欸居然是門', '突然有轉場預感'], guess: ['下一塊可能是聲音', '也許會提示時間'] } },
  { consonant: 'ส', correctKeywords: ['ส'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'เสียง', hintAppendPrefixLen: 2, audioKey: 'siang', comprehension: { question: '第六題動機補充：比較像等待、遺憾還是警告？', options: ['聲音', '房子', '樹', '不知道'], correct: '聲音', keyword: '聲音', unknown: '不知道' }, talkSeeds: { related: ['重點變成聽覺了', '像在追某個聲源'], surprise: ['欸怎麼突然提聲音', '雞皮疙瘩又來了'], guess: ['下個可能接夜晚', '像要把時間拼出來'] } },
  { consonant: 'ก', correctKeywords: ['ก'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'กลางคืน', hintAppendPrefixLen: 2, audioKey: 'klang_kuen', comprehension: { question: '第七題動機深化：它是在提醒什麼危險？', options: ['夜晚', '白天', '黃昏', '不知道'], correct: '夜晚', keyword: '夜晚', unknown: '不知道' }, talkSeeds: { related: ['直接鎖定在夜裡', '氣氛整個變暗'], surprise: ['哇 真的往夜晚走', '這串線索越來越完整'], guess: ['接下來可能是風', '也許會補上物件'] } },
  { consonant: 'ล', correctKeywords: ['ล'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ลม', hintAppendPrefixLen: 2, audioKey: 'lom', comprehension: { question: '第八題最後鋪墊：它的執念更接近哪個方向？', options: ['風', '雨', '雷', '不知道'], correct: '風', keyword: '風', unknown: '不知道' }, talkSeeds: { related: ['像有風從走廊吹過', '整個畫面更冷了'], surprise: ['欸這字好短但很有感', '有種不舒服的安靜'], guess: ['下一個會不會是物件', '像還缺最後拼圖'] } },
  { consonant: 'ด', correctKeywords: ['ด'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'ตุ๊กตา', hintAppendPrefixLen: 2, audioKey: 'tukkata', comprehension: { question: '第九題正式猜動機：你認為它真正想做什麼？', options: ['玩偶', '門', '房子', '不知道'], correct: '玩偶', keyword: '玩偶', unknown: '不知道' }, talkSeeds: { related: ['玩偶這詞有點毛', '聊天室突然安靜一下'], surprise: ['欸是玩偶嗎', '這塊真的很怪'], guess: ['最後可能收在日常物件', '或許會突然反差'] } },
  { consonant: 'ห', correctKeywords: ['ห'], unknownKeywords: DEFAULT_UNKNOWN_KEYWORDS, wordText: 'หัน', hintAppendPrefixLen: 2, audioKey: 'han', comprehension: { question: '第十題恐怖總結：這句話最像在對玩家說什麼？', options: ['看你後面', '我在你後面', '我正在看你', '不知道'], correct: 'หัน', keyword: 'หัน', unknown: '不知道' }, talkSeeds: { related: ['結尾變成動作警告', '像在提醒先別亂動'], surprise: ['最後竟然是หัน', '這句像是衝著玩家來'], guess: ['下一夜可能會揭示誰在身後', '後續應該會接翻譯警告'] } }
];
