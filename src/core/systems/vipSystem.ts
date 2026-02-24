import type { ChatMessage } from '../state/types';

export function maybeCreateVipNormalMessage(): ChatMessage | null {
  if (Math.random() > 0.13) return null;

  return {
    id: crypto.randomUUID(),
    username: 'VIP_GoldenLotus',
    isVip: 'VIP_NORMAL',
    text_th: 'สู้ ๆ นะ วันนี้ต้องผ่านด่านนี้ให้ได้',
    text_zh: '加油，今天一定能過這關。'
  };
}

export function createVipStillHereMessage(input: string): ChatMessage {
  const trimmed = input.trim();
  const hasThai = /[ก-๙]/.test(trimmed);
  const hasBopomofo = /[ㄅ-ㄦ]/.test(trimmed);
  const latin = /[a-z]/i.test(trimmed);

  let text_th = 'ฉันยังอยู่ตรงนี้นะ... พิมพ์อีกครั้งสิ';
  let text_zh = '我還在這裡喔…再輸入一次。';

  if (hasThai) {
    text_th = 'พิมพ์ไทยได้ดีนะ แต่ยังไม่ใช่คำนี้';
    text_zh = '你剛剛是泰文，不錯，但還不是這個字。';
  } else if (hasBopomofo) {
    text_th = 'ㄆ...คล้ายแล้ว แต่ยังไม่ตรง';
    text_zh = 'ㄆ…很接近，但還不完全對。';
  } else if (latin) {
    text_th = 'ph maybe? almost, ลองอีกที';
    text_zh = 'ph maybe? 很接近，再試一次。';
  }

  return {
    id: crypto.randomUUID(),
    username: '_still_here',
    isVip: 'VIP_STILL_HERE',
    text_th,
    text_zh
  };
}
