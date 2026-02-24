import replies from '../../content/fakeAI/replies.json';
import type { AnchorType } from '../state/types';

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
let thaiFloodTriggered = false;

function stripEndingPunctuation(text: string) {
  return text.replace(/[。．｡.!！？?]+$/g, '').trim();
}

function pickOne<T>(pool: T[], fallback: T): T {
  if (pool.length === 0) return fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createAnchorZhMessage(anchor: AnchorType): string {
  const fallback = '這個位置有點不對勁';
  const pool = corpus.anchors[anchor]?.zhOnly ?? [];
  return stripEndingPunctuation(pickOne(pool, fallback));
}

function createUrbanLegendZhMessage(anchor: AnchorType): string {
  const anchorMessage = createAnchorZhMessage(anchor);
  const urbanZh = stripEndingPunctuation(pickOne(corpus.urbanLegend_zh, anchorMessage));
  return Math.random() < 0.5 ? anchorMessage : urbanZh;
}

export function generateReply(input: GenerateReplyInput): GeneratedReply {
  const now = Date.now();
  const anchorMessage = createAnchorZhMessage(input.anchor);

  const canTriggerThaiFlood =
    input.curse > 70 &&
    Math.random() < 0.06 &&
    (!thaiFloodTriggered || now - lastThaiFloodAt >= 30_000);

  if (canTriggerThaiFlood) {
    thaiFloodTriggered = true;
    lastThaiFloodAt = now;
    const floodPool = corpus.thaiFlood;
    return {
      mode: 'thaiFlood',
      text_zh: anchorMessage,
      thaiFloodText: pickOne(floodPool, 'มันกำลังฟังอยู่'),
      thaiFloodCount: 3 + Math.floor(Math.random() * 3)
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
    text_zh: anchorMessage
  };
}
