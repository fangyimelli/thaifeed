import type { StoryEventDefinition, StoryEventKey } from './eventTypes';

export const EVENT_REGISTRY_KEYS: StoryEventKey[] = [
  'VOICE_CONFIRM',
  'GHOST_PING',
  'TV_EVENT',
  'NAME_CALL',
  'VIEWER_SPIKE',
  'LIGHT_GLITCH',
  'FEAR_CHALLENGE'
];

export const EVENT_REGISTRY: Record<StoryEventKey, StoryEventDefinition> = {
  VOICE_CONFIRM: { key: 'VOICE_CONFIRM', requiresTag: true, cooldownMs: 90_000, chance: 0.08, minActiveUsers: 1 },
  GHOST_PING: { key: 'GHOST_PING', requiresTag: true, cooldownMs: 120_000, chance: 0.06, minActiveUsers: 3, lockOnStart: true },
  TV_EVENT: { key: 'TV_EVENT', requiresTag: true, cooldownMs: 90_000, chance: 0.07, minActiveUsers: 3 },
  NAME_CALL: { key: 'NAME_CALL', requiresTag: true, cooldownMs: 90_000, chance: 0.06, minActiveUsers: 1 },
  VIEWER_SPIKE: { key: 'VIEWER_SPIKE', requiresTag: true, cooldownMs: 90_000, chance: 0.06, minActiveUsers: 1 },
  LIGHT_GLITCH: { key: 'LIGHT_GLITCH', requiresTag: true, cooldownMs: 90_000, chance: 0.05, minActiveUsers: 1 },
  FEAR_CHALLENGE: { key: 'FEAR_CHALLENGE', requiresTag: true, cooldownMs: 90_000, chance: 0.06, minActiveUsers: 1 }
};
