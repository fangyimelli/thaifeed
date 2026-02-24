import replies from '../../content/fakeAI/replies.json';
import type { AnchorType } from '../state/types';
import { buildPersonaMessage } from './personaSystem';

type ReplyCorpus = {
  anchors: Record<AnchorType, { zhOnly: string[] }>;
  urbanLegend_zh: string[];
  urbanLegend_th: string[];
  thaiFlood: string[];
};

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
let lastUrbanLegendAt = 0;
let lastThaiFloodAt = 0;
const globalRecentNormalized: string[] = [];

const trailingParticles = ['啦', '吧', '好嗎', '對不對', '是不是'];
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function stripEndingPunctuation(text: string) {
  return text.replace(/[。．｡.!！？?]+$/g, '').trim();
}

function sanitizeZh(text: string) {
  return stripEndingPunctuation(text).replace(/[，。！？；：「」『』（）【】]/g, '').trim();
}

function pickOne<T>(pool: T[], fallback: T): T {
  if (pool.length === 0) return fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createAnchorZhMessage(anchor: AnchorType): string {
  const fallback = '這個位置有點不對勁';
  const pool = corpus.anchors[anchor]?.zhOnly ?? [];
  return sanitizeZh(pickOne(pool, fallback));
}

function createUrbanLegendZhMessage(anchor: AnchorType): string {
  const anchorMessage = createAnchorZhMessage(anchor);
  const urbanZh = sanitizeZh(pickOne(corpus.urbanLegend_zh, anchorMessage));
  return Math.random() < 0.5 ? anchorMessage : urbanZh;
}

function anchorKeyword(anchor: AnchorType): string {
  if (anchor === 'under_table') return '桌子';
  if (anchor === 'door') return '門';
  if (anchor === 'window') return '窗';
  return '角落';
}

function normalizeText(text: string): string {
  let normalized = text.trim().replace(emojiRegex, '').replace(/\s+/g, ' ');
  const match = trailingParticles.find((particle) => normalized.endsWith(particle));
  if (match) normalized = normalized.slice(0, -match.length).trim();
  return normalized;
}

function pushGlobalRecent(text: string) {
  globalRecentNormalized.push(text);
  if (globalRecentNormalized.length > 30) globalRecentNormalized.shift();
}

function buildNormalMessage(input: GenerateReplyInput): string {
  const base = createAnchorZhMessage(input.anchor);
  const username = `viewer_${Math.floor(Math.random() * 20)}`;
  const viewport = input.recentHistory.slice(-12).map(normalizeText);

  for (let i = 0; i < 12; i += 1) {
    const candidate = sanitizeZh(
      buildPersonaMessage({
        username,
        anchorKeyword: anchorKeyword(input.anchor),
        anchorBaseText: base
      })
    );
    const normalized = normalizeText(candidate);
    if (!viewport.includes(normalized) && !globalRecentNormalized.includes(normalized)) {
      pushGlobalRecent(normalized);
      return candidate;
    }
  }

  const fallback = `${anchorKeyword(input.anchor)}那邊現在超怪`;
  const fallbackNormalized = normalizeText(fallback);
  pushGlobalRecent(fallbackNormalized);
  return fallback;
}

export function generateReply(input: GenerateReplyInput): GeneratedReply {
  const now = Date.now();

  const canTriggerThaiFlood = input.curse > 70 && Math.random() < 0.06 && now - lastThaiFloodAt >= 30_000;
  if (canTriggerThaiFlood) {
    lastThaiFloodAt = now;
    const floodPool = corpus.thaiFlood;
    return {
      mode: 'thaiFlood',
      text_zh: buildNormalMessage(input),
      thaiFloodText: pickOne(floodPool, 'ฉันเห็นคุณ'),
      thaiFloodCount: 3 + Math.floor(Math.random() * 4)
    };
  }

  const urbanChance = input.curse > 40 ? 0.08 : 0.04;
  const canTriggerUrbanLegend = now - lastUrbanLegendAt >= 20_000 && Math.random() < urbanChance;
  if (canTriggerUrbanLegend) {
    lastUrbanLegendAt = now;
    return {
      mode: 'urbanLegend',
      text_zh: createUrbanLegendZhMessage(input.anchor),
      text_th: pickOne(corpus.urbanLegend_th, 'เขาว่ากันว่าที่นี่ไม่ว่าง')
    };
  }

  return {
    mode: 'normal',
    text_zh: buildNormalMessage(input)
  };
}
