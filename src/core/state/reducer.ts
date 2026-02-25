import { pickOne } from '../../utils/random';
import { markReview } from '../adaptive/memoryScheduler';
import { pickRandomConsonant, resolvePlayableConsonant } from '../systems/consonantSelector';
import type { AnchorType, GameAction, GameState } from './types';

const anchors: AnchorType[] = ['door', 'window', 'corner', 'under_table'];

function anchorFromCurse(curse: number): AnchorType {
  if (curse >= 75) return 'under_table';
  if (curse >= 50) return 'corner';
  if (curse >= 30) return 'window';
  return 'door';
}

const initialConsonant = resolvePlayableConsonant();

export const initialState: GameState = {
  roomName: '老屋房間',
  roomType: 'IDENTIFY',
  currentConsonant: initialConsonant,
  previousConsonant: undefined,
  allowConsonantRepeat: false,
  curse: 20,
  wrongStreak: 0,
  vipStillHereTriggered: false,
  currentAnchor: 'door',
  messages: [
    {
      id: 'boot-1',
      username: 'system',
      text: 'เหมือนเราเห็นพยัญชนะบางตัว...มันอ่านว่าอะไรนะ?',
      language: 'th',
      translation: '好像看到了某個子音…這個子音怎麼唸呢？'
    },
    {
      id: 'boot-2',
      username: 'system',
      text: 'ลองพิมพ์ออกมาดูสิ ถ้าถูกอาจเห็นตัวถัดไป',
      language: 'th',
      translation: '試著把你看到的內容打出來，先感受房間的變化。'
    }
  ]
};

function ensurePlayableState(state: GameState): GameState {
  const playable = resolvePlayableConsonant(state.currentConsonant?.letter);
  if (playable.letter === state.currentConsonant.letter) return state;
  return { ...state, currentConsonant: playable };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const safeState = ensurePlayableState(state);

  switch (action.type) {
    case 'PLAYER_MESSAGE':
      return { ...safeState, messages: [...safeState.messages, action.payload] };
    case 'ANSWER_CORRECT': {
      const nextCurse = Math.max(0, safeState.curse - 10);
      markReview(safeState.currentConsonant.letter, 'correct', nextCurse);
      const nextConsonant = pickRandomConsonant(
        safeState.currentConsonant.letter,
        safeState.allowConsonantRepeat,
        nextCurse
      );
      return {
        ...safeState,
        currentConsonant: nextConsonant,
        previousConsonant: safeState.currentConsonant,
        curse: nextCurse,
        currentAnchor: pickOne(anchors),
        wrongStreak: 0,
        messages: safeState.messages
      };
    }
    case 'ANSWER_PASS': {
      const nextConsonant = pickRandomConsonant(
        safeState.currentConsonant.letter,
        safeState.allowConsonantRepeat,
        safeState.curse
      );
      return {
        ...safeState,
        currentConsonant: nextConsonant,
        previousConsonant: safeState.currentConsonant,
        messages: safeState.messages
      };
    }
    case 'ANSWER_WRONG': {
      const nextCurse = Math.min(100, safeState.curse + 10);
      markReview(safeState.currentConsonant.letter, 'wrong', nextCurse);
      const nextWrongStreak = safeState.wrongStreak + 1;
      return {
        ...safeState,
        curse: nextCurse,
        currentAnchor: anchorFromCurse(nextCurse),
        wrongStreak: nextWrongStreak,
        vipStillHereTriggered: safeState.vipStillHereTriggered || action.payload.includeVipStillHere,
        messages: safeState.messages
      };
    }
    case 'AUDIENCE_MESSAGE':
      return { ...safeState, messages: [...safeState.messages, action.payload] };
    case 'TOGGLE_CHAT_TRANSLATION':
      return {
        ...safeState,
        messages: safeState.messages.map((message) =>
          message.id === action.payload.id && message.language === 'th' && message.translation
            ? { ...message, showTranslation: !message.showTranslation }
            : message
        )
      };
    case 'INCREASE_CURSE_IDLE': {
      const nextCurse = Math.min(100, safeState.curse + action.payload.amount);
      return {
        ...safeState,
        curse: nextCurse,
        currentAnchor: anchorFromCurse(nextCurse)
      };
    }
    default:
      return safeState;
  }
}
