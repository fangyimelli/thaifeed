import usernames from '../../content/pools/usernames.json';
import { pickOne } from '../../utils/random';
import type { AnchorType, ChatMessage } from '../state/types';
import { applyMentionV2, sanitizeTemplateMentions } from './mentionV2';

type PersonaId =
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

type StyleProfile = {
  minLen: number;
  maxLen: number;
  punctuation: '' | '!' | '?' | '!?';
  particleRate: number;
  particles: string[];
  slangRate: number;
};

type PersonaProfile = {
  id: PersonaId;
  style: StyleProfile;
  corpus: string[];
};

type GenerateInput = {
  kind: 'audience' | 'speech' | 'fakeAiNormal' | 'success' | 'wrong';
  anchor: AnchorType;
  curse: number;
  currentVideoKey?: string;
  topicMode?: 'CALM_PARANOIA' | 'LIGHT_FLICKER_FEAR' | 'NORMAL';
  username?: string;
  recentHistory: string[];
  activeUsers: string[];
  anchorMentionAllowed?: boolean;
};

const personaIds: PersonaId[] = [
  'chill', 'nervous', 'troll', 'quiet', 'observer', 'hype', 'skeptical', 'empath', 'meme', 'foodie',
  'gamer', 'sleepy', 'detective', 'caretaker', 'chaotic', 'polite', 'impatient', 'storyteller', 'minimalist', 'latecomer'
];

const personaMap = new Map<string, PersonaId>();
const recentMessages: string[] = [];
const recentNormalized: string[] = [];
const recentWindowSize = 64;
const eventMentionWindowMs = 10_000;
const eventMentionMap = new Map<AnchorType, number>();

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const anchorWords: Record<AnchorType, string> = {
  under_table: '桌下',
  door: '門邊',
  window: '窗邊',
  corner: '角落'
};

const topicCorpus: Record<'CALM_PARANOIA' | 'LIGHT_FLICKER_FEAR', string[]> = {
  CALM_PARANOIA: [
    '太安靜了我反而不敢移開視線',
    '畫面越平靜我越覺得有事',
    '現在這種沒事感最毛',
    '我開始懷疑是不是我自己腦補',
    '角落那塊越盯越像有東西',
    '什麼都沒發生才讓人不舒服',
    '氣氛像在等下一秒出事',
    '我明知沒證據還是覺得背後有人',
    '這種安靜真的不正常',
    '腦袋一直補畫面越想越可怕'
  ],
  LIGHT_FLICKER_FEAR: [
    '剛剛燈是不是閃了一下',
    '那盞燈看起來在晃',
    '亮度剛剛像跳了一拍',
    '我怎麼覺得有人在碰開關',
    '這個忽明忽暗不像鏡頭問題',
    '燈光節奏怪到像有人在弄',
    '我盯著燈看它又抖一下',
    '房間亮度忽高忽低很不對',
    '那個開關感覺被動過',
    '不是錯覺吧燈真的在動'
  ]
};

const PERSONA_PROFILES: Record<PersonaId, PersonaProfile> = {
  chill: makeProfile('chill', ['我先慢慢看', '先別急我還在盯', '這秒有點悶', '等下再回放一次']),
  nervous: makeProfile('nervous', ['欸我手心在冒汗', '不要突然衝出來', '這段我真的怕', '我先吸一口氣']),
  troll: makeProfile('troll', ['這鏡頭很會挑時間', '我看你很懂節奏', '彈幕等下要失控', '好啦你贏了']),
  quiet: makeProfile('quiet', ['嗯我有看到', '先記住這秒', '不太舒服', '再看一次']),
  observer: makeProfile('observer', ['第七秒亮度掉了一拍', '邊緣像被拉了一下', '前後幀差異很明顯', '這裡值得重播']),
  hype: makeProfile('hype', ['這波直接拉滿', '節奏衝起來了', '我整個醒了', '不要停這段']),
  skeptical: makeProfile('skeptical', ['先別急著定論', '這會不會是反光', '我想再看一輪', '先做個對照']),
  empath: makeProfile('empath', ['你先穩住呼吸', '不要硬撐我在', '看不下去就休息', '我陪你慢慢看']),
  meme: makeProfile('meme', ['這段像梗圖現場', '我腦袋已經配音了', '聊天室要開始玩梗了', '先存這秒']),
  foodie: makeProfile('foodie', ['我剛拿零食差點掉', '這段比辣還猛', '我杯子都握緊了', '胃一縮']),
  gamer: makeProfile('gamer', ['這像Boss前搖', '警戒條直接亮紅', '我直覺要翻車', '這鏡頭像伏筆']),
  sleepy: makeProfile('sleepy', ['我本來快睡著', '現在完全醒了', '這秒把我拉回來', '眼睛張開了']),
  detective: makeProfile('detective', ['我先記時間碼', '這裡像有人經過', '線索在暗部', '可以做標記']),
  caretaker: makeProfile('caretaker', ['先喝口水再看', '太緊就先停', '別逞強喔', '大家慢慢來']),
  chaotic: makeProfile('chaotic', ['我腦內警報亂叫', '這段太邪門了', '不行我先大叫', '氣氛炸開']),
  polite: makeProfile('polite', ['借過我補一句', '這段讓人發涼', '請大家注意一下', '失禮了但有點怪']),
  impatient: makeProfile('impatient', ['快點回放那秒', '不要拖我想看重點', '下一秒快來', '先講結論很怪']),
  storyteller: makeProfile('storyteller', ['這感覺像老屋在吐氣', '畫面像有人貼著牆走', '節奏像在等人回頭', '這段很有故事感']),
  minimalist: makeProfile('minimalist', ['怪', '有感', '不對勁', '再看']),
  latecomer: makeProfile('latecomer', ['我剛進來就中招', '有人補前情嗎', '我是不是錯過關鍵', '這開場太硬了'])
};

function makeProfile(id: PersonaId, corpus: string[]): PersonaProfile {
  return {
    id,
    corpus: corpus.map((line) => sanitizeTemplateMentions(line)).filter(Boolean),
    style: {
      minLen: id === 'minimalist' ? 1 : 5,
      maxLen: id === 'minimalist' ? 6 : 22,
      punctuation: id === 'skeptical' || id === 'observer' ? '?' : id === 'hype' || id === 'nervous' ? '!' : '',
      particleRate: id === 'quiet' ? 0.05 : 0.2,
      particles: ['啦', '欸', '啊'],
      slangRate: id === 'troll' || id === 'chaotic' ? 0.35 : 0.08
    }
  };
}

function getPersona(username: string): PersonaProfile {
  if (!personaMap.has(username)) personaMap.set(username, pickOne(personaIds));
  return PERSONA_PROFILES[personaMap.get(username)!];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(emojiRegex, '')
    .replace(/[。．｡]/g, '')
    .replace(/[!?！？]{2,}/g, '!')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsMixedZhTh(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text) && /[\u0E00-\u0E7F]/.test(text);
}

function lintCanon(text: string): string {
  let next = text.replace(/[。．｡]/g, '').replace(/\s+([啦欸啊齁耶])/g, '$1').trim();
  if (containsMixedZhTh(next)) next = next.replace(/[\u0E00-\u0E7F]/g, '').trim();
  next = next.replace(/(根據|流程|機制|參數|模組|結論|執行)/g, '');
  return next.replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function ngrams(text: string, n: number): string[] {
  if (text.length < n) return [];
  const grams: string[] = [];
  for (let i = 0; i <= text.length - n; i += 1) grams.push(text.slice(i, i + n));
  return grams;
}

function ngramOverlapRatio(a: string, b: string): number {
  const aGrams = [...ngrams(a, 3), ...ngrams(a, 4)];
  const bSet = new Set([...ngrams(b, 3), ...ngrams(b, 4)]);
  if (aGrams.length === 0) return 0;
  const overlap = aGrams.filter((gram) => bSet.has(gram)).length;
  return overlap / aGrams.length;
}

function isSimilar(candidate: string, recent: string[]): boolean {
  for (const prev of recent) {
    if (candidate === prev) return true;
    const distance = levenshtein(candidate, prev);
    const maxLen = Math.max(candidate.length, prev.length) || 1;
    const similarity = 1 - distance / maxLen;
    const includeRate = Math.min(candidate.length, prev.length) / maxLen;
    if (similarity > 0.8 || (candidate.includes(prev) || prev.includes(candidate)) && includeRate > 0.7) return true;
    if (ngramOverlapRatio(candidate, prev) > 0.35) return true;
  }
  return false;
}

function shouldAllowAnchorMention(anchor: AnchorType): boolean {
  const last = eventMentionMap.get(anchor) ?? 0;
  return Date.now() - last >= eventMentionWindowMs;
}

function rememberAnchorMention(anchor: AnchorType): void {
  eventMentionMap.set(anchor, Date.now());
}

function rememberMessage(text: string): void {
  const normalized = normalize(text);
  recentMessages.push(text);
  recentNormalized.push(normalized);
  if (recentMessages.length > recentWindowSize) recentMessages.shift();
  if (recentNormalized.length > recentWindowSize) recentNormalized.shift();
}

function styleLine(base: string, profile: PersonaProfile, activeUsers: string[]): string {
  let line = base;
  line = applyMentionV2(line, activeUsers);
  if (Math.random() < profile.style.particleRate) line = `${line}${pickOne(profile.style.particles)}`;
  if (profile.style.punctuation) line = `${line}${profile.style.punctuation}`;
  const words = line.split(' ');
  if (words.length > profile.style.maxLen) line = words.slice(0, profile.style.maxLen).join(' ');
  if (Math.random() < profile.style.slangRate) line = line.replace('很', '超').replace('有點', '有夠');
  return lintCanon(line);
}

function composeCandidate(input: GenerateInput): { text: string; username: string; language: 'zh' | 'th'; translation?: string } {
  const username = input.username ?? pickOne(usernames);
  const profile = getPersona(username);
  const shouldUseTopicCorpus = input.kind === 'audience' || input.kind === 'fakeAiNormal';
  const baseCorpus = shouldUseTopicCorpus && input.topicMode && input.topicMode !== 'NORMAL'
    ? topicCorpus[input.topicMode]
    : profile.corpus;
  const base = pickOne(baseCorpus);

  const anchorWord = anchorWords[input.anchor];
  const mentionAnchor = input.anchorMentionAllowed && shouldAllowAnchorMention(input.anchor) && Math.random() < 0.25;
  const joined = mentionAnchor ? `${anchorWord}那邊 ${base}` : base;
  const text = styleLine(joined, profile, input.activeUsers);

  if (mentionAnchor) rememberAnchorMention(input.anchor);

  if (input.kind === 'success') {
    const successText = lintCanon(pickOne(['欸 壓迫感有退一點', '這波穩下來了', '畫面沒那麼緊了', '可以 這次有壓住']));
    return { text: successText, username: 'mod_live', language: 'zh', translation: successText };
  }

  if (input.kind === 'wrong') {
    const wrongText = lintCanon(pickOne(['欸 這下更不妙', '壓力又往上衝', '這次沒壓住', '空氣又變硬了']));
    return { text: wrongText, username: 'chat_mod', language: 'zh', translation: wrongText };
  }

  return { text, username, language: 'zh', translation: text };
}

export function generateChatMessageV2(input: GenerateInput): ChatMessage {
  const recentViewport = [
    ...input.recentHistory.slice(-40).map(normalize),
    ...recentNormalized.slice(-40)
  ];

  for (let i = 0; i < 48; i += 1) {
    const candidate = composeCandidate(input);
    const normalized = normalize(candidate.text);

    if (!normalized) continue;
    if (/[。．｡]/.test(candidate.text)) continue;
    if (/^(門|窗|角落|桌下|感覺有動靜)/.test(normalized) && !shouldAllowAnchorMention(input.anchor)) continue;
    if (isSimilar(normalized, recentViewport)) continue;

    rememberMessage(candidate.text);
    return {
      id: crypto.randomUUID(),
      username: candidate.username,
      text: candidate.text,
      language: candidate.language,
      translation: candidate.translation
    };
  }

  const fallback = lintCanon(pickOne(['先等等 我再看一眼', '這秒怪怪的', '有人跟我一樣有感嗎', '我先不眨眼'])) || '這秒怪怪的';
  rememberMessage(fallback);
  return {
    id: crypto.randomUUID(),
    username: input.username ?? pickOne(usernames),
    text: fallback,
    language: 'zh',
    translation: fallback
  };
}

export function createSpeechWaveV2(anchor: AnchorType, recentHistory: string[], activeUsers: string[]): ChatMessage[] {
  const size = 2 + Math.floor(Math.random() * 4);
  const messages: ChatMessage[] = [];
  for (let i = 0; i < size; i += 1) {
    messages.push(generateChatMessageV2({
      kind: 'speech',
      anchor,
      curse: 50,
      recentHistory,
      activeUsers,
      anchorMentionAllowed: i === 0
    }));
  }
  return messages;
}
