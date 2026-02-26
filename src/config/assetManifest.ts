import { AUDIO_SOURCES, VIDEO_SOURCES } from './media';

export type AssetType = 'video' | 'image' | 'audio';

export type AssetManifestItem = {
  type: AssetType;
  src: string;
  required: boolean;
};

const REQUIRED_VIDEOS: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2', 'oldhouse_room_loop3'];

export const ASSET_MANIFEST: AssetManifestItem[] = [
  // Required: Scene
  { type: 'video', src: VIDEO_SOURCES.oldhouse_room_loop, required: true },
  { type: 'video', src: VIDEO_SOURCES.oldhouse_room_loop2, required: false },
  { type: 'video', src: VIDEO_SOURCES.oldhouse_room_loop3, required: true },
  { type: 'video', src: VIDEO_SOURCES.oldhouse_room_loop4, required: true },

  // Required: Oldhouse SFX
  { type: 'audio', src: AUDIO_SOURCES.fan_loop, required: true },
  { type: 'audio', src: AUDIO_SOURCES.footsteps, required: true },
  { type: 'audio', src: AUDIO_SOURCES.female_ghost, required: true },

  { type: 'image', src: '/assets/overlays/overlay_smoke_room.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_crack_glass.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_noise_film.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_vignette.png', required: true },

  { type: 'image', src: '/assets/icons/icon_crown.svg', required: false },

  ...REQUIRED_AUDIO_ASSETS.map((asset) => ({
    type: 'audio' as const,
    src: asset.src,
    required: true
  }))
];
