import type { ChatMessage } from '../state/types';

type VipAiParams = {
  input: string;
  curse: number;
  isCorrect: boolean;
  target: string;
  vipType: 'VIP_NORMAL' | 'VIP_STILL_HERE';
};

function mirrorInput(input: string, target: string) {
  const normalized = input.trim();
  if (!normalized) {
    return `先專心看這個位置 輸入「${target}」就能往下走`;
  }

  return `你剛剛輸入「${normalized}」了 再對照這個位置看一次`;
}

export function maybeCreateVipNormalMessage(input: string, curse: number, target: string): ChatMessage | null {
  if (Math.random() > 0.2) return null;

  const tips = [
    `我也覺得是「${target}」 先盯著現在這個位置再輸入一次`,
    '聊天室都在看這個位置 你再確認一次字形'
  ];

  const mirrored = mirrorInput(input, target);
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
  const { input, curse, isCorrect, target, vipType } = params;

  if (vipType === 'VIP_STILL_HERE') {
    const mirrored = mirrorInput(input, target);
    const extra = curse > 70 ? '我還在這裡 角落越來越不穩 快答對' : '我還在這裡 你可以慢慢再輸入一次';
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

  const normal = isCorrect ? '超準 下一個字已經打開了 ✨' : mirrorInput(input, target);

  return {
    id: crypto.randomUUID(),
    username: 'VIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text: normal,
    language: 'zh',
    translation: normal
  };
}
