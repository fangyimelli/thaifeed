import type { AnchorType, ChatMessage } from '../state/types';
import thaiConsonantMemory from '../../content/memory/thaiConsonantMemory.json';
import type { ThaiConsonant } from './consonantSelector';

type ConsonantMemoryEntry = {
  classTone: '高音' | '中音' | '低音' | '先不學';
  ipa: string;
  aspirated: '是' | '否' | '—';
  reference: string;
  imageHint?: string;
};

type VipTriggerKind = 'hint' | 'fear' | 'location' | 'uncertain';

type VipResponderState = {
  nonVipMessagesSinceLastVip: number;
};

type VipResponderInput = {
  rawInput: string;
  currentConsonant: string;
  currentAnchor: AnchorType;
  state: VipResponderState;
  recentHistory: string[];
};

const consonantMemoryMap = thaiConsonantMemory as Record<string, ConsonantMemoryEntry>;

const VIP_USERNAME = 'vipVIP_GoldenLotus 👑';

const hintKeywordsExact = new Set(['不知道', '不會', '提示', "don't know"]);
const fearKeywords = ['好可怕', '好毛', '雞皮疙瘩', '背後發涼', '不舒服', '我怕', '我不敢看'];
const locationKeywords = ['哪裡', '在哪', '哪邊', '什麼位置'];
const uncertainKeywords = ['是不是', '我猜', '應該', '好像'];

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function normalizeText(text: string): string {
  return text.trim().replace(emojiRegex, '').replace(/\s+/g, ' ').toLowerCase();
}

function hasRecentDuplicate(text: string, recentHistory: string[]) {
  const normalizedTarget = normalizeText(text);
  return recentHistory.slice(-12).some((item) => normalizeText(item) === normalizedTarget);
}

function shouldThrottleVip(state: VipResponderState) {
  return state.nonVipMessagesSinceLastVip < 2;
}

function isHintRequest(rawInput: string) {
  const trimmed = rawInput.trim().toLowerCase();
  return hintKeywordsExact.has(trimmed);
}

function includesAny(rawInput: string, keywords: string[]) {
  return keywords.some((keyword) => rawInput.includes(keyword));
}

function detectTriggerKind(rawInput: string): VipTriggerKind | null {
  if (isHintRequest(rawInput)) return 'hint';
  if (includesAny(rawInput, fearKeywords)) return 'fear';
  if (includesAny(rawInput, locationKeywords)) return 'location';
  if (includesAny(rawInput, uncertainKeywords)) return 'uncertain';
  return null;
}

function triggerChance(kind: VipTriggerKind | null): number {
  if (kind === 'hint') return 1;
  if (kind === 'fear') return 0.45;
  if (kind === 'location') return 0.35;
  return 0.18;
}

function anchorHint(anchor: AnchorType): string {
  if (anchor === 'door') return '門縫跟門把附近';
  if (anchor === 'window') return '窗簾邊跟窗框旁';
  if (anchor === 'under_table') return '桌腳跟桌面下緣';
  return '角落邊跟地板交界';
}

function createHintText(letter: string): string {
  const memory = consonantMemoryMap[letter];
  if (!memory) {
    return [
      `這題是：${letter}`,
      'IPA：目前無資料',
      '發音：先用字母名記住',
      '送氣：目前無資料',
      '參考詞：目前無資料'
    ].join('\n');
  }

  const lines = [
    `這題是：${letter}`,
    `IPA：${memory.ipa}`,
    `發音：${memory.classTone}類 子音參考${memory.reference}`,
    `送氣：${memory.aspirated}`,
    `參考詞：${memory.reference}`
  ];

  if (memory.imageHint && memory.imageHint !== '—') {
    lines.push(`圖像：${memory.imageHint}`);
  }

  return lines.join('\n');
}

function createFearText() {
  return '先看別處三秒再回來 你可以先打pass或提示 我會陪你慢慢來';
}

function createLocationText(anchor: AnchorType) {
  return `先看${anchorHint(anchor)} 先盯住交界線那一小塊 通常會在那邊`; 
}

function createUncertainText() {
  return '你先用兩個候選比對看看 例如送氣跟不送氣 也可以用注音拼音或泰文字母回答';
}

function createVipMessage(text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    username: VIP_USERNAME,
    isVip: 'VIP_NORMAL',
    text,
    language: 'zh',
    translation: text
  };
}

export function createVipPassMessage(consonant: ThaiConsonant, passCount: number): ChatMessage {
  const base = [
    '這題先跳過',
    `答案是 ${consonant.letter}`,
    `拼音 ${consonant.pinyin.join('/')}`,
    `注音 ${consonant.bopomofo.join('/')}`,
    '先記住字形 下一題再回來'
  ];

  if (passCount > 0) {
    base.push(`你已經跳過這個字 ${passCount} 次`);
  }

  return createVipMessage(base.join('\n'));
}

export function handleVipPlayerMessage(input: VipResponderInput): ChatMessage | null {
  const { rawInput, currentConsonant, currentAnchor, state, recentHistory } = input;

  const triggerKind = detectTriggerKind(rawInput);
  if (triggerKind !== 'hint' && shouldThrottleVip(state)) return null;

  const chance = triggerChance(triggerKind);
  if (Math.random() >= chance) return null;

  let text: string;
  if (triggerKind === 'hint') {
    text = createHintText(currentConsonant);
  } else if (triggerKind === 'fear') {
    text = createFearText();
  } else if (triggerKind === 'location') {
    text = createLocationText(currentAnchor);
  } else if (triggerKind === 'uncertain') {
    text = createUncertainText();
  } else {
    text = '你可以先用提示 或是用注音拼音試一個答案';
  }

  if (hasRecentDuplicate(text, recentHistory)) return null;
  return createVipMessage(text);
}

export function isVipHintCommand(raw: string) {
  return isHintRequest(raw);
}
