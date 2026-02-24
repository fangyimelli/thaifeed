import type { GameAction, GameState } from './types';

export const initialState: GameState = {
  roomName: '老屋房間',
  roomType: 'IDENTIFY',
  targetConsonant: 'ผ',
  curse: 20,
  wrongStreak: 0,
  vipStillHereTriggered: false,
  messages: [
    {
      id: 'boot-1',
      username: 'system',
      text_th: 'เหมือนเราเห็นพยัญชนะบางตัว...มันอ่านว่าอะไรนะ?',
      text_zh: '好像看到了某個子音…這個子音怎麼唸呢？'
    },
    {
      id: 'boot-2',
      username: 'system',
      text_th: 'ลองพิมพ์ออกมาดูสิ ถ้าถูกอาจเห็นตัวถัดไป',
      text_zh: '試著把它打出來，打對好像就能看到下一個字。'
    }
  ],
  donateToasts: []
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ANSWER_CORRECT': {
      const nextCurse = Math.max(0, state.curse - 10);
      return {
        ...state,
        curse: nextCurse,
        wrongStreak: 0,
        messages: [...state.messages, action.payload.message],
        donateToasts: [...state.donateToasts, action.payload.donate].slice(-2)
      };
    }
    case 'ANSWER_WRONG': {
      const nextCurse = Math.min(100, state.curse + 10);
      const nextWrongStreak = state.wrongStreak + 1;
      const list = [...state.messages, action.payload.message];
      if (action.payload.vipMessage) list.push(action.payload.vipMessage);
      return {
        ...state,
        curse: nextCurse,
        wrongStreak: nextWrongStreak,
        vipStillHereTriggered: state.vipStillHereTriggered || Boolean(action.payload.vipMessage),
        messages: list
      };
    }
    case 'AUDIENCE_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'TOGGLE_CHAT_TRANSLATION':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.payload.id
            ? { ...message, showTranslation: !message.showTranslation }
            : message
        )
      };
    case 'TOGGLE_DONATE_TRANSLATION':
      return {
        ...state,
        donateToasts: state.donateToasts.map((toast) =>
          toast.id === action.payload.id
            ? { ...toast, showTranslation: !toast.showTranslation }
            : toast
        )
      };
    case 'DISMISS_DONATE':
      return {
        ...state,
        donateToasts: state.donateToasts.filter((toast) => toast.id !== action.payload.id)
      };
    default:
      return state;
  }
}
