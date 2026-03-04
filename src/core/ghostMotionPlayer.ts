import { resolveAssetUrl } from '../config/assetUrls';
import { requestSceneAction } from './systems/sceneEvents';
import type { GhostMotionPack } from '../ssot/sandbox_story/types';

export type GhostMotionState = 'idle' | 'playing';

export type GhostMotionPlayResult = {
  state: GhostMotionState;
  lastId: string | null;
};

const GHOST_SFX_SRC = resolveAssetUrl('assets/sfx/ghost_female.wav');

let activeTimers: number[] = [];
let current: GhostMotionPlayResult = {
  state: 'idle',
  lastId: null
};

function clearTimers() {
  activeTimers.forEach((id) => window.clearTimeout(id));
  activeTimers = [];
}

function setTimeoutTracked(cb: () => void, delay: number) {
  const id = window.setTimeout(cb, delay);
  activeTimers.push(id);
}

export function playGhostMotion(pack: GhostMotionPack): GhostMotionPlayResult {
  clearTimers();
  current = { state: 'playing', lastId: pack.id };

  const sfx = new Audio(GHOST_SFX_SRC);
  void sfx.play().catch(() => undefined);

  setTimeoutTracked(() => {
    requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop4', reason: `ghost_motion:${pack.id}:loop4`, sourceEventKey: 'GHOST_PING' });
  }, 1200);

  setTimeoutTracked(() => {
    requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop3', reason: `ghost_motion:${pack.id}:loop3`, sourceEventKey: 'GHOST_PING' });
  }, 6800);

  setTimeoutTracked(() => {
    current = { state: 'idle', lastId: pack.id };
  }, 13_000);

  return current;
}

export function getGhostMotionState() {
  return current;
}
