import type { SfxKey } from '../../audio/SfxRegistry';
import type { OldhouseLoopKey } from '../../config/oldhousePlayback';

export type SceneEventPayload =
  | { type: 'VIDEO_ACTIVE'; key: OldhouseLoopKey; startedAt: number }
  | { type: 'SFX_START'; sfxKey: SfxKey; startedAt: number };

export type SceneRequestPayload =
  | {
    type: 'REQUEST_SFX';
    sfxKey: SfxKey;
    reason: string;
    source?: 'event' | 'system' | 'unknown';
    delayMs?: number;
    startVolume?: number;
    endVolume?: number;
    rampSec?: number;
  }
  | { type: 'REQUEST_SCENE_SWITCH'; sceneKey: OldhouseLoopKey; reason: string; delayMs?: number }
  | { type: 'DEBUG_FORCE_JUMP_NOW' }
  | { type: 'DEBUG_RESCHEDULE_JUMP' };

const sceneEventTarget = new EventTarget();

export function emitSceneEvent(payload: SceneEventPayload): void {
  sceneEventTarget.dispatchEvent(new CustomEvent<SceneEventPayload>('scene-event', { detail: payload }));
}

export function requestSceneAction(payload: SceneRequestPayload): void {
  sceneEventTarget.dispatchEvent(new CustomEvent<SceneRequestPayload>('scene-request', { detail: payload }));
}

export function onSceneEvent(handler: (payload: SceneEventPayload) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<SceneEventPayload>).detail);
  sceneEventTarget.addEventListener('scene-event', listener);
  return () => sceneEventTarget.removeEventListener('scene-event', listener);
}

export function onSceneRequest(handler: (payload: SceneRequestPayload) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<SceneRequestPayload>).detail);
  sceneEventTarget.addEventListener('scene-request', listener);
  return () => sceneEventTarget.removeEventListener('scene-request', listener);
}
