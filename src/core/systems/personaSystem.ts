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

type PersonaCorpus = {
  openings: string[];
  anchorTemplates: string[];
  generalResponses: string[];
  emotionalResponses: string[];
  shortInterjections: string[];
  scareResponses: string[];
  questions: string[];
  endings: string[];
  emojis: string[];
  emojiRate: number;
};

const leadingParticles = ['欸', 'ㄟ', '欸欸', '蛤', '靠', '真的假的', '等一下', '欸不是'];
const endingParticles = ['啦', '欸', '啊', '齁', '耶'];
const bannedTerms = ['似乎', '看起來', '應該是', '或許', '可能是', '顯示', '判斷', '認為'];
const endingParticleHistory: string[] = [];

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

const baseCorpus = {
  anchorTemplates: [
    'anchorKeyword那邊',
    'anchorKeyword後面那格',
    'anchorKeyword旁邊陰影',
    'anchorKeyword底下那塊',
    'anchorKeyword前面那條線',
    'anchorKeyword附近那一片',
    'anchorKeyword左邊角角',
    'anchorKeyword右邊那格',
    'anchorKeyword旁邊黑影',
    'anchorKeyword附近地板',
    'anchorKeyword旁邊空位',
    'anchorKeyword那排'
  ],
  generalResponses: [
    '剛剛有動一下',
    '有點不太穩',
    '我看了會起雞皮',
    '這畫面不太單純',
    '整個氣氛變重',
    '好像有東西貼著',
    '我覺得不能放著',
    '那塊一直搶畫面',
    '這段越看越不對',
    '現在超像要出事',
    '節奏突然變快',
    '燈光卡在那格',
    '明顯有壓迫感',
    '感覺在等人看',
    '那邊真的很吵'
  ],
  emotionalResponses: [
    '我心跳直接拉高',
    '我背脊整個麻掉',
    '我手心都在冒汗',
    '我現在頭皮發麻',
    '我有點撐不住',
    '我剛剛差點叫出來',
    '我越看越緊張',
    '我整個人僵住',
    '我冷汗直接出來',
    '我真的有被嚇到',
    '我腦袋直接空白',
    '我現在超想逃',
    '我差點把手機丟掉',
    '我真的不敢再盯',
    '我現在超級抖'
  ],
  shortInterjections: ['欸', 'ㄟ', '蛤', '等一下', '真假', '靠', '不要鬧', '先別', '喂', '好扯'],
  scareResponses: [
    '剛剛像有人蹲著',
    '剛剛像有東西探頭',
    '剛剛黑影整個滑過',
    '剛剛像有人呼吸',
    '剛剛那格突然黑掉',
    '剛剛像有手伸出來',
    '剛剛那塊直接扭一下',
    '剛剛像有人靠近鏡頭',
    '剛剛像有影子閃過',
    '剛剛那邊整個沉下去',
    '剛剛像有腳步靠近',
    '剛剛真的很不自然'
  ],
  questions: [
    '你們有看到嗎',
    '有人也覺得怪嗎',
    '這正常嗎',
    '這樣還要看嗎',
    '是不是不只我在抖',
    '有人敢重看嗎',
    '你們聽到聲音了嗎',
    '這邊是不是有東西',
    '是不是該切畫面',
    '有人要一起盯嗎',
    '這樣真的沒問題嗎',
    '你們也覺得涼嗎'
  ],
  endings: ['啦', '欸', '啊', '齁', '耶'],
  emojis: ['👀', '😰', '😨', '😬', '😳', '🤯', '🫠', '🥶', '🫣', '😵']
};

const personaVariants: Record<PersonaName, Partial<PersonaCorpus>> = {
  chill: {
    openings: ['欸', '先說', '有點', '老實講', '怪怪的', '等一下'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.2
  },
  nervous: {
    openings: ['欸欸', '等一下', '蛤', '欸不是', '我不行', '先暫停'],
    emotionalResponses: ['我快不能呼吸', '我手都軟了', '我真的要哭', '我整個炸毛', '我腿在抖'],
    emojiRate: 0.45
  },
  troll: {
    openings: ['笑死', '欸不是', '好喔', '真假啦', '你確定', '鬧欸'],
    generalResponses: ['這段也太會演', '那塊在偷刷存在感', '畫面故意搞我', '這邊很會鬧', '這段很會挑時間'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.35
  },
  quiet: {
    openings: ['嗯', '欸', '我看', '這邊', '剛剛', '有點'],
    shortInterjections: ['欸', '喔', '嗯', '先看', '等等'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.1
  },
  observer: {
    openings: ['注意看', '這格', '我盯到', '剛剛那秒', '細看', '這邊有點'],
    questions: ['你們重播那秒看看', '有人有截到嗎', '你們有放慢看嗎', '這格是不是有位移', '這裡是光影嗎'],
    emojiRate: 0.18
  },
  hype: {
    openings: ['哇靠', '太猛了', '欸欸欸', '衝了', '這太炸', '靠北'],
    emotionalResponses: ['我腎上腺素滿了', '我直接醒了', '我整個燃起來', '我心臟在蹦', '我現在超嗨又怕'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.4
  },
  skeptical: {
    openings: ['先等等', '我不太信', '這個嘛', '認真說', '有點怪', '先別急'],
    generalResponses: ['光有點偏掉', '壓縮有點亂', '先別太快定案', '我想再看一次', '先看鏡頭有沒有怪'],
    questions: ['有人能比對前一格嗎', '這會不會是反光', '你們有看到一致嗎', '這段有原檔嗎', '先確認幀數好嗎'],
    emojiRate: 0.08
  },
  empath: {
    openings: ['天啊', '我懂', '先抱一下', '我也有感', '欸辛苦了', '這段很硬'],
    emotionalResponses: ['我光看就替你緊張', '我真的有同感', '我也跟著發抖', '這壓力我懂', '我現在超有感'],
    endings: ['好嗎', '先深呼吸', '慢慢來', '我們一起看', '我在'],
    emojiRate: 0.25
  },
  meme: {
    openings: ['這波', '笑不出來', '要命', '先存圖', '欸這啥', '有梗'],
    generalResponses: ['這幕直接變迷因', '那塊像在偷上線', '我腦中警報梗圖全開', '這段可以封神', '這畫面太會'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.38
  },
  foodie: {
    openings: ['欸我剛', '這感覺', '有夠像', '突然想到', '先講', '我覺得像'],
    generalResponses: ['氣氛像冰箱半夜打開', '那塊像焦掉的吐司', '這壓迫感像鍋巴黏底', '畫面悶到像蒸籠', '整個像冷掉的湯'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.22
  },
  gamer: {
    openings: ['這邊', '等等我 call', '我看', '這波要', '有怪', '像 bug'],
    generalResponses: ['像地圖觸發事件', '像怪在卡視角', '這格像隱藏關卡', '那邊像延遲抖動', '畫面像被鎖定'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.28
  },
  sleepy: {
    openings: ['哈欠一下', '我本來快睡', '欸突然', '半夢半醒', '我眼睛很重', '結果'],
    emotionalResponses: ['我直接清醒', '我睡意瞬間沒了', '我腦袋被拍醒', '我現在完全不睏', '我被嚇醒'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.2
  },
  detective: {
    openings: ['線索在', '我先記', '重點是', '這裡有', '先做筆記', '看這秒'],
    anchorTemplates: ['anchorKeyword那格邊緣', 'anchorKeyword左下陰影', 'anchorKeyword右上反光', 'anchorKeyword附近軌跡', 'anchorKeyword前緣', 'anchorKeyword背後空隙'],
    questions: ['有人有時間軸嗎', '這秒前後差在哪', '有人能截連續三幀嗎', '你們看到位移點嗎', '這是入鏡路徑嗎'],
    emojiRate: 0.14
  },
  caretaker: {
    openings: ['先顧好自己', '慢慢來', '不要硬撐', '先穩住', '我陪你看', '先喝口水'],
    emotionalResponses: ['先休息一下再看', '你如果怕就先離開螢幕', '我們一起慢慢看', '有壓力先喘口氣', '不要勉強自己'],
    endings: ['好嗎', '我在', '慢慢來', '先穩住', '沒事'],
    emojiRate: 0.16
  },
  chaotic: {
    openings: ['靠北喔', '欸三小', '這啥鬼', '不要搞', '我直接', '瘋掉'],
    shortInterjections: ['靠', '蛤', '啥啦', '不要欸', '喔幹', '欸欸'],
    scareResponses: ['剛剛像直接貼臉', '剛剛像衝出來', '剛剛那格直接炸開感', '剛剛像要撲過來', '剛剛整個畫面歪掉'],
    emojiRate: 0.5
  },
  polite: {
    openings: ['不好意思', '借我說一下', '我這邊看', '請問', '先提醒', '冒昧講'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.06
  },
  impatient: {
    openings: ['快點看', '別拖了', '先切過去', '現在就', '立刻', '快快快'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emotionalResponses: ['我真的等不及', '再慢就來不及', '我快爆氣', '這節奏太慢了', '我已經急起來'],
    emojiRate: 0.24
  },
  storyteller: {
    openings: ['我跟你說', '剛剛那感覺', '這畫面讓我想到', '以前我遇過', '這種我懂', '聽我一句'],
    generalResponses: ['超像半夜走廊那種壓力', '像停電前那種靜', '像舊屋木板在呼吸', '像雨夜突然停電', '像電扇停掉那秒'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.2
  },
  minimalist: {
    openings: ['欸', '看', '這裡', '有了', '剛剛', '那格'],
    generalResponses: ['很怪', '不對', '有動', '太黑', '太近'],
    emotionalResponses: ['我會怕', '我不行', '有壓力', '有點冷', '我發麻'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.05
  },
  latecomer: {
    openings: ['我剛進來', '晚到報到', '剛補看到', '才進來就', '我剛跟上', '剛開就'],
    questions: ['有人能補前情嗎', '剛剛發生什麼', '我錯過哪段', '能幫我指一下嗎', '現在重點在哪'],
    endings: ['啦', '欸', '啊', '齁', '耶'],
    emojiRate: 0.18
  }
};

const corpusByPersona: Record<PersonaName, PersonaCorpus> = Object.fromEntries(
  personaNames.map((name) => {
    const variant = personaVariants[name] ?? {};
    return [
      name,
      {
        openings: variant.openings ?? baseCorpus.shortInterjections,
        anchorTemplates: variant.anchorTemplates ?? baseCorpus.anchorTemplates,
        generalResponses: variant.generalResponses ?? baseCorpus.generalResponses,
        emotionalResponses: variant.emotionalResponses ?? baseCorpus.emotionalResponses,
        shortInterjections: variant.shortInterjections ?? baseCorpus.shortInterjections,
        scareResponses: variant.scareResponses ?? baseCorpus.scareResponses,
        questions: variant.questions ?? baseCorpus.questions,
        endings: variant.endings ?? baseCorpus.endings,
        emojis: variant.emojis ?? baseCorpus.emojis,
        emojiRate: variant.emojiRate ?? 0.25
      }
    ];
  })
) as Record<PersonaName, PersonaCorpus>;

const userPersonaMap = new Map<string, PersonaName>();
const personaSentenceCache = new Map<string, string[]>();
const globalMessageSet = new Set<string>();

function getPersonaName(username: string): PersonaName {
  if (!userPersonaMap.has(username)) {
    userPersonaMap.set(username, pickOne(personaNames));
  }
  return userPersonaMap.get(username)!;
}

function sanitizeText(text: string): string {
  return text.replace(/[。．｡!！?？,，、;；:：]/g, '').replace(/\s+/g, ' ').trim();
}

function naturalizeTaiwanChat(text: string): string {
  let next = text;
  const replacements: Record<string, string> = {
    似乎: '好像',
    看起來: '有點',
    應該是: '好像',
    或許: '好像',
    可能是: '好像',
    顯示: '有點',
    判斷: '看',
    認為: '覺得'
  };

  Object.entries(replacements).forEach(([from, to]) => {
    next = next.split(from).join(to);
  });

  bannedTerms.forEach((term) => {
    if (next.includes(term)) next = next.split(term).join('怪怪的');
  });

  if (next.endsWith('吧')) next = next.slice(0, -1).trim();
  next = next.replace(/\s+/g, ' ').trim();
  if (next.length > 28) next = next.slice(0, 28).trim();
  return next;
}


function enforceParticleLimit(text: string): string {
  const tokens = text.split(' ').filter(Boolean);
  let seenParticle = false;
  const nextTokens = tokens.filter((token) => {
    const isParticle = leadingParticles.includes(token) || endingParticles.includes(token);
    if (!isParticle) return true;
    if (!seenParticle) {
      seenParticle = true;
      return true;
    }
    return false;
  });
  return nextTokens.join(' ').trim();
}

function pickEndingParticle(corpus: PersonaCorpus): string {
  if (Math.random() >= 0.4) return '';
  const pool = corpus.endings.filter((particle) => {
    const size = endingParticleHistory.length;
    if (size < 2) return true;
    return !(endingParticleHistory[size - 1] === particle && endingParticleHistory[size - 2] === particle);
  });
  const selected = pickOne(pool.length > 0 ? pool : endingParticles);
  endingParticleHistory.push(selected);
  if (endingParticleHistory.length > 8) endingParticleHistory.shift();
  return selected;
}

function buildFromFragments(corpus: PersonaCorpus, anchorKeyword: string, anchorBaseText: string): string {
  const opening = pickOne(corpus.openings);
  const anchorFragment = pickOne(corpus.anchorTemplates).split('anchorKeyword').join(anchorKeyword);
  const short = Math.random() < 0.35 ? pickOne(leadingParticles) : '';

  const midPool = [
    pickOne(corpus.generalResponses),
    pickOne(corpus.emotionalResponses),
    pickOne(corpus.scareResponses),
    pickOne(corpus.questions)
  ];
  const core = pickOne(midPool);
  const ending = pickEndingParticle(corpus);

  const useAnchorBase = Math.random() < 0.2;
  const raw = [short, opening, useAnchorBase ? anchorBaseText : anchorFragment, core].filter(Boolean).join(' ');
  const noPunctuation = naturalizeTaiwanChat(sanitizeText(raw));
  const withEnding = ending ? `${noPunctuation} ${ending}` : noPunctuation;
  const naturalLine = enforceParticleLimit(withEnding);
  if (Math.random() < corpus.emojiRate) return `${naturalLine} ${pickOne(corpus.emojis)}`;
  return naturalLine;
}

function buildPersonaCacheKey(persona: PersonaName, anchorKeyword: string) {
  return `${persona}__${anchorKeyword}`;
}

function ensurePersonaCache(persona: PersonaName, anchorKeyword: string, anchorBaseText: string) {
  const key = buildPersonaCacheKey(persona, anchorKeyword);
  if (personaSentenceCache.has(key)) return;

  const corpus = corpusByPersona[persona];
  const localSet = new Set<string>();
  const generated: string[] = [];
  const target = 220;
  let guard = 0;

  while (generated.length < target && guard < 4000) {
    const sentence = buildFromFragments(corpus, anchorKeyword, anchorBaseText);
    if (localSet.has(sentence) || globalMessageSet.has(sentence)) {
      guard += 1;
      continue;
    }
    localSet.add(sentence);
    generated.push(sentence);
  }

  personaSentenceCache.set(key, generated);
}

function forceUnique(sentence: string, corpus: PersonaCorpus): string {
  if (!globalMessageSet.has(sentence)) return sentence;

  const withPrefix = `${pickOne(leadingParticles)} ${sentence}`.trim();
  if (!globalMessageSet.has(withPrefix)) return withPrefix;

  const withEmoji = `${sentence} ${pickOne(corpus.emojis)}`.trim();
  if (!globalMessageSet.has(withEmoji)) return withEmoji;

  return `${sentence} ${Date.now().toString().slice(-4)}`;
}

export function buildPersonaMessage(input: { username: string; anchorKeyword: string; anchorBaseText: string }): string {
  const personaName = getPersonaName(input.username);
  const corpus = corpusByPersona[personaName];

  ensurePersonaCache(personaName, input.anchorKeyword, input.anchorBaseText);

  const cacheKey = buildPersonaCacheKey(personaName, input.anchorKeyword);
  const cached = personaSentenceCache.get(cacheKey) ?? [];

  for (let i = 0; i < 20; i += 1) {
    const candidate = cached.length > 0 ? cached.splice(Math.floor(Math.random() * cached.length), 1)[0] : buildFromFragments(corpus, input.anchorKeyword, input.anchorBaseText);
    const sanitized = sanitizeText(candidate);
    if (!globalMessageSet.has(sanitized)) {
      globalMessageSet.add(sanitized);
      return sanitized;
    }
  }

  const fallback = forceUnique(buildFromFragments(corpus, input.anchorKeyword, input.anchorBaseText), corpus);
  const sanitizedFallback = sanitizeText(fallback);
  globalMessageSet.add(sanitizedFallback);
  return sanitizedFallback;
}

export function getPersonaCorpusStats() {
  return personaNames.map((name) => {
    const corpus = corpusByPersona[name];
    const estimated =
      corpus.openings.length *
      corpus.anchorTemplates.length *
      corpus.generalResponses.length *
      corpus.emotionalResponses.length *
      corpus.endings.length;

    return {
      persona: name,
      estimatedCombinations: estimated,
      categorySizes: {
        anchorTemplates: corpus.anchorTemplates.length,
        generalResponses: corpus.generalResponses.length,
        emotionalResponses: corpus.emotionalResponses.length,
        shortInterjections: corpus.shortInterjections.length,
        scareResponses: corpus.scareResponses.length,
        questions: corpus.questions.length
      }
    };
  });
}
