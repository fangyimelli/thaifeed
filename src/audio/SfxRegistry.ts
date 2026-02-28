import { FAN_LOOP_PATH, FOOTSTEPS_PATH, GHOST_FEMALE_PATH } from '../config/oldhousePlayback';

export type SfxKind = 'loop' | 'oneshot';

export interface SfxSpec {
  key: string;
  file: string;
  kind: SfxKind;
  mutexGroup?: string;
  cooldownMs?: number;
  defaultVolume?: number;
}

export const SFX_REGISTRY: Record<string, SfxSpec> = {
  fan_loop: { key: 'fan_loop', file: FAN_LOOP_PATH, kind: 'loop', defaultVolume: 0.4 },
  footsteps: { key: 'footsteps', file: FOOTSTEPS_PATH, kind: 'oneshot', mutexGroup: 'oneshot_scare', cooldownMs: 120_000, defaultVolume: 0.85 },
  ghost_female: { key: 'ghost_female', file: GHOST_FEMALE_PATH, kind: 'oneshot', mutexGroup: 'oneshot_scare', cooldownMs: 180_000, defaultVolume: 0.75 }
};

export type SfxKey = keyof typeof SFX_REGISTRY;

export function getSfxSpec(key: string): SfxSpec | null {
  return SFX_REGISTRY[key] ?? null;
}

export function assertSfxKey(key: string): SfxKey {
  if (!(key in SFX_REGISTRY)) {
    throw new Error(`Unknown SFX key: ${key}`);
  }
  return key as SfxKey;
}
