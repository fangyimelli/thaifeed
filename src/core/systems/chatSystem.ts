import type { ChatMessage } from '../state/types';

export function createPlayerMessage(raw: string, username: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    username,
    text: raw,
    language: 'zh',
    isSelf: true
  };
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
