import { resolveAssetUrl } from './assetUrls';

export type OldhouseLoopKey = 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4';

export type PublicLoopKey = 'loop1' | 'loop2' | 'loop3' | 'loop4';
export type LoopRequestKey = OldhouseLoopKey | PublicLoopKey;

export const LOOP_KEY_ALIASES: Record<string, OldhouseLoopKey> = {
  oldhouse_room_loop: 'oldhouse_room_loop',
  oldhouse_room_loop2: 'oldhouse_room_loop2',
  oldhouse_room_loop3: 'oldhouse_room_loop3',
  oldhouse_room_loop4: 'oldhouse_room_loop4',
  loop1: 'oldhouse_room_loop',
  loop2: 'oldhouse_room_loop2',
  loop3: 'oldhouse_room_loop3',
  loop4: 'oldhouse_room_loop4'
};

export const VIDEO_KEYS: OldhouseLoopKey[] = [
  'oldhouse_room_loop',
  'oldhouse_room_loop2',
  'oldhouse_room_loop3',
  'oldhouse_room_loop4'
];

export const MAIN_LOOP: OldhouseLoopKey = 'oldhouse_room_loop3';
export const JUMP_LOOPS: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2'];

export const VIDEO_RELATIVE_PATH_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: 'assets/scenes/oldhouse_room_loop.mp4',
  oldhouse_room_loop2: 'assets/scenes/oldhouse_room_loop2.mp4',
  oldhouse_room_loop3: 'assets/scenes/oldhouse_room_loop3.mp4',
  oldhouse_room_loop4: 'assets/scenes/oldhouse_room_loop4.mp4'
};

export const VIDEO_PATH_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: resolveAssetUrl(VIDEO_RELATIVE_PATH_BY_KEY.oldhouse_room_loop),
  oldhouse_room_loop2: resolveAssetUrl(VIDEO_RELATIVE_PATH_BY_KEY.oldhouse_room_loop2),
  oldhouse_room_loop3: resolveAssetUrl(VIDEO_RELATIVE_PATH_BY_KEY.oldhouse_room_loop3),
  oldhouse_room_loop4: resolveAssetUrl(VIDEO_RELATIVE_PATH_BY_KEY.oldhouse_room_loop4)
};

export const FAN_LOOP_RELATIVE_PATH = 'assets/sfx/fan_loop.wav';
export const FOOTSTEPS_RELATIVE_PATH = 'assets/sfx/footsteps.wav';
export const GHOST_FEMALE_RELATIVE_PATH = 'assets/sfx/ghost_female.wav';

export const FAN_LOOP_PATH = resolveAssetUrl(FAN_LOOP_RELATIVE_PATH);
export const FOOTSTEPS_PATH = resolveAssetUrl(FOOTSTEPS_RELATIVE_PATH);
export const GHOST_FEMALE_PATH = resolveAssetUrl(GHOST_FEMALE_RELATIVE_PATH);

export type RequiredAudioAsset = {
  name: string;
  relativePath: string;
  src: string;
};

export const REQUIRED_VIDEO_ASSETS = VIDEO_KEYS.map((key) => ({
  name: key,
  relativePath: VIDEO_RELATIVE_PATH_BY_KEY[key],
  src: VIDEO_PATH_BY_KEY[key]
}));

export const REQUIRED_AUDIO_ASSETS: RequiredAudioAsset[] = [
  { name: 'fan_loop', relativePath: FAN_LOOP_RELATIVE_PATH, src: FAN_LOOP_PATH },
  { name: 'footsteps', relativePath: FOOTSTEPS_RELATIVE_PATH, src: FOOTSTEPS_PATH },
  { name: 'ghost_female', relativePath: GHOST_FEMALE_RELATIVE_PATH, src: GHOST_FEMALE_PATH }
];
