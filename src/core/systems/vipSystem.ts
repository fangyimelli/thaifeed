import type { ChatMessage } from '../state/types';
import thaiConsonantMemory from '../../content/memory/thaiConsonantMemory.json';

type VipAiParams = {
  input: string;
  curse: number;
  isCorrect: boolean;
  target: string;
  vipType: 'VIP_NORMAL' | 'VIP_STILL_HERE';
};

type ConsonantMemoryEntry = {
  classTone: '高音' | '中音' | '低音' | '先不學';
  ipa: string;
  aspirated: '是' | '否' | '—';
  reference: string;
  imageHint: string;
};

const consonantMemoryMap = thaiConsonantMemory as Record<string, ConsonantMemoryEntry>;

function createVipHintText(letter: string) {
  const memory = consonantMemoryMap[letter];
  if (!memory) {
    return '這個字我還沒建圖像記憶 先用字母名記住也可以';
  }

  return [
    '提示來了 👑',
    `字母: ${letter}`,
    `分類: ${memory.classTone}`,
    `發音: ${memory.ipa}`,
    `送氣: ${memory.aspirated}`,
    `字母名: ${memory.reference}`,
    `圖像: ${memory.imageHint}`
  ].join('\n');
}

function mirrorInput(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return `先盯著那個位置看一下 直覺先不要亂掉`;
  }

  return `你剛剛輸入「${normalized}」 我建議再對照那個位置看一次`;
}

export function maybeCreateVipNormalMessage(input: string, curse: number, target: string): ChatMessage | null {
  if (Math.random() > 0.2) return null;

  const tips = [
    `我也在看「${target}」附近的那塊 你再穩一點看一次`,
    '我覺得那個位置有在回穩 你先別急'
  ];

  const mirrored = mirrorInput(input);
  const chosen = curse > 60 ? mirrored : (Math.random() < 0.5 ? tips[0] : tips[1]);

  return {
    id: crypto.randomUUID(),
    username: 'VIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text: chosen,
    language: 'zh',
    translation: chosen
  };
}

export function createVipAiReply(params: VipAiParams): ChatMessage {
  const { input, curse, isCorrect, vipType } = params;

  if (vipType === 'VIP_STILL_HERE') {
    const mirrored = mirrorInput(input);
    const extra = curse > 70 ? '我還在這裡 角落又開始晃了 先把呼吸穩住' : '我還在這裡 你慢慢來 先看清楚那邊';
    const message = `${mirrored} ${extra}`;

    return {
      id: crypto.randomUUID(),
      username: '_still_here',
      isVip: 'VIP_STILL_HERE',
      text: message,
      language: 'zh',
      translation: message
    };
  }

  const normal = isCorrect
    ? '等一下 現在真的比較穩 剛剛那個位置亮了一下'
    : mirrorInput(input);

  return {
    id: crypto.randomUUID(),
    username: 'VIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text: normal,
    language: 'zh',
    translation: normal
  };
}

export function createVipHintMessage(letter: string): ChatMessage {
  const text = createVipHintText(letter);

  return {
    id: crypto.randomUUID(),
    username: 'vipVIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text,
    language: 'zh',
    translation: text
  };
}
