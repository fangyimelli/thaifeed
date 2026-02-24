import consonantAliases from '../../content/aliases/consonantAliases.json';
import replies from '../../content/fakeAI/replies.json';
import type { AnchorType } from '../state/types';

type ReplyEntry = {
  zh: string;
  th: string;
  weight: number;
};

type InputKind = 'correct' | 'wrong' | 'phonetic' | 'smallTalk';

type GenerateReplyInput = {
  playerInput: string;
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
  recentHistory: string[];
};

const thaiSuffixes = ['นะ', 'สิ', 'แหละ', 'โอเคไหม'];

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

function addThaiBlend(zh: string, th: string) {
  if (Math.random() > 0.3) return zh;
  const mode = Math.random();
  if (mode < 0.5) return `${zh} ${th}`;
  return `${zh}${thaiSuffixes[Math.floor(Math.random() * thaiSuffixes.length)]}`;
}

export function generateReply({
  playerInput,
  targetConsonant,
  curse,
  anchor,
  recentHistory
}: GenerateReplyInput) {
  const kind = classifyInput({ playerInput, targetConsonant, curse, anchor, recentHistory });

  const basePool =
    kind === 'correct' ? replies.correct : kind === 'smallTalk' ? replies.smallTalk : replies.wrong;

  const selected: ReplyEntry[] = [...basePool];

  if (curse >= 65) selected.push(pickWeighted(replies.highCurse));
  if (Math.random() < 0.2) {
    const anchorKey = `anchor_${anchor}` as const;
    selected.push(pickWeighted(replies[anchorKey]));
  }
  if (curse >= 45 && Math.random() < 0.22) selected.push(pickWeighted(replies.unsettling));

  if (kind === 'phonetic') {
    selected.push({ zh: '你在拼音附近了，但還沒到字本身', th: 'ใกล้แล้วแต่ยังไม่ใช่', weight: 2 });
  }

  const picked = pickWeighted(selected);
  const trailing = recentHistory.length > 0 && Math.random() < 0.18 ? `（${recentHistory[recentHistory.length - 1].slice(0, 12)}…）` : '';

  return {
    text_zh: `${addThaiBlend(picked.zh, picked.th)}${trailing}`,
    text_th: picked.th
  };
}
