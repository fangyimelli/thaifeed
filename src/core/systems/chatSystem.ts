import usernames from '../../content/pools/usernames.json';
import { pickOne } from '../../utils/random';
import { curseTier } from './curseSystem';
import { generateReply } from './fakeAIEngine';
import { buildPersonaMessage } from './personaSystem';
import type { AnchorType, ChatMessage } from '../state/types';

function anchorKeyword(anchor: AnchorType): string {
  if (anchor === 'under_table') return '桌子';
  if (anchor === 'door') return '門';
  if (anchor === 'window') return '窗';
  return '角落';
}

function tierReaction(curse: number): string {
  const tier = curseTier(curse);
  if (tier === 'low') return '感覺有動靜';
  if (tier === 'mid') return '壓力越來越大';
  return '那邊真的怪到不行';
}

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const trailingParticles = ['啦', '吧', '好嗎', '對不對', '是不是'];
const recentAudienceNormalized: string[] = [];

function normalizeText(text: string): string {
  let normalized = text.trim().replace(emojiRegex, '').replace(/\s+/g, ' ');
  const match = trailingParticles.find((particle) => normalized.endsWith(particle));
  if (match) normalized = normalized.slice(0, -match.length).trim();
  return normalized;
}

function rememberNormalized(text: string) {
  recentAudienceNormalized.push(text);
  if (recentAudienceNormalized.length > 30) recentAudienceNormalized.shift();
}

export function createAudienceMessage(curse: number, anchor: AnchorType, recentHistory: string[]): ChatMessage {
  const username = pickOne(usernames);
  const viewport = recentHistory.slice(-12).map(normalizeText);

  let text = `${anchorKeyword(anchor)}那邊 ${tierReaction(curse)}`;
  let accepted = false;
  for (let i = 0; i < 12; i += 1) {
    const candidate = buildPersonaMessage({
      username,
      anchorKeyword: anchorKeyword(anchor),
      anchorBaseText: `${anchorKeyword(anchor)}那邊 ${tierReaction(curse)}`
    });
    const normalized = normalizeText(candidate);
    if (!viewport.includes(normalized) && !recentAudienceNormalized.includes(normalized)) {
      text = candidate;
      rememberNormalized(normalized);
      accepted = true;
      break;
    }
  }

  if (!accepted) rememberNormalized(normalizeText(text));

  return {
    id: crypto.randomUUID(),
    username,
    text_th: text,
    text_zh: text
  };
}

export function createFakeAiAudienceMessage(input: {
  playerInput: string;
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
  recentHistory: string[];
}): { messages: ChatMessage[]; pauseMs?: number } {
  const reply = generateReply(input);

  if (reply.mode === 'thaiFlood' && reply.thaiFloodText && reply.thaiFloodCount) {
    const floodText = reply.thaiFloodText;
    const floodCount = reply.thaiFloodCount;
    return {
      messages: Array.from({ length: floodCount }, () => ({
        id: crypto.randomUUID(),
        username: 'fake_ai',
        text_th: floodText
      })),
      pauseMs: 3000
    };
  }

  if (reply.mode === 'urbanLegend' && reply.text_th) {
    return {
      messages: [
        {
          id: crypto.randomUUID(),
          username: 'fake_ai',
          text_th: reply.text_zh,
          text_zh: reply.text_zh
        },
        {
          id: crypto.randomUUID(),
          username: 'fake_ai',
          text_th: reply.text_th
        }
      ]
    };
  }

  return {
    messages: [
      {
        id: crypto.randomUUID(),
        username: 'fake_ai',
        text_th: reply.text_zh,
        text_zh: reply.text_zh
      }
    ]
  };
}

export function getAudienceIntervalMs(curse: number) {
  const minMs = 1200;
  const maxMs = 6000;
  const pressure = Math.min(0.45, curse / 220);
  const low = Math.floor(minMs - minMs * pressure * 0.25);
  const high = Math.floor(maxMs - maxMs * pressure);
  return Math.floor(Math.random() * (high - low + 1) + low);
}

export function createPlayerMessage(raw: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    username: 'you',
    text_th: raw,
    isSelf: true
  };
}

export function createSuccessMessage(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    username: 'mod_live',
    text_th: '答對了 房間氣氛立刻變好 ✨',
    text_zh: '答對了 房間氣氛立刻變好 ✨'
  };
}

export function createWrongMessage(curse: number): ChatMessage {
  const tier = curseTier(curse);
  const zhTier = {
    low: '差一點點 再試一次',
    mid: '房間開始有點怪 快重打一次',
    high: '畫面抖得很嚴重 快答對'
  } as const;

  return {
    id: crypto.randomUUID(),
    username: 'chat_mod',
    text_th: zhTier[tier],
    text_zh: zhTier[tier]
  };
}
