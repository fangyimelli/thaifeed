import type { ChatLanguage, PersonaId } from './ChatTypes';

const DENY_PATTERNS = [/根據/, /參數/, /模組/, /流程/, /舞台/, /（.*）/, /^\[旁白\]/];
const BANNED_TAGS = new Set(['VIP_NORMAL', 'VIP_STILL_HERE', 'system', 'you', 'fake_ai', 'mod_live', 'chat_mod']);

export function normalizeText(input: string): string {
  return input
    .replace(/[。．｡]/g, '')
    .replace(/\s+([啦欸啊喔嘛吧呢])/, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDeniedTone(text: string): boolean {
  return DENY_PATTERNS.some((pattern) => pattern.test(text));
}

export function enforceSingleLanguage(text: string, language: ChatLanguage): string {
  if (language === 'zh') return text.replace(/[\u0E00-\u0E7F]/g, '').trim();
  return text.replace(/[\u4e00-\u9fff]/g, '').trim();
}

export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export function canUseTag(activeUsers: string[]): boolean {
  return activeUsers.length >= 3;
}

export function pickTagTarget(activeUsers: string[]): string | undefined {
  const candidates = activeUsers.filter((name) => !BANNED_TAGS.has(name));
  if (candidates.length === 0) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function applyTagTemplate(text: string, tagTarget?: string): string {
  if (!text.includes('@{tag}')) return text;
  if (!tagTarget) return text.replace(/@\{tag\}\s*/g, '').trim();
  return text.replace(/@\{tag\}/g, `@${tagTarget}`);
}

export function isPersonaRepeated(personaId: PersonaId | undefined, recent: Array<PersonaId | undefined>, windowSize: number): boolean {
  if (!personaId) return false;
  return recent.slice(-windowSize).includes(personaId);
}
