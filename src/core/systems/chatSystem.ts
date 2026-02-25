import { curseTier } from './curseSystem';
import { generateReply } from './fakeAIEngine';
import { createSpeechWaveV2, generateChatMessageV2 } from './chatEngineV2';
import { getActiveUserSet, sanitizeMentions } from './mentionV2';
import type { AnchorType, ChatMessage } from '../state/types';

function finalizeMessageMentions(message: ChatMessage, activeUsers: string[]): ChatMessage {
  const activeSet = getActiveUserSet(activeUsers);
  return {
    ...message,
    text: sanitizeMentions(message.text, activeSet),
    translation: message.translation ? sanitizeMentions(message.translation, activeSet) : message.translation
  };
}

export function createAudienceMessage(curse: number, anchor: AnchorType, recentHistory: string[], activeUsers: string[]): ChatMessage {
  return finalizeMessageMentions(generateChatMessageV2({
    kind: 'audience',
    curse,
    anchor,
    recentHistory,
    activeUsers,
    anchorMentionAllowed: true
  }), activeUsers);
}

export function createPlayerSpeechResponses(anchor: AnchorType, recentHistory: string[], activeUsers: string[]): ChatMessage[] {
  return createSpeechWaveV2(anchor, recentHistory, activeUsers).map((message) => finalizeMessageMentions(message, activeUsers));
}

export function createFakeAiAudienceMessage(input: {
  playerInput: string;
  targetConsonant: string;
  curse: number;
  anchor: AnchorType;
  recentHistory: string[];
  activeUsers: string[];
}): { messages: ChatMessage[]; pauseMs?: number } {
  const reply = generateReply(input);

  if (reply.mode === 'thaiFlood' && reply.thaiFloodText && reply.thaiFloodCount) {
    return {
      messages: Array.from({ length: reply.thaiFloodCount }, () => finalizeMessageMentions({
        id: crypto.randomUUID(),
        username: 'fake_ai',
        text: reply.thaiFloodText!,
        language: 'th',
        translation: reply.translation_zh
      }, input.activeUsers)),
      pauseMs: 3000
    };
  }

  if (reply.mode === 'urbanLegend') {
    return {
      messages: [finalizeMessageMentions({
        id: crypto.randomUUID(),
        username: 'fake_ai',
        text: reply.text,
        language: 'th',
        translation: reply.translation_zh
      }, input.activeUsers)]
    };
  }

  return {
    messages: [finalizeMessageMentions(generateChatMessageV2({
      kind: 'fakeAiNormal',
      curse: input.curse,
      anchor: input.anchor,
      recentHistory: input.recentHistory,
      activeUsers: input.activeUsers,
      username: 'fake_ai',
      anchorMentionAllowed: false
    }), input.activeUsers)]
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

export function createSuccessMessage(anchor: AnchorType = 'corner', activeUsers: string[] = []): ChatMessage {
  return finalizeMessageMentions(generateChatMessageV2({
    kind: 'success',
    curse: 0,
    anchor,
    recentHistory: [],
    activeUsers,
    username: 'mod_live',
    anchorMentionAllowed: false
  }), activeUsers);
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

export function createWrongMessage(curse: number, anchor: AnchorType = 'corner', activeUsers: string[] = []): ChatMessage {
  const tier = curseTier(curse);
  return finalizeMessageMentions(generateChatMessageV2({
    kind: 'wrong',
    curse: tier === 'high' ? 100 : tier === 'mid' ? 65 : 30,
    anchor,
    recentHistory: [],
    activeUsers,
    username: 'chat_mod',
    anchorMentionAllowed: false
  }), activeUsers);
}

export function hardenMentionsBeforeRender(message: ChatMessage, activeUsers: string[]): ChatMessage {
  return finalizeMessageMentions(message, activeUsers);
}
