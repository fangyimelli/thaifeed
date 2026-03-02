import type { StoryEventKey } from '../core/events/eventTypes';

export type EventEffectConfig = {
  sfx: Array<'ghost_female' | 'footsteps' | 'low_rumble'>;
  video: 'loop1' | 'loop2' | 'loop3' | 'loop4' | null;
  blackout: boolean;
};

export const EVENT_EFFECTS: Record<StoryEventKey, EventEffectConfig> = {
  VOICE_CONFIRM: { sfx: ['ghost_female'], video: null, blackout: true },
  GHOST_PING: { sfx: ['ghost_female'], video: null, blackout: true },
  TV_EVENT: { sfx: [], video: 'loop4', blackout: false },
  NAME_CALL: { sfx: ['ghost_female'], video: null, blackout: true },
  VIEWER_SPIKE: { sfx: ['footsteps'], video: null, blackout: true },
  LIGHT_GLITCH: { sfx: ['low_rumble'], video: 'loop2', blackout: true },
  FEAR_CHALLENGE: { sfx: ['footsteps'], video: null, blackout: true }
};
