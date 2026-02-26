import { resolveAssetUrl } from './assetUrls';
import { REQUIRED_AUDIO_ASSETS, REQUIRED_VIDEO_ASSETS } from './oldhousePlayback';

export type AssetType = 'video' | 'image' | 'audio';

export type AssetManifestItem = {
  type: AssetType;
  src: string;
  required: boolean;
};

export const ASSET_MANIFEST: AssetManifestItem[] = [
  ...REQUIRED_VIDEO_ASSETS.map((asset) => ({ type: 'video' as const, src: asset.src, required: true })),
  ...REQUIRED_AUDIO_ASSETS.map((asset) => ({
    type: 'audio' as const,
    src: asset.src,
    required: true
  })),
  { type: 'image', src: resolveAssetUrl('assets/overlays/overlay_smoke_room.png'), required: true },
  { type: 'image', src: resolveAssetUrl('assets/overlays/overlay_crack_glass.png'), required: true },
  { type: 'image', src: resolveAssetUrl('assets/overlays/overlay_noise_film.png'), required: true },
  { type: 'image', src: resolveAssetUrl('assets/overlays/overlay_vignette.png'), required: true },
  { type: 'image', src: resolveAssetUrl('assets/icons/icon_crown.svg'), required: false }
];
