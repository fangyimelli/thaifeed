export type OldhouseLoopKey = 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4';

export const MAIN_LOOP: OldhouseLoopKey = 'oldhouse_room_loop3';

export const JUMP_LOOPS: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2', 'oldhouse_room_loop4'];

export const VIDEO_KEYS: OldhouseLoopKey[] = [
  'oldhouse_room_loop',
  'oldhouse_room_loop2',
  'oldhouse_room_loop3',
  'oldhouse_room_loop4'
];

export const VIDEO_SOURCES: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: '/assets/scenes/oldhouse_room_loop.mp4',
  oldhouse_room_loop2: '/assets/scenes/oldhouse_room_loop2.mp4',
  oldhouse_room_loop3: '/assets/scenes/oldhouse_room_loop3.mp4',
  oldhouse_room_loop4: '/assets/scenes/oldhouse_room_loop3.mp4'
};

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

export const AUDIO_SOURCES = {
  fan_loop: '/assets/sfx/fan_loop.wav',
  footsteps: '/assets/sfx/footsteps.wav',
  ghost: '/assets/sfx/ghost_female.wav',
  female_ghost: '/assets/sfx/ghost_female.wav'
} as const;

export const AMBIENT_BY_KEY: Record<OldhouseLoopKey, string> = {
  oldhouse_room_loop: AUDIO_SOURCES.fan_loop,
  oldhouse_room_loop2: AUDIO_SOURCES.fan_loop,
  oldhouse_room_loop3: AUDIO_SOURCES.fan_loop,
  oldhouse_room_loop4: AUDIO_SOURCES.fan_loop
};

export type RequiredAudioAsset = {
  name: string;
  src: string;
};

export const REQUIRED_AUDIO_ASSETS: RequiredAudioAsset[] = [
  { name: 'fan_loop', src: AUDIO_SOURCES.fan_loop },
  { name: 'footsteps', src: AUDIO_SOURCES.footsteps },
  { name: 'ghost', src: AUDIO_SOURCES.ghost },
  { name: 'female_ghost', src: AUDIO_SOURCES.female_ghost },
  ...VIDEO_KEYS.map((key) => ({ name: `ambient_${key}`, src: AMBIENT_BY_KEY[key] })).filter(
    (asset, index, list) => list.findIndex((candidate) => candidate.src === asset.src) === index
  )
];
