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
  VOICE_CONFIRM: {
    key: 'VOICE_CONFIRM',
    requiresTag: true,
    cooldownMs: 90_000,
    chance: 0.08,
    minActiveUsers: 1,
    usesLock: true,
    preEffect: { sfxKey: 'ghost_female' },
    postEffect: { sfxKey: 'ghost_female' }
  },
  GHOST_PING: {
    key: 'GHOST_PING',
    requiresTag: true,
    cooldownMs: 120_000,
    chance: 0.06,
    minActiveUsers: 3,
    lockOnStart: true,
    usesLock: true,
    preEffect: { sfxKey: 'ghost_female' },
    postEffect: { sfxKey: 'ghost_female' }
  },
  TV_EVENT: {
    key: 'TV_EVENT',
    requiresTag: true,
    cooldownMs: 90_000,
    chance: 0.07,
    minActiveUsers: 3,
    usesLock: true,
    preEffect: { videoKey: 'oldhouse_room_loop' },
    postEffect: { videoKey: 'oldhouse_room_loop2' }
  },
  NAME_CALL: {
    key: 'NAME_CALL',
    requiresTag: true,
    cooldownMs: 90_000,
    chance: 0.06,
    minActiveUsers: 1,
    usesLock: true,
    preEffect: { sfxKey: 'ghost_female' },
    postEffect: { sfxKey: 'ghost_female' }
  },
  VIEWER_SPIKE: {
    key: 'VIEWER_SPIKE',
    requiresTag: true,
    cooldownMs: 90_000,
    chance: 0.06,
    minActiveUsers: 1,
    usesLock: true,
    preEffect: { sfxKey: 'footsteps' },
    postEffect: { sfxKey: 'footsteps' }
  },
  LIGHT_GLITCH: {
    key: 'LIGHT_GLITCH',
    requiresTag: true,
    cooldownMs: 90_000,
    chance: 0.05,
    minActiveUsers: 1,
    usesLock: true,
    preEffect: { videoKey: 'oldhouse_room_loop2' },
    postEffect: { videoKey: 'oldhouse_room_loop2' }
  },
  FEAR_CHALLENGE: {
    key: 'FEAR_CHALLENGE',
    requiresTag: true,
    cooldownMs: 90_000,
    chance: 0.06,
    minActiveUsers: 1,
    usesLock: true,
    preEffect: { sfxKey: 'footsteps' },
    postEffect: { sfxKey: 'ghost_female' }
  }
};

export function getEventManifest() {
  return EVENT_REGISTRY_KEYS.map((key) => {
    const def = EVENT_REGISTRY[key];
    return {
      key,
      preEffect: {
        sfxKey: def.preEffect?.sfxKey,
        videoKey: def.preEffect?.videoKey
      },
      postEffect: {
        sfxKey: def.postEffect?.sfxKey,
        videoKey: def.postEffect?.videoKey
      },
      cooldownMs: def.cooldownMs,
      usesLock: Boolean(def.usesLock ?? def.lockOnStart)
    };
  });
}
