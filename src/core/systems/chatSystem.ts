import { curseTier } from './curseSystem';
import { generateReply } from './fakeAIEngine';
import { createSpeechWaveV2, generateChatMessageV2 } from './chatEngineV2';
import type { AnchorType, ChatMessage } from '../state/types';

export function createAudienceMessage(curse: number, anchor: AnchorType, recentHistory: string[]): ChatMessage {
  return generateChatMessageV2({
    kind: 'audience',
    curse,
    anchor,
    recentHistory,
    anchorMentionAllowed: true
  });
}

export function createPlayerSpeechResponses(anchor: AnchorType, recentHistory: string[]): ChatMessage[] {
  return createSpeechWaveV2(anchor, recentHistory);
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
    return {
      messages: Array.from({ length: reply.thaiFloodCount }, () => ({
        id: crypto.randomUUID(),
        username: 'fake_ai',
        text: reply.thaiFloodText!,
        language: 'th',
        translation: reply.translation_zh
      })),
      pauseMs: 3000
    };
  }

  if (reply.mode === 'urbanLegend') {
    return {
      messages: [{
        id: crypto.randomUUID(),
        username: 'fake_ai',
        text: reply.text,
        language: 'th',
        translation: reply.translation_zh
      }]
    };
  }

  return {
    messages: [generateChatMessageV2({
      kind: 'fakeAiNormal',
      curse: input.curse,
      anchor: input.anchor,
      recentHistory: input.recentHistory,
      username: 'fake_ai',
      anchorMentionAllowed: false
    })]
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
    text: raw,
    language: 'zh',
    isSelf: true
  };
}

export function createSuccessMessage(anchor: AnchorType = 'corner'): ChatMessage {
  return generateChatMessageV2({
    kind: 'success',
    curse: 0,
    anchor,
    recentHistory: [],
    username: 'mod_live',
    anchorMentionAllowed: false
  });
}

export function createDonateChatMessage(input: {
  username: string;
  amount: number;
  message_th: string;
  message_zh: string;
}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    username: input.username,
    text: input.message_th,
    language: 'th',
    type: 'donate',
    translation: input.message_zh,
    donateAmount: input.amount
  };
}

export function createWrongMessage(curse: number, anchor: AnchorType = 'corner'): ChatMessage {
  const tier = curseTier(curse);
  return generateChatMessageV2({
    kind: 'wrong',
    curse: tier === 'high' ? 100 : tier === 'mid' ? 65 : 30,
    anchor,
    recentHistory: [],
    username: 'chat_mod',
    anchorMentionAllowed: false
  });
}
