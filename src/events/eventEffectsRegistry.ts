import { EVENT_REGISTRY, EVENT_REGISTRY_KEYS } from '../core/events/eventRegistry';
import type { StoryEventKey } from '../core/events/eventTypes';

export type EventEffectConfig = {
  sfx: Array<'ghost_female' | 'footsteps' | 'low_rumble'>;
  video: 'loop1' | 'loop2' | 'loop3' | 'loop4' | null;
  blackout: boolean;
};

const toEventSfx = (key: string | undefined): EventEffectConfig['sfx'][number] | null => {
  if (key === 'ghost_female' || key === 'footsteps') return key;
  return null;
};

export const EVENT_EFFECTS: Record<StoryEventKey, EventEffectConfig> = EVENT_REGISTRY_KEYS.reduce((acc, eventKey) => {
  const def = EVENT_REGISTRY[eventKey];
  const mapped = [toEventSfx(def.preEffect?.sfxKey), toEventSfx(def.postEffect?.sfxKey)].filter((key): key is EventEffectConfig['sfx'][number] => Boolean(key));
  const uniqueSfx = Array.from(new Set(mapped));

  if (eventKey === 'LIGHT_GLITCH') {
    uniqueSfx.push('low_rumble');
  }

  acc[eventKey] = {
    sfx: uniqueSfx,
    video: eventKey === 'TV_EVENT' ? 'loop4' : eventKey === 'LIGHT_GLITCH' ? 'loop2' : null,
    blackout: eventKey !== 'TV_EVENT'
  };
  return acc;
}, {} as Record<StoryEventKey, EventEffectConfig>);
