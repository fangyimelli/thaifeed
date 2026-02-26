import type { OldhouseLoopKey } from '../../config/oldhousePlayback';

export type SceneEventPayload = {
  type: 'VIDEO_ACTIVE';
  key: OldhouseLoopKey;
  startedAt: number;
};

const sceneEventTarget = new EventTarget();

export function emitSceneEvent(payload: SceneEventPayload): void {
  sceneEventTarget.dispatchEvent(new CustomEvent<SceneEventPayload>('scene-event', { detail: payload }));
}

export function onSceneEvent(handler: (payload: SceneEventPayload) => void): () => void {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<SceneEventPayload>;
    handler(custom.detail);
  };

  sceneEventTarget.addEventListener('scene-event', listener);
  return () => sceneEventTarget.removeEventListener('scene-event', listener);
}

