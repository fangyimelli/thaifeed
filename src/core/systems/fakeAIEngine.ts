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
  text: string;
  language: 'zh' | 'th';
  translation_zh?: string;
  thaiFloodText?: string;
  thaiFloodCount?: number;
};

const corpus = replies as ReplyCorpus;
let lastUrbanLegendAt = 0;
let lastThaiFloodAt = 0;

function pickOne<T>(pool: T[], fallback: T): T {
  if (pool.length === 0) return fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

function sanitizeZh(text: string): string {
  return text.replace(/[。．｡]/g, '').replace(/[，。！？；：「」『』（）【】]/g, '').replace(/\s+/g, ' ').trim();
}

function createAnchorZhMessage(anchor: AnchorType): string {
  return sanitizeZh(pickOne(corpus.anchors[anchor]?.zhOnly ?? [], '這格有點不對勁'));
}

function createUrbanLegendZhMessage(anchor: AnchorType): string {
  return sanitizeZh(pickOne(corpus.urbanLegend_zh, createAnchorZhMessage(anchor)));
}

export function generateReply(input: GenerateReplyInput): GeneratedReply {
  const now = Date.now();

  const canTriggerThaiFlood = input.curse > 70 && Math.random() < 0.06 && now - lastThaiFloodAt >= 30_000;
  if (canTriggerThaiFlood) {
    lastThaiFloodAt = now;
    const floodText = pickOne(corpus.thaiFlood, 'ฉันเห็นคุณ');
    return {
      mode: 'thaiFlood',
      text: floodText,
      language: 'th',
      translation_zh: createAnchorZhMessage(input.anchor),
      thaiFloodText: floodText,
      thaiFloodCount: 3 + Math.floor(Math.random() * 4)
    };
  }

  const urbanChance = input.curse > 40 ? 0.08 : 0.04;
  const canTriggerUrbanLegend = now - lastUrbanLegendAt >= 20_000 && Math.random() < urbanChance;
  if (canTriggerUrbanLegend) {
    lastUrbanLegendAt = now;
    return {
      mode: 'urbanLegend',
      text: pickOne(corpus.urbanLegend_th, 'เขาว่ากันว่าที่นี่ไม่ว่าง'),
      language: 'th',
      translation_zh: createUrbanLegendZhMessage(input.anchor)
    };
  }

  return {
    mode: 'normal',
    text: createAnchorZhMessage(input.anchor),
    language: 'zh'
  };
}
