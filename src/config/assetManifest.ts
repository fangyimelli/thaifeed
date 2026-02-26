import {
  REQUIRED_AUDIO_ASSETS,
  VIDEO_KEYS,
  VIDEO_PATH_BY_KEY,
  type OldhouseLoopKey
} from './oldhousePlayback';

export type AssetType = 'video' | 'image' | 'audio';

export type AssetManifestItem = {
  type: AssetType;
  src: string;
  required: boolean;
};

const REQUIRED_VIDEOS: OldhouseLoopKey[] = ['oldhouse_room_loop', 'oldhouse_room_loop2', 'oldhouse_room_loop3', 'oldhouse_room_loop4'];
const OPTIONAL_VIDEOS = VIDEO_KEYS.filter((key) => !REQUIRED_VIDEOS.includes(key));

export const ASSET_MANIFEST: AssetManifestItem[] = [
  ...REQUIRED_VIDEOS.map((key) => ({ type: 'video' as const, src: VIDEO_PATH_BY_KEY[key], required: true })),
  ...OPTIONAL_VIDEOS.map((key) => ({ type: 'video' as const, src: VIDEO_PATH_BY_KEY[key], required: false })),
  ...REQUIRED_AUDIO_ASSETS.map((asset) => ({
    type: 'audio' as const,
    src: asset.src,
    required: true
  })),
  { type: 'image', src: '/assets/overlays/overlay_smoke_room.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_crack_glass.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_noise_film.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_vignette.png', required: true },
  { type: 'image', src: '/assets/icons/icon_crown.svg', required: false }
];
