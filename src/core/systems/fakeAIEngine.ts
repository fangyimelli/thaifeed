import consonantAliases from '../../content/aliases/consonantAliases.json';
import replies from '../../content/fakeAI/replies.json';
import type { AnchorType } from '../state/types';

type ReplyEntry = {
  zh: string;
  th: string;
  weight: number;
};

type ReplyCorpus = {
  correct: ReplyEntry[];
  wrong: ReplyEntry[];
  smallTalk: ReplyEntry[];
  highCurse: ReplyEntry[];
  anchor_under_table: ReplyEntry[];
  anchor_door: ReplyEntry[];
  anchor_window: ReplyEntry[];
  anchor_corner: ReplyEntry[];
  unsettling: ReplyEntry[];
  urbanLegend_th: string[];
  thaiFlood: string[];
};

type InputKind = 'correct' | 'wrong' | 'phonetic' | 'smallTalk';
type ReplyMode = 'normal' | 'urbanLegend' | 'thaiFlood';

type GenerateReplyInput = {
  playerInput: string;
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
  recentHistory: string[];
};

type GeneratedReply = {
  mode: ReplyMode;
  text_zh: string;
  text_th?: string;
  thaiFloodText?: string;
  thaiFloodCount?: number;
};

const corpus = replies as ReplyCorpus;

function normalize(raw: string) {
  return raw.trim().toLowerCase();
}

function isCorrectAnswer(raw: string, targetConsonant: string) {
  const normalized = normalize(raw);
  const aliases = consonantAliases[targetConsonant as keyof typeof consonantAliases] ?? [];
  return aliases.some((alias) => alias.toLowerCase() === normalized);
}

function isPhonetic(raw: string) {
  const value = normalize(raw);
  return /^[a-z\-\s]{2,12}$/.test(value);
}

function isChineseSmallTalk(raw: string) {
  return /[\u4e00-\u9fff]/.test(raw) && !/[ก-๙]/.test(raw);
}

function pickWeighted(pool: ReplyEntry[]) {
  const total = pool.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let cursor = Math.random() * total;
  for (const item of pool) {
    cursor -= Math.max(1, item.weight);
    if (cursor <= 0) return item;
  }
  return pool[0];
}

function classifyInput({ playerInput, targetConsonant }: GenerateReplyInput): InputKind {
  if (isCorrectAnswer(playerInput, targetConsonant)) return 'correct';
  if (isPhonetic(playerInput)) return 'phonetic';
  if (isChineseSmallTalk(playerInput)) return 'smallTalk';
  return 'wrong';
}

function stripEndingPunctuation(text: string) {
  return text.replace(/[。．｡.!！？?]+$/g, '');
}

function extractChineseSnippet(source: string) {
  const filtered = source.replace(/[^\u4e00-\u9fff0-9，、？！「」《》\s]/g, '').trim();
  return filtered.slice(0, 12);
}

function createAnchorZhMessage(input: GenerateReplyInput): string {
  const kind = classifyInput(input);
  const anchorKey = `anchor_${input.anchor}` as const;
  const anchorLine = pickWeighted(corpus[anchorKey]).zh;

  const tonePool: ReplyEntry[] =
    kind === 'correct' ? [...corpus.correct] : kind === 'smallTalk' ? [...corpus.smallTalk] : [...corpus.wrong];

  if (input.curse >= 65) tonePool.push(pickWeighted(corpus.highCurse));
  if (input.curse >= 45 && Math.random() < 0.22) tonePool.push(pickWeighted(corpus.unsettling));
  if (kind === 'phonetic') {
    tonePool.push({ zh: '你已經接近發音了 先盯著這個位置再想一次', th: 'ใกล้แล้วแต่ยังไม่ใช่', weight: 2 });
  }

  const toneLine = pickWeighted(tonePool).zh;
  const recent = input.recentHistory[input.recentHistory.length - 1] ?? '';
  const recentZh = extractChineseSnippet(recent);
  const trailing = recentZh && Math.random() < 0.18 ? `（剛剛那句${recentZh}）` : '';

  return stripEndingPunctuation(`${anchorLine} ${toneLine}${trailing}`);
}

export function generateReply(input: GenerateReplyInput): GeneratedReply {
  const anchorMessage = createAnchorZhMessage(input);

  if (input.curse > 70 && Math.random() < 0.08) {
    const floodPool = corpus.thaiFlood.length > 0 ? corpus.thaiFlood : ['มันกำลังฟังอยู่'];
    return {
      mode: 'thaiFlood',
      text_zh: anchorMessage,
      thaiFloodText: floodPool[Math.floor(Math.random() * floodPool.length)],
      thaiFloodCount: 3 + Math.floor(Math.random() * 3)
    };
  }

  const urbanChance = input.curse > 40 ? 0.1 : 0.05;
  if (Math.random() < urbanChance) {
    const urbanPool = corpus.urbanLegend_th.length > 0 ? corpus.urbanLegend_th : ['เขาว่ากันว่าที่นี่ไม่ว่าง'];
    return {
      mode: 'urbanLegend',
      text_zh: anchorMessage,
      text_th: urbanPool[Math.floor(Math.random() * urbanPool.length)]
    };
  }

  return {
    mode: 'normal',
    text_zh: anchorMessage
  };
}
