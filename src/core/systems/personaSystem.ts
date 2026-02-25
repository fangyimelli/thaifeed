import { pickOne } from '../../utils/random';

type PersonaName =
  | 'chill'
  | 'nervous'
  | 'troll'
  | 'quiet'
  | 'observer'
  | 'hype'
  | 'skeptical'
  | 'empath'
  | 'meme'
  | 'foodie'
  | 'gamer'
  | 'sleepy'
  | 'detective'
  | 'caretaker'
  | 'chaotic'
  | 'polite'
  | 'impatient'
  | 'storyteller'
  | 'minimalist'
  | 'latecomer';

type PunctuationStyle = 'minimal' | 'burst' | 'questioning' | 'clean';

type PersonaLexicon = {
  leads: string[];
  scenes: string[];
  reactions: string[];
  closes: string[];
};

type PersonalityPool = {
  id: string;
  emojiRate: number;
  punctuationStyle: PunctuationStyle;
  questionRate: number;
  exclamationRate: number;
  tagRate: number;
  particleRate: number;
  particlePool: string[];
  useEmoji: boolean;
  frequentTag: boolean;
  preferQuestion: boolean;
  shortSentenceBias: boolean;
  sensoryBias: boolean;
  emojis: string[];
  tags: string[];
  messages: string[];
};

const personaNames: PersonaName[] = [
  'chill',
  'nervous',
  'troll',
  'quiet',
  'observer',
  'hype',
  'skeptical',
  'empath',
  'meme',
  'foodie',
  'gamer',
  'sleepy',
  'detective',
  'caretaker',
  'chaotic',
  'polite',
  'impatient',
  'storyteller',
  'minimalist',
  'latecomer'
];

const userPersonaMap = new Map<string, PersonaName>();
const personaSentenceCache = new Map<string, string[]>();
const globalMessageSet = new Set<string>();
const sensoryPhrases = ['陰影黏著', '聲音貼耳', '背後發冷', '空氣變重', '地板在抖'];
const shortQuestionPhrases = ['你有看到嗎', '這秒有嗎', '是不是又來了', '要不要重播'];

function sanitizeText(text: string): string {
  return text.replace(/[。．｡]/g, '').replace(/\s+/g, ' ').trim();
}

function compactSentence(text: string, shortSentenceBias: boolean): string {
  if (!shortSentenceBias) return text;
  const words = text.split(' ').filter(Boolean);
  return words.slice(0, Math.min(words.length, 8)).join(' ').trim();
}

function applyPunctuationStyle(line: string, pool: PersonalityPool): string {
  let next = line.replace(/[!?！？]/g, '').trim();

  if (pool.punctuationStyle === 'minimal') return next;

  if (pool.punctuationStyle === 'questioning' || Math.random() < pool.questionRate) {
    next = `${next}?`;
    return next;
  }

  if (pool.punctuationStyle === 'burst' || Math.random() < pool.exclamationRate) {
    const marks = pool.punctuationStyle === 'burst' ? '!!' : '!';
    next = `${next}${marks}`;
  }

  return next;
}

function applyParticleStyle(line: string, pool: PersonalityPool): string {
  if (pool.particlePool.length === 0 || Math.random() >= pool.particleRate) return line;
  return `${line} ${pickOne(pool.particlePool)}`.trim();
}

function applyTagStyle(line: string, pool: PersonalityPool): string {
  if (pool.tags.length === 0) return line;
  const tagChance = pool.frequentTag ? Math.max(pool.tagRate, 0.45) : pool.tagRate;
  if (Math.random() >= tagChance) return line;
  return `${pickOne(pool.tags)} ${line}`.trim();
}

function applyEmojiStyle(line: string, pool: PersonalityPool): string {
  if (!pool.useEmoji || pool.emojis.length === 0 || Math.random() >= pool.emojiRate) return line;
  return `${line} ${pickOne(pool.emojis)}`.trim();
}

function buildMessages(lexicon: PersonaLexicon): string[] {
  const generated: string[] = [];
  for (const lead of lexicon.leads) {
    for (const scene of lexicon.scenes) {
      for (const reaction of lexicon.reactions) {
        for (const close of lexicon.closes) {
          generated.push(`${lead} ${scene} ${reaction} ${close}`.trim());
        }
      }
    }
  }
  return generated.slice(0, 180).map((item) => sanitizeText(item));
}

function createPool(input: {
  id: string;
  emojiRate: number;
  punctuationStyle: PunctuationStyle;
  questionRate: number;
  exclamationRate: number;
  tagRate: number;
  particleRate: number;
  particlePool: string[];
  useEmoji: boolean;
  frequentTag: boolean;
  preferQuestion: boolean;
  shortSentenceBias: boolean;
  sensoryBias: boolean;
  emojis: string[];
  tags: string[];
  lexicon: PersonaLexicon;
}): PersonalityPool {
  return {
    ...input,
    messages: buildMessages(input.lexicon)
  };
}

const personalityPools: Record<PersonaName, PersonalityPool> = {
  chill: createPool({
    id: 'fear_sensor',
    emojiRate: 0.1,
    punctuationStyle: 'minimal',
    questionRate: 0.25,
    exclamationRate: 0.1,
    tagRate: 0.12,
    particleRate: 0.2,
    particlePool: ['啦', '欸'],
    useEmoji: false,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: true,
    emojis: ['👀'],
    tags: ['@旁邊那位', '@有在看的人'],
    lexicon: {
      leads: ['剛那秒', '你看那格', '陰影邊緣', '聲音一沉', '門後那塊', '畫面左下'],
      scenes: ['像被壓了一下', '動了一下', '突然悶住', '有個黑線滑過', '像有人貼近', '空氣突然冷'],
      reactions: ['我背會麻', '我先停住', '心口緊一下', '眼睛離不開', '耳朵會卡住'],
      closes: ['先記著', '不要硬盯', '我晚點再看', '這段很重', '這裡先收']
    }
  }),
  nervous: createPool({
    id: 'panic_flash',
    emojiRate: 0.35,
    punctuationStyle: 'burst',
    questionRate: 0.2,
    exclamationRate: 0.75,
    tagRate: 0.15,
    particleRate: 0.45,
    particlePool: ['啊', '啦', '欸欸'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: true,
    emojis: ['😰', '😱', '🫨'],
    tags: ['@有人在嗎'],
    lexicon: {
      leads: ['靠', '等一下', '我不行', '真的假的', '欸欸欸', '先暫停'],
      scenes: ['那格直接跳', '黑影衝一下', '聲音像貼耳邊', '窗邊突然凹下去', '後面有東西晃', '畫面像要撲過來'],
      reactions: ['我手在抖', '心臟爆衝', '我快尖叫', '我腿軟了', '頭皮炸開'],
      closes: ['先別播', '我真的怕', '再看要命', '我先撤', '不要鬧']
    }
  }),
  troll: createPool({
    id: 'mock_wave',
    emojiRate: 0.28,
    punctuationStyle: 'clean',
    questionRate: 0.2,
    exclamationRate: 0.3,
    tagRate: 0.16,
    particleRate: 0.32,
    particlePool: ['欸', '啦'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: false,
    sensoryBias: false,
    emojis: ['🙃', '🤣', '🤡'],
    tags: ['@導演本人', '@這段很會'],
    lexicon: {
      leads: ['笑死', '好喔', '欸不是', '你確定', '這波可以', '先給掌聲'],
      scenes: ['黑影出場很準時', '鏡頭剛好卡在怪點', '音效下得很滿', '那塊超會搶戲', '這秒像彩排過', '場面安排得太巧'],
      reactions: ['我差點信了', '我嘴角上來', '演得很投入', '觀眾血壓上來', '彈幕會暴走'],
      closes: ['繼續演', '再來一段', '你最懂節奏', '這齣很滿', '我先看戲']
    }
  }),
  quiet: createPool({
    id: 'silent_watch',
    emojiRate: 0.02,
    punctuationStyle: 'minimal',
    questionRate: 0.1,
    exclamationRate: 0.05,
    tagRate: 0.05,
    particleRate: 0.08,
    particlePool: ['嗯'],
    useEmoji: false,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: true,
    emojis: ['🫥'],
    tags: ['@你看'],
    lexicon: {
      leads: ['那邊', '剛剛', '右上', '我看', '這格', '嗯'],
      scenes: ['微微偏了', '暗部在動', '像有呼吸', '有個影子', '亮度變沉', '角落在抖'],
      reactions: ['我先記下', '先不要動', '慢慢看', '有點冷', '我再確認'],
      closes: ['先這樣', '再看一輪', '留著', '我有看到', '別急']
    }
  }),
  observer: createPool({
    id: 'frame_observer',
    emojiRate: 0.1,
    punctuationStyle: 'clean',
    questionRate: 0.35,
    exclamationRate: 0.08,
    tagRate: 0.14,
    particleRate: 0.1,
    particlePool: ['喔'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: true,
    shortSentenceBias: false,
    sensoryBias: true,
    emojis: ['🔍', '👀'],
    tags: ['@有截圖的人', '@有重播的人'],
    lexicon: {
      leads: ['注意這格', '第七秒', '慢放後', '我盯到', '看左下', '這段裡'],
      scenes: ['陰影向外擴', '邊緣出現位移', '光線斷了一拍', '噪點忽然聚集', '門框有抖動', '亮暗節奏失衡'],
      reactions: ['像被外力推', '這不太像壓縮', '前後幀差明顯', '有連續變化', '可重現'],
      closes: ['你們有看到嗎', '有人能補幀嗎', '要不要再驗一次', '這裡值得重播', '先做記號']
    }
  }),
  hype: createPool({
    id: 'hype_runner',
    emojiRate: 0.4,
    punctuationStyle: 'burst',
    questionRate: 0.18,
    exclamationRate: 0.65,
    tagRate: 0.22,
    particleRate: 0.4,
    particlePool: ['欸', '啊', '啦'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: false,
    emojis: ['🔥', '🤯', '⚡'],
    tags: ['@全場注意', '@衝一波'],
    lexicon: {
      leads: ['哇靠', '太猛了', '衝了', '這波炸裂', '全員醒來', '這太扯'],
      scenes: ['黑影直接進圈', '節奏瞬間拉滿', '畫面像開大招', '那格暴衝', '聲音一來就炸', '壓迫感爆表'],
      reactions: ['我腎上腺素滿格', '我直接站起來', '心跳跟鼓點一樣', '我整個醒了', '全身都熱'],
      closes: ['再播一次', '不要停', '這段封神', '今晚不睡', '太香了']
    }
  }),
  skeptical: createPool({
    id: 'doubt_probe',
    emojiRate: 0.03,
    punctuationStyle: 'questioning',
    questionRate: 0.72,
    exclamationRate: 0.05,
    tagRate: 0.1,
    particleRate: 0.04,
    particlePool: ['喔'],
    useEmoji: false,
    frequentTag: false,
    preferQuestion: true,
    shortSentenceBias: false,
    sensoryBias: false,
    emojis: ['🤨'],
    tags: ['@能驗證的人'],
    lexicon: {
      leads: ['先等等', '我想確認', '是不是', '好像', '真的嗎', '先別下結論'],
      scenes: ['這格可能是反光', '噪點模型在跳', '鏡頭邊角有畸變', '壓縮殘影還在', '曝光有波動', '時間軸可能錯位'],
      reactions: ['證據還不夠', '前後要對照', '單幀不能定案', '要有原檔', '還要再比對'],
      closes: ['你們認同嗎', '可以再驗嗎', '有原始片嗎', '還有別的角度嗎', '先保留']
    }
  }),
  empath: createPool({
    id: 'warm_echo',
    emojiRate: 0.22,
    punctuationStyle: 'clean',
    questionRate: 0.2,
    exclamationRate: 0.1,
    tagRate: 0.12,
    particleRate: 0.35,
    particlePool: ['好嗎', '慢慢來', '我在'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: false,
    sensoryBias: true,
    emojis: ['🫶', '🥺', '🤍'],
    tags: ['@你先呼吸', '@別硬撐'],
    lexicon: {
      leads: ['先抱一下', '我懂你', '這段很硬', '你辛苦了', '先穩住', '我陪你看'],
      scenes: ['畫面壓力很重', '陰影像貼著人', '聲音很刺神經', '那格突然下沉', '空氣像悶住', '節奏讓人窒住'],
      reactions: ['看久會不舒服', '心會跟著緊', '身體會警戒', '這種感覺很真', '我也有共感'],
      closes: ['先休息一下', '喝口水再看', '我們慢慢來', '你不是一個人', '撐不住就停']
    }
  }),
  meme: createPool({
    id: 'meme_caster',
    emojiRate: 0.3,
    punctuationStyle: 'clean',
    questionRate: 0.22,
    exclamationRate: 0.22,
    tagRate: 0.22,
    particleRate: 0.26,
    particlePool: ['欸', '啦'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: false,
    sensoryBias: false,
    emojis: ['🫠', '😂', '📸'],
    tags: ['@迷因工廠', '@這能做梗圖'],
    lexicon: {
      leads: ['這波有梗', '先截圖', '笑不出來', '我先存檔', '梗圖素材來了', '這太懂網路'],
      scenes: ['黑影進場像特效', '那秒像模板套好', '節奏像梗片剪法', '角落像偷放彩蛋', '鏡頭像自帶BGM', '驚嚇點命中率高'],
      reactions: ['聊天室會暴增', '表情包已經想好', '這段可循環', '觀眾會狂貼圖', '我的梗魂醒了'],
      closes: ['快做二創', '這能封面', '先上精華', '今晚要洗版', '全網都會看到']
    }
  }),
  foodie: createPool({
    id: 'taste_compare',
    emojiRate: 0.2,
    punctuationStyle: 'clean',
    questionRate: 0.16,
    exclamationRate: 0.12,
    tagRate: 0.14,
    particleRate: 0.3,
    particlePool: ['欸', '啦'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: false,
    sensoryBias: true,
    emojis: ['🍜', '😬', '🍳'],
    tags: ['@宵夜團', '@有廚房魂的人'],
    lexicon: {
      leads: ['這感覺', '我先講', '有夠像', '突然想到', '這口感', '畫面味道出來了'],
      scenes: ['像鍋底燒焦味', '像冷湯回滾', '像蒸氣悶在鍋蓋', '像冰箱半夜嗡嗡', '像刀背刮砧板', '像油煙卡喉嚨'],
      reactions: ['背會發涼', '胃有點縮', '鼻腔有金屬感', '耳朵被油爆聲刺到', '喉嚨會緊'],
      closes: ['這道太重口', '我先配水', '今晚不敢煮', '先關火冷靜', '這段很上頭']
    }
  }),
  gamer: createPool({
    id: 'raid_call',
    emojiRate: 0.18,
    punctuationStyle: 'clean',
    questionRate: 0.28,
    exclamationRate: 0.2,
    tagRate: 0.3,
    particleRate: 0.22,
    particlePool: ['欸', '喔'],
    useEmoji: true,
    frequentTag: true,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: false,
    emojis: ['🎮', '⚔️', '🧩'],
    tags: ['@一號補位', '@二號看右路', '@隊友集合'],
    lexicon: {
      leads: ['這邊call一下', '像打副本', '我看地圖', '這波警戒', '怪點出現', '全隊注意'],
      scenes: ['黑影像王房機制', '視角像被鎖定', '邊角像觸發陷阱', '光點像debuff', '走位空間被吃掉', '鏡頭像卡頓'],
      reactions: ['我會先拉距離', '要先探點', '這格不能站', '先留技能', '這裡像隱王'],
      closes: ['先報點', '集合重打', '這段先記錄', '回放校準', '下一把別踩']
    }
  }),
  sleepy: createPool({
    id: 'drowsy_ping',
    emojiRate: 0.16,
    punctuationStyle: 'minimal',
    questionRate: 0.14,
    exclamationRate: 0.08,
    tagRate: 0.06,
    particleRate: 0.2,
    particlePool: ['哈', '欸'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: true,
    emojis: ['😪', '😳'],
    tags: ['@夜貓子'],
    lexicon: {
      leads: ['我本來要睡', '半夢半醒', '眼皮很重', '剛打哈欠', '差點睡著', '凌晨模式'],
      scenes: ['那格突然醒我', '黑影像拍我肩', '聲音一下刺進來', '畫面忽然變硬', '冷感從背後上來', '房間像靜音後爆點'],
      reactions: ['睡意直接退', '腦袋被敲醒', '我整個清醒', '手心冒汗', '眼神被抓住'],
      closes: ['今晚難睡', '先去洗臉', '不敢關燈', '我要開大燈', '這太提神']
    }
  }),
  detective: createPool({
    id: 'trace_hunter',
    emojiRate: 0.06,
    punctuationStyle: 'questioning',
    questionRate: 0.48,
    exclamationRate: 0.06,
    tagRate: 0.2,
    particleRate: 0.08,
    particlePool: ['喔'],
    useEmoji: false,
    frequentTag: true,
    preferQuestion: true,
    shortSentenceBias: false,
    sensoryBias: false,
    emojis: ['🕵️'],
    tags: ['@提供原檔', '@幀率專家', '@時間軸組'],
    lexicon: {
      leads: ['先做筆記', '線索在這', '看時間碼', '我標一下', '前後對比', '進入查證'],
      scenes: ['陰影移動有軌跡', '噪點分布突然變', '門縫亮度有缺口', '左緣出現二次抖動', '景深切換不連續', '聲波峰值有突點'],
      reactions: ['可疑點已成立', '要補連續三幀', '需比對同場景', '暫列高風險', '可以復現一次'],
      closes: ['誰有原始檔', '請補同秒畫面', '要不要開表單', '我們分工驗證', '先封存這格']
    }
  }),
  caretaker: createPool({
    id: 'care_guard',
    emojiRate: 0.1,
    punctuationStyle: 'clean',
    questionRate: 0.18,
    exclamationRate: 0.05,
    tagRate: 0.16,
    particleRate: 0.4,
    particlePool: ['好嗎', '慢慢來', '先穩住'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: false,
    sensoryBias: true,
    emojis: ['🫶', '🌿'],
    tags: ['@你先休息', '@我陪你'],
    lexicon: {
      leads: ['先照顧自己', '我在這裡', '別急著撐', '先深呼吸', '我們慢慢看', '你先坐好'],
      scenes: ['這段壓力不小', '陰影會讓人繃緊', '聲音會刺激神經', '畫面悶得很快', '那格很容易觸發恐懼', '節奏會拉高心跳'],
      reactions: ['怕是正常的', '身體在保護你', '先停一下也可以', '你已經很努力', '先回到安全感'],
      closes: ['喝點水', '把燈打開', '我會陪著', '慢慢調整', '準備好再看']
    }
  }),
  chaotic: createPool({
    id: 'chaos_spark',
    emojiRate: 0.26,
    punctuationStyle: 'burst',
    questionRate: 0.2,
    exclamationRate: 0.8,
    tagRate: 0.2,
    particleRate: 0.5,
    particlePool: ['靠', '欸欸', '啊'],
    useEmoji: true,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: true,
    emojis: ['💥', '😵', '🫨'],
    tags: ['@全體快看', '@救命'],
    lexicon: {
      leads: ['靠北', '欸三小', '我直接裂開', '這啥鬼', '不要鬧喔', '畫面瘋了'],
      scenes: ['黑影突然貼臉', '整格像被扯歪', '聲音像炸在耳邊', '角落一秒暴衝', '地板像在呼吸', '畫面像要撲人'],
      reactions: ['我魂快飛', '我差點把手機丟掉', '血壓直接上頂', '膝蓋發軟', '我整個亂掉'],
      closes: ['先關掉', '我要逃', '不要再播', '我真的不行', '誰來救場']
    }
  }),
  polite: createPool({
    id: 'courteous_note',
    emojiRate: 0.02,
    punctuationStyle: 'clean',
    questionRate: 0.3,
    exclamationRate: 0.04,
    tagRate: 0.08,
    particleRate: 0.06,
    particlePool: ['請', '謝謝'],
    useEmoji: false,
    frequentTag: false,
    preferQuestion: true,
    shortSentenceBias: false,
    sensoryBias: false,
    emojis: ['🙂'],
    tags: ['@各位', '@麻煩幫看'],
    lexicon: {
      leads: ['不好意思', '借我補充', '請容我說明', '我這邊看到', '冒昧提醒', '先禮貌回報'],
      scenes: ['陰影位置有變化', '聲音層次有異常', '畫面亮度略失衡', '邊緣似乎有抖動', '節奏出現突變', '局部區塊偏暗'],
      reactions: ['可能需要再確認', '建議再比對一次', '我方感受是偏異常', '這點值得留意', '暫時先列觀察'],
      closes: ['請各位參考', '若方便請重播', '感謝補充資料', '麻煩協助確認', '先回報到這']
    }
  }),
  impatient: createPool({
    id: 'rush_ping',
    emojiRate: 0.14,
    punctuationStyle: 'burst',
    questionRate: 0.16,
    exclamationRate: 0.62,
    tagRate: 0.24,
    particleRate: 0.24,
    particlePool: ['快', '欸'],
    useEmoji: true,
    frequentTag: true,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: false,
    emojis: ['⏱️', '😤'],
    tags: ['@快轉手', '@誰在控台'],
    lexicon: {
      leads: ['快點', '別拖了', '現在就看', '立刻重播', '直接切', '速度拉滿'],
      scenes: ['那格剛剛動了', '黑影已經過線', '聲音峰值來了', '角落快要爆點', '異常點就在前面', '畫面馬上變調'],
      reactions: ['再慢就錯過', '我等到火起來', '手都急了', '節奏要跟上', '現在最關鍵'],
      closes: ['趕快處理', '快給我前一秒', '立刻標記', '別再猶豫', '衝這一段']
    }
  }),
  storyteller: createPool({
    id: 'night_teller',
    emojiRate: 0.08,
    punctuationStyle: 'clean',
    questionRate: 0.16,
    exclamationRate: 0.08,
    tagRate: 0.1,
    particleRate: 0.26,
    particlePool: ['你知道嗎', '真的'],
    useEmoji: false,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: false,
    sensoryBias: true,
    emojis: ['📖'],
    tags: ['@聽我一句'],
    lexicon: {
      leads: ['我跟你說', '這畫面讓我想到', '以前有一次', '半夜走廊那種', '老屋感又來了', '聽我描述'],
      scenes: ['木地板像在吐氣', '陰影像沿牆滑行', '電流聲像雨前靜電', '空氣像濕布蓋住', '燈光像被人掐住', '遠處像有腳步停住'],
      reactions: ['背脊會慢慢冷', '心會跟著縮', '耳朵會聽到不存在的聲', '眼角會自己找人影', '時間會變慢'],
      closes: ['那晚也是這樣', '這種我很熟', '真的會記很久', '懂的人會懂', '先別一個人看']
    }
  }),
  minimalist: createPool({
    id: 'micro_ping',
    emojiRate: 0,
    punctuationStyle: 'minimal',
    questionRate: 0.08,
    exclamationRate: 0.02,
    tagRate: 0.02,
    particleRate: 0.02,
    particlePool: ['嗯'],
    useEmoji: false,
    frequentTag: false,
    preferQuestion: false,
    shortSentenceBias: true,
    sensoryBias: true,
    emojis: [],
    tags: ['@看這'],
    lexicon: {
      leads: ['這格', '剛剛', '左邊', '角落', '門後', '現在'],
      scenes: ['有動', '變暗', '像有人', '有聲', '不穩', '很怪'],
      reactions: ['我會怕', '先停', '再看', '不對', '有壓力'],
      closes: ['記住', '先別播', '就這樣', '先留', '夠了']
    }
  }),
  latecomer: createPool({
    id: 'late_sync',
    emojiRate: 0.14,
    punctuationStyle: 'questioning',
    questionRate: 0.58,
    exclamationRate: 0.12,
    tagRate: 0.26,
    particleRate: 0.2,
    particlePool: ['欸', '拜託'],
    useEmoji: true,
    frequentTag: true,
    preferQuestion: true,
    shortSentenceBias: false,
    sensoryBias: false,
    emojis: ['🙋', '😵‍💫'],
    tags: ['@有人補課嗎', '@前面看過的'],
    lexicon: {
      leads: ['我剛進來', '晚到報到', '才跟上', '剛打開就', '我漏掉前面', '現在才到'],
      scenes: ['看到角落在動', '聽到有人喊怪', '黑影剛好閃過', '畫面好像跳幀', '節奏突然很緊', '大家都在刷驚嚇'],
      reactions: ['我有點跟不上', '腦袋還在補課', '心跳先被拉高', '想知道關鍵點', '怕錯過重點'],
      closes: ['誰能補前情嗎', '重點在哪裡', '我該看哪秒', '有人有時間碼嗎', '拜託帶我跟上']
    }
  })
};

function getPersonaName(username: string): PersonaName {
  if (!userPersonaMap.has(username)) {
    userPersonaMap.set(username, pickOne(personaNames));
  }
  return userPersonaMap.get(username)!;
}

function buildPersonaCacheKey(persona: PersonaName, anchorKeyword: string): string {
  return `${persona}__${anchorKeyword}`;
}

function ensurePersonaCache(persona: PersonaName, anchorKeyword: string): void {
  const key = buildPersonaCacheKey(persona, anchorKeyword);
  if (personaSentenceCache.has(key)) return;

  const pool = personalityPools[persona];
  const replaced = pool.messages.map((line) => line.split('anchorKeyword').join(anchorKeyword));
  personaSentenceCache.set(key, [...replaced]);
}

function forceUnique(line: string, pool: PersonalityPool): string {
  if (!globalMessageSet.has(line)) return line;
  const withTag = applyTagStyle(line, pool);
  if (!globalMessageSet.has(withTag)) return withTag;
  const withEmoji = applyEmojiStyle(line, pool);
  if (!globalMessageSet.has(withEmoji)) return withEmoji;
  return `${line} ${Date.now().toString().slice(-4)}`;
}

function buildSeedText(input: { anchorKeyword: string; anchorBaseText: string }, base: string, pool: PersonalityPool): string {
  const anchorSource = `${input.anchorKeyword} ${input.anchorBaseText}`.trim();
  const anchorRate = pool.frequentTag ? 0.7 : pool.sensoryBias ? 0.6 : 0.45;
  if (Math.random() < anchorRate) {
    return `${anchorSource} ${base}`.trim();
  }
  return base;
}

function applyTraitBias(line: string, pool: PersonalityPool): string {
  let next = line;

  if (pool.sensoryBias && Math.random() < 0.35) {
    next = `${next} ${pickOne(sensoryPhrases)}`;
  }

  if (pool.preferQuestion && !next.includes('?') && Math.random() < 0.6) {
    next = `${next} ${pickOne(shortQuestionPhrases)}`;
  }

  return next.trim();
}

function stylizeSentence(raw: string, pool: PersonalityPool): string {
  const traitBiased = applyTraitBias(raw, pool);
  const compact = compactSentence(traitBiased, pool.shortSentenceBias);
  const punctuation = applyPunctuationStyle(compact, pool);
  const particle = applyParticleStyle(punctuation, pool);
  const tagged = applyTagStyle(particle, pool);
  const emojified = applyEmojiStyle(tagged, pool);
  return sanitizeText(emojified);
}

export function buildPersonaMessage(input: { username: string; anchorKeyword: string; anchorBaseText: string }): string {
  const personaName = getPersonaName(input.username);
  const pool = personalityPools[personaName];

  ensurePersonaCache(personaName, input.anchorKeyword);

  const cacheKey = buildPersonaCacheKey(personaName, input.anchorKeyword);
  const cached = personaSentenceCache.get(cacheKey) ?? [];

  for (let i = 0; i < 24; i += 1) {
    const base = cached.length > 0 ? cached.splice(Math.floor(Math.random() * cached.length), 1)[0] : pickOne(pool.messages);
    const seeded = buildSeedText(input, base, pool);
    const candidate = stylizeSentence(seeded, pool);
    if (!globalMessageSet.has(candidate)) {
      globalMessageSet.add(candidate);
      return candidate;
    }
  }

  const fallbackBase = buildSeedText(input, pickOne(pool.messages), pool);
  const fallback = forceUnique(stylizeSentence(fallbackBase, pool), pool);
  globalMessageSet.add(fallback);
  return fallback;
}

export function getPersonaCorpusStats() {
  return personaNames.map((name) => {
    const pool = personalityPools[name];
    return {
      persona: name,
      id: pool.id,
      messageCount: pool.messages.length,
      emojiRate: pool.emojiRate,
      punctuationStyle: pool.punctuationStyle,
      questionRate: pool.questionRate,
      exclamationRate: pool.exclamationRate,
      tagRate: pool.tagRate,
      traits: {
        useEmoji: pool.useEmoji,
        frequentTag: pool.frequentTag,
        preferQuestion: pool.preferQuestion,
        shortSentenceBias: pool.shortSentenceBias,
        sensoryBias: pool.sensoryBias
      }
    };
  });
}
