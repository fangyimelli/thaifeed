import type { ChatMessage } from '../state/types';
import { pickOne } from '../../utils/random';

const FORBIDDEN_MENTION_WORDS = new Set([
  '聊天室', '大家', '全體', '所有人', '觀眾', '管理員', 'admin', 'moderator', 'VIP', 'vip'
]);

const SYSTEM_USERNAMES = new Set(['system', 'you']);
const JOIN_SUFFIX = ' 加入聊天室';
const mentionRegex = /@([^\s@,，。.!！？?、:：;；()\[\]{}"'「」『』]+)/gu;

function normalizeMentionToken(token: string): string {
  return token.trim();
}

function cleanupSpacing(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,，。.!！？?、:：;；)\]}])/g, '$1')
    .trim();
}

export function collectActiveUsers(messages: ChatMessage[]): string[] {
  const list: string[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    if (message.type === 'system' && message.subtype === 'join') {
      const username = message.text.endsWith(JOIN_SUFFIX)
        ? message.text.slice(0, -JOIN_SUFFIX.length).trim()
        : '';
      if (username && !seen.has(username)) {
        seen.add(username);
        list.push(username);
      }
      continue;
    }

    if (message.type === 'system') continue;
    if (!message.username || SYSTEM_USERNAMES.has(message.username)) continue;

    if (!seen.has(message.username)) {
      seen.add(message.username);
      list.push(message.username);
    }
  }

  return list;
}

export function getActiveUserSet(activeUsers: string[]): Set<string> {
  const activeSet = new Set<string>();
  for (const username of activeUsers) {
    if (!username || FORBIDDEN_MENTION_WORDS.has(username)) continue;
    activeSet.add(username);
  }
  return activeSet;
}

export function pickMentionTarget(activeUsers: string[]): string | null {
  if (activeUsers.length < 3) return null;
  return pickOne(activeUsers);
}

export function sanitizeMentions(text: string, activeSet: Set<string>): string {
  const sanitized = text.replace(mentionRegex, (_full, rawToken: string) => {
    const token = normalizeMentionToken(rawToken);
    if (!token) return '';
    if (FORBIDDEN_MENTION_WORDS.has(token)) return '';
    if (!activeSet.has(token)) return '';
    return `@${token}`;
  });

  return cleanupSpacing(sanitized);
}

export function sanitizeTemplateMentions(text: string): string {
  const sanitized = text.replace(mentionRegex, (full, rawToken: string) => {
    const token = normalizeMentionToken(rawToken);
    if (!token) return '';
    if (FORBIDDEN_MENTION_WORDS.has(token)) return '';
    return full;
  });
  return cleanupSpacing(sanitized);
}

export function applyMentionV2(text: string, activeUsers: string[]): string {
  const activeSet = getActiveUserSet(activeUsers);
  const target = pickMentionTarget(activeUsers);
  if (!target) return sanitizeMentions(text, activeSet);

  const options = [`@${target} ${text}`, `${text} @${target}`, `${text}，@${target}`];
  return sanitizeMentions(pickOne(options), activeSet);
}
