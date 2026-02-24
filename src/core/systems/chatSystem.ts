import thaiChatPools from '../../content/pools/thaiChatPools.json';
import usernames from '../../content/pools/usernames.json';
import { pickOne } from '../../utils/random';
import { curseTier } from './curseSystem';
import { generateReply } from './fakeAIEngine';
import type { AnchorType, ChatMessage } from '../state/types';

export function createAudienceMessage(curse: number): ChatMessage {
  const tier = curseTier(curse);
  const pool = thaiChatPools[tier];
  const sample = pickOne(pool);

  return {
    id: crypto.randomUUID(),
    username: pickOne(usernames),
    text_th: sample.th,
    text_zh: sample.zh
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
    text_th: 'ถูกต้องเลย! บรรยากาศในห้องดีขึ้นทันที ✨',
    text_zh: '答對了！房間氣氛立刻變好 ✨'
  };
}

export function createWrongMessage(curse: number): ChatMessage {
  const tier = curseTier(curse);
  const byTier = {
    low: 'พลาดนิดเดียวเอง ลองอีกทีได้ไหม?',
    mid: 'ห้องเริ่มเงียบแปลก ๆ แล้วนะ พิมพ์ใหม่เร็ว',
    high: 'สัญญาณภาพกระตุกแรงมาก รีบตอบให้ถูก!'
  } as const;

  const zhTier = {
    low: '差一點點，再試一次！',
    mid: '房間開始有點怪，快重打一次。',
    high: '畫面抖得很嚴重，快答對！'
  } as const;

  return {
    id: crypto.randomUUID(),
    username: 'chat_mod',
    text_th: byTier[tier],
    text_zh: zhTier[tier]
  };
}
