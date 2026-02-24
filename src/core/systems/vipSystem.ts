import type { ChatMessage } from '../state/types';
import { pickOne } from '../../utils/random';

type VipAiParams = {
  input: string;
  curse: number;
  isCorrect: boolean;
  target: string;
  vipType: 'VIP_NORMAL' | 'VIP_STILL_HERE';
};

function detectLanguage(input: string): 'thai' | 'bopomofo' | 'latin' | 'mixed' {
  const hasThai = /[ก-๙]/.test(input);
  const hasBopomofo = /[ㄅ-ㄦ]/.test(input);
  const hasLatin = /[a-z]/i.test(input);
  const count = [hasThai, hasBopomofo, hasLatin].filter(Boolean).length;
  if (count > 1) return 'mixed';
  if (hasThai) return 'thai';
  if (hasBopomofo) return 'bopomofo';
  if (hasLatin) return 'latin';
  return 'mixed';
}

function buildLanguageMirror(input: string, target: string): { th: string; zh: string } {
  const lang = detectLanguage(input);

  if (lang === 'thai') {
    return {
      th: `เห็นตัว "${input}" แล้ว...แต่ตัวเป้าคือ "${target}" ลองอีกครั้งนะ`,
      zh: `我看到你輸入「${input}」了…但目標是「${target}」，再試一次。`
    };
  }

  if (lang === 'bopomofo') {
    return {
      th: `ㄆ...เสียงใกล้แล้ว พิมพ์ "${target}" แล้วภาพอาจนิ่งขึ้น`,
      zh: `ㄆ…發音接近了，打出「${target}」畫面可能會更穩。`
    };
  }

  if (lang === 'latin') {
    return {
      th: `you typed "${input}"... almost. ลอง "ph" หรือ "${target}"`,
      zh: `你打了「${input}」…很接近。試試「ph」或「${target}」。`
    };
  }

  return {
    th: `ห้องยังรอคำตอบอยู่ พิมพ์ "${target}" เพื่อเปิดตัวอักษรถัดไป`,
    zh: `房間還在等答案，輸入「${target}」可以看到下一個字。`
  };
}

export function maybeCreateVipNormalMessage(input: string, curse: number, target: string): ChatMessage | null {
  if (Math.random() > 0.2) return null;

  const tips = [
    {
      th: `เห็นเหมือนกันว่าเป็น "${target}" นะ ลองพิมพ์ออกเสียงดู`,
      zh: `我也覺得是「${target}」，試著打出它的發音。`
    },
    {
      th: 'แชตบอกว่าถ้าพิมพ์ถูก จะเห็นตัวต่อไปทันที',
      zh: '聊天室說只要打對，就會立刻看到下一個字。'
    }
  ];

  const mirrored = buildLanguageMirror(input, target);
  const chosen = curse > 60 ? mirrored : pickOne([...tips, mirrored]);

  return {
    id: crypto.randomUUID(),
    username: 'VIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text_th: chosen.th,
    text_zh: chosen.zh
  };
}

export function createVipAiReply(params: VipAiParams): ChatMessage {
  const { input, curse, isCorrect, target, vipType } = params;

  if (vipType === 'VIP_STILL_HERE') {
    const mirrored = buildLanguageMirror(input, target);
    const extra =
      curse > 70
        ? {
            th: 'ฉันยังอยู่ตรงนี้ ภาพเริ่มสั่นแรง...รีบตอบให้ถูกเถอะ',
            zh: '我還在這裡，畫面抖得更厲害了…快答對吧。'
          }
        : {
            th: 'ฉันยังอยู่ตรงนี้นะ ตอบอีกครั้งช้า ๆ ก็ได้',
            zh: '我還在這裡喔，再慢慢輸入一次也可以。'
          };

    return {
      id: crypto.randomUUID(),
      username: '_still_here',
      isVip: 'VIP_STILL_HERE',
      text_th: `${mirrored.th} ${extra.th}`,
      text_zh: `${mirrored.zh} ${extra.zh}`
    };
  }

  const normal = isCorrect
    ? {
        th: 'เป๊ะมาก! เปิดทางไปตัวถัดไปแล้ว ✨',
        zh: '超準！下一個字已經打開了 ✨'
      }
    : buildLanguageMirror(input, target);

  return {
    id: crypto.randomUUID(),
    username: 'VIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text_th: normal.th,
    text_zh: normal.zh
  };
}
