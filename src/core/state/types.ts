export type ChatMessage = {
  id: string;
  username: string;
  text_th: string;
  text_zh?: string;
  isVip?: 'VIP_NORMAL' | 'VIP_STILL_HERE';
  showTranslation?: boolean;
};

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
  targetConsonant: string;
  curse: number;
  wrongStreak: number;
  vipStillHereTriggered: boolean;
  messages: ChatMessage[];
  donateToasts: DonateMessage[];
};

export type GameAction =
  | { type: 'ANSWER_CORRECT'; payload: { message: ChatMessage; donate: DonateMessage } }
  | { type: 'ANSWER_WRONG'; payload: { message: ChatMessage; vipMessage?: ChatMessage } }
  | { type: 'AUDIENCE_MESSAGE'; payload: ChatMessage }
  | { type: 'TOGGLE_CHAT_TRANSLATION'; payload: { id: string } }
  | { type: 'TOGGLE_DONATE_TRANSLATION'; payload: { id: string } }
  | { type: 'DISMISS_DONATE'; payload: { id: string } };
