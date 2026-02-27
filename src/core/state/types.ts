import type { ThaiConsonant } from '../systems/consonantSelector';

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  language: 'zh' | 'th';
  type?: 'chat' | 'system' | 'donate';
  subtype?: 'join';
  translation?: string;
  isVip?: 'VIP_NORMAL' | 'VIP_STILL_HERE';
  isSelf?: boolean;
  showTranslation?: boolean;
  donateAmount?: number;
  chatType?: string;
  personaId?: string;
  tagTarget?: string;
};

export type AnchorType = 'under_table' | 'door' | 'window' | 'corner';

export type DonateMessage = {
  id: string;
  username: string;
  amount: number;
  message_th: string;
  message_zh: string;
  showTranslation?: boolean;
};

export type GameState = {
  roomName: string;
  roomType: 'IDENTIFY';
  currentConsonant: ThaiConsonant;
  previousConsonant?: ThaiConsonant;
  allowConsonantRepeat: boolean;
  curse: number;
  wrongStreak: number;
  vipStillHereTriggered: boolean;
  currentAnchor: AnchorType;
  messages: ChatMessage[];
};

export type GameAction =
  | { type: 'PLAYER_MESSAGE'; payload: ChatMessage }
  | { type: 'ANSWER_CORRECT'; payload: { message: ChatMessage; donateMessage: ChatMessage } }
  | { type: 'ANSWER_WRONG'; payload: { message: ChatMessage; vipMessage?: ChatMessage } }
  | { type: 'ANSWER_PASS'; payload: { message: ChatMessage } }
  | { type: 'AUDIENCE_MESSAGE'; payload: ChatMessage }
  | { type: 'TOGGLE_CHAT_TRANSLATION'; payload: { id: string } }
  | { type: 'INCREASE_CURSE_IDLE'; payload: { amount: number } };
