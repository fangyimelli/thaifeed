import type { OldhouseLoopKey } from '../config/oldhousePlayback';
import type { SfxKey } from '../audio/SfxRegistry';

export type EventKey = string;

export interface SfxPlan {
  key: SfxKey;
  delayMs?: number;
}

export interface ScenePlan {
  sceneKey: OldhouseLoopKey;
  delayMs?: number;
}

export interface FollowUpPlan {
  eventKey: EventKey;
  delayMs: number;
}

export interface EventSpec {
  key: EventKey;
  kind: 'tag' | 'ambient' | 'lock' | 'system';
  priority: 1 | 2 | 3;
  cooldownMs: number;
  sharedCooldownKey?: string;
  mutexGroup?: string;
  requiresLockFree?: boolean;
  requiresActiveUsersMin?: number;
  actor: 'user' | 'ghost' | 'viewer' | 'system';
  lineKey: string;
  sfxPlan?: SfxPlan;
  scenePlan?: ScenePlan;
  followUps?: FollowUpPlan[];
}

export const EVENT_REGISTRY: Record<EventKey, EventSpec> = {
  IDLE_TICK: { key: 'IDLE_TICK', kind: 'ambient', priority: 1, cooldownMs: 2200, actor: 'viewer', lineKey: 'idle_boring' },
  USER_SENT: { key: 'USER_SENT', kind: 'tag', priority: 2, cooldownMs: 2400, actor: 'viewer', lineKey: 'social_reply', requiresActiveUsersMin: 1 },
  SCENE_SWITCH_REACT: { key: 'SCENE_SWITCH_REACT', kind: 'ambient', priority: 2, cooldownMs: 1800, actor: 'viewer', lineKey: 'scene_flicker', requiresLockFree: true },
  SFX_FAN_REACT: { key: 'SFX_FAN_REACT', kind: 'ambient', priority: 1, cooldownMs: 1600, actor: 'viewer', lineKey: 'sfx_fan' },
  SFX_FOOTSTEPS_REACT: {
    key: 'SFX_FOOTSTEPS_REACT', kind: 'ambient', priority: 2, cooldownMs: 1600, actor: 'viewer', lineKey: 'sfx_footsteps',
    sfxPlan: { key: 'footsteps' }, sharedCooldownKey: 'scare_sfx', mutexGroup: 'oneshot_scare', requiresLockFree: true
  },
  SFX_GHOST_REACT: {
    key: 'SFX_GHOST_REACT', kind: 'ambient', priority: 3, cooldownMs: 2000, actor: 'ghost', lineKey: 'sfx_ghost',
    sfxPlan: { key: 'ghost_female' }, sharedCooldownKey: 'scare_sfx', mutexGroup: 'oneshot_scare', requiresLockFree: true
  },
  LOCK_START: {
    key: 'LOCK_START', kind: 'lock', priority: 3, cooldownMs: 4000, actor: 'system', lineKey: 'lock_start', mutexGroup: 'lock_exclusive',
    followUps: [
      { eventKey: 'LOCK_REMIND_20S', delayMs: 20_000 },
      { eventKey: 'LOCK_REMIND_40S', delayMs: 40_000 },
      { eventKey: 'LOCK_ESCALATE_60S', delayMs: 60_000 }
    ]
  },
  LOCK_REMIND_20S: { key: 'LOCK_REMIND_20S', kind: 'lock', priority: 2, cooldownMs: 2000, actor: 'system', lineKey: 'lock_remind_20' },
  LOCK_REMIND_40S: { key: 'LOCK_REMIND_40S', kind: 'lock', priority: 2, cooldownMs: 2000, actor: 'system', lineKey: 'lock_remind_40' },
  LOCK_ESCALATE_60S: {
    key: 'LOCK_ESCALATE_60S', kind: 'lock', priority: 3, cooldownMs: 2000, actor: 'ghost', lineKey: 'lock_escalate_60',
    sfxPlan: { key: 'ghost_female', delayMs: 200 }, scenePlan: { sceneKey: 'oldhouse_room_loop2', delayMs: 600 }, sharedCooldownKey: 'scare_sfx', mutexGroup: 'oneshot_scare'
  },
  EVT_TV_MOVED: { key: 'EVT_TV_MOVED', kind: 'system', priority: 2, cooldownMs: 8_000, actor: 'system', lineKey: 'evt_tv_moved', scenePlan: { sceneKey: 'oldhouse_room_loop2' } }
};
