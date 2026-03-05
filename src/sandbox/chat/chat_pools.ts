const THAI_USERS = [
  'chai_1998',
  'somchai',
  'ayutthaya_local',
  'thai_lurker',
  'phi_watch',
  'bangkok_live',
  'mai_mai',
  'nong_p',
  'ton_ayut',
  'night_th'
] as const;

type ThaiViewerMessage = {
  user: string;
  text: string;
  thai: string;
  translation: string;
};

const ensureUnique = <T>(size: number, factory: (index: number) => T, key: (item: T) => string): T[] => {
  const output: T[] = [];
  const seen = new Set<string>();
  let index = 0;
  while (output.length < size) {
    const item = factory(index);
    index += 1;
    const fingerprint = key(item);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    output.push(item);
  }
  return output;
};

const CASUAL_OPENERS = ['剛進來', '我回來了', '這台今天', '有人在嗎', '前排報到'];
const CASUAL_TOPICS = ['到底演到哪', '真假有點猛', '有人從頭看到現在', '聊天室超熱', '這段很會鋪'];
const CASUAL_TAILS = ['笑死', '先觀望', '我先不敢關聲音', '節奏有喔', '這波穩'];

const OBS_TARGETS = ['門把', '走廊盡頭', '樓梯口', '鏡子邊', '窗簾後', '天花板角落'];
const OBS_ACTIONS = ['是不是動了一下', '剛剛有反光', '好像有影子', '聽到腳步聲', '突然黑一格'];
const OBS_EMOTES = ['你們有看到嗎', '不是我眼花吧', '這太怪了吧', '我重播也有', '雞皮疙瘩'];

const THEORY_START = ['會不會是', '我猜可能是', '這很像', '搞不好是', '感覺像'];
const THEORY_CORE = ['媽媽在等孩子', '一家人失散', '老屋在重演過去', '有人一直在找弟弟', '失蹤案留下的線索'];
const THEORY_END = ['所以才一直重複', '難怪畫面都對不上', '跟前面留言串得起來', '這條線很像主軸', '越想越合理'];

const FEAR_BODY = ['突然變冷', '我背超涼', '耳機裡有雜音', '這氣氛不對', '心跳快到不行'];
const FEAR_HOOK = ['不要回頭啦', '我真的不敢全螢幕', '這裡太陰了', '有人在看我們', '快點離開那邊'];

const GUESS_START = ['會不會是', '像是', '我賭', '感覺就是', '八成是'];
const GUESS_ROLE = ['媽媽', '姐姐', '小男孩', '老屋的主人', '失蹤的弟弟', '守著門的人'];
const GUESS_REASON = ['在等人回家', '一直沒走', '想提醒玩家', '才會一直出聲', '跟那句話對上'];

const SAN_IDLE_HEAD = ['聊天室是不是卡住', '有人 lag 嗎', '訊號掉了?', '怎麼突然安靜', '畫面停了嗎'];
const SAN_IDLE_TAIL = ['@player 還在嗎', '我以為我網路炸了', '快動一下證明活著', '有人回個1', '別嚇我欸'];

const VIP_OPEN = ['我查到剛剛那個字', '目前線索看起來', '整理一下重點', '我把時間軸對完了', '先給懶人包'];
const VIP_CORE = ['跟家族照片有關', '都指向同一間房', '關鍵在「等」這個意象', '聲音來源在樓梯口', '別轉頭那句是警告'];
const VIP_END = ['先記住這條', '下一波應該會驗證', '這邊別漏看', '照這條線走', '先不要亂猜太遠'];

const FINAL_FEAR_START = ['為什麼要說別轉頭', '最後那句太毒', '像是在警告我們', '這結尾超不祥', '我現在不敢看背後'];
const FINAL_FEAR_END = ['真的有人在後面', '像是下一秒就貼臉', '這不是玩笑', '整個房間都在聽', '收得太可怕了'];

const VIP_TRANSLATE_OPEN = ['VIP 翻譯補充', 'VIP 快速翻譯', 'VIP 線索翻譯', 'VIP 即時翻譯'];
const VIP_TRANSLATE_CORE = ['剛剛那段像是在提醒我們「往前拼」', '鬼聲像是回應上一個字', '畫面干擾和語音都在指向同一條線索', '它像在等我們把詞拼完整'];
const VIP_TRANSLATE_END = ['先記住再往下解', '不要漏掉這條', '這很可能是關鍵提示', '先照這條走'];

const GHOST_HINT_REASONING = ['鬼是不是在提示', '是不是在回應剛剛的字', '鬼是不是在等我們拼出什麼'] as const;

const THAI_PHRASES = [
  { thai: 'บ้านนี้น่ากลัวมาก', translation: '這間房子很可怕' },
  { thai: 'อยุธยาคืนนี้เงียบผิดปกติ', translation: '今晚大城安靜得不正常' },
  { thai: 'เด็กคนนั้นยังรออยู่', translation: '那個孩子還在等待' },
  { thai: 'ครอบครัวนี้มีความลับ', translation: '這個家庭有秘密' },
  { thai: 'อย่าหันหลังนะ', translation: '不要轉頭' },
  { thai: 'เสียงฝีเท้ามาจากข้างบน', translation: '腳步聲從樓上傳來' },
  { thai: 'มีเงาอยู่ตรงประตู', translation: '門口有一道影子' },
  { thai: 'เขากำลังมองเรา', translation: '他正在看著我們' },
  { thai: 'บ้านเก่านี้จำทุกคนได้', translation: '這間老屋記得每個人' },
  { thai: 'รอเขากลับบ้าน', translation: '等待他回家' }
];

const casual_pool = ensureUnique(
  500,
  (i) => `${CASUAL_OPENERS[i % CASUAL_OPENERS.length]} ${CASUAL_TOPICS[(i * 3) % CASUAL_TOPICS.length]}，${CASUAL_TAILS[(i * 7) % CASUAL_TAILS.length]} #${i + 1}`,
  (line) => line
);

const observation_pool = ensureUnique(
  300,
  (i) => `${OBS_TARGETS[i % OBS_TARGETS.length]} ${OBS_ACTIONS[(i * 5) % OBS_ACTIONS.length]}，${OBS_EMOTES[(i * 11) % OBS_EMOTES.length]} #${i + 1}`,
  (line) => line
);

const theory_pool = ensureUnique(
  250,
  (i) => `${THEORY_START[i % THEORY_START.length]}${THEORY_CORE[(i * 2) % THEORY_CORE.length]}，${THEORY_END[(i * 3) % THEORY_END.length]} #${i + 1}`,
  (line) => line
);

const thai_viewer_pool = ensureUnique<ThaiViewerMessage>(
  200,
  (i) => {
    const phrase = THAI_PHRASES[i % THAI_PHRASES.length];
    const user = THAI_USERS[(i * 7) % THAI_USERS.length];
    return {
      user,
      text: phrase.thai,
      thai: phrase.thai,
      translation: `${phrase.translation}（線索${i + 1}）`
    };
  },
  (line) => `${line.user}|${line.text}|${line.translation}`
);

const fear_pool = ensureUnique(
  200,
  (i) => `${FEAR_BODY[i % FEAR_BODY.length]}，${FEAR_HOOK[(i * 4) % FEAR_HOOK.length]} #${i + 1}`,
  (line) => line
);

const guess_character = ensureUnique(
  150,
  (i) => `${GUESS_START[i % GUESS_START.length]}${GUESS_ROLE[(i * 3) % GUESS_ROLE.length]}，${GUESS_REASON[(i * 5) % GUESS_REASON.length]} #${i + 1}`,
  (line) => line
);

const tag_player = ensureUnique(
  100,
  (i) => `@player ${['你覺得是誰', '你還在嗎', '這步要不要進', '要不要先看門口', '你有聽到嗎'][(i * 2) % 5]} #${i + 1}`,
  (line) => line
);

const san_idle = ensureUnique(
  150,
  (i) => `${SAN_IDLE_HEAD[i % SAN_IDLE_HEAD.length]}，${SAN_IDLE_TAIL[(i * 3) % SAN_IDLE_TAIL.length]} #${i + 1}`,
  (line) => line
);

const vip_summary = ensureUnique(
  120,
  (i) => `${VIP_OPEN[i % VIP_OPEN.length]}：${VIP_CORE[(i * 2) % VIP_CORE.length]}，${VIP_END[(i * 3) % VIP_END.length]} #${i + 1}`,
  (line) => line
);

const final_fear = ensureUnique(
  80,
  (i) => `${FINAL_FEAR_START[i % FINAL_FEAR_START.length]}，${FINAL_FEAR_END[(i * 2) % FINAL_FEAR_END.length]} #${i + 1}`,
  (line) => line
);

const vip_translate = ensureUnique(
  120,
  (i) => `${VIP_TRANSLATE_OPEN[i % VIP_TRANSLATE_OPEN.length]}：${VIP_TRANSLATE_CORE[(i * 2) % VIP_TRANSLATE_CORE.length]}，${VIP_TRANSLATE_END[(i * 3) % VIP_TRANSLATE_END.length]} #${i + 1}`,
  (line) => line
);

const ghost_hint_reasoning = [...GHOST_HINT_REASONING];

export const CHAT_POOLS = {
  casual_pool,
  observation_pool,
  theory_pool,
  thai_viewer_pool,
  fear_pool,
  guess_character,
  tag_player,
  san_idle,
  vip_summary,
  final_fear,
  vip_translate,
  ghost_hint_reasoning
};
