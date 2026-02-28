export type ChatLintReason = 'timecode_phrase' | 'technical_term';

const timecodePattern = /(?:第\s*)?\d+\s*(秒|段|格|幀)/;
const zhTimecodePattern = /第\s*[零一二三四五六七八九十百千兩]+\s*(秒|段|格|幀)/;

const technicalTermPattern = /(frame\s*drop|bitrate|frame|encoding|encode|codec|compress(?:ion|ed)?|artifact|calibrat(?:e|ion)|compare|amplitude|spectrum|壓縮噪點|壓縮|編碼|噪點|校準|比對|振幅|頻譜|幀差|時間碼)/i;

export function getChatLintReason(text: string): ChatLintReason | null {
  if (timecodePattern.test(text) || zhTimecodePattern.test(text)) return 'timecode_phrase';
  if (technicalTermPattern.test(text)) return 'technical_term';
  return null;
}

export function truncateLintText(text: string, max = 36): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
