export type AssetType = 'video' | 'image' | 'audio';

export type AssetManifestItem = {
  type: AssetType;
  src: string;
};

export const ASSET_MANIFEST: AssetManifestItem[] = [
  // Scene
  { type: 'video', src: '/assets/scenes/oldhouse_room_loop.mp4' },

  // Overlays
  { type: 'image', src: '/assets/overlays/overlay_smoke_room.png' },
  { type: 'image', src: '/assets/overlays/overlay_crack_glass.png' },
  { type: 'image', src: '/assets/overlays/overlay_noise_film.png' },
  { type: 'image', src: '/assets/overlays/overlay_vignette.png' },

  // Icons
  { type: 'image', src: '/assets/icons/icon_crown.svg' },

  // SFX
  { type: 'audio', src: '/assets/sfx/sfx_typing.wav' },
  { type: 'audio', src: '/assets/sfx/sfx_send.wav' },
  { type: 'audio', src: '/assets/sfx/sfx_success.wav' },
  { type: 'audio', src: '/assets/sfx/sfx_error.wav' },
  { type: 'audio', src: '/assets/sfx/sfx_glitch.wav' }
];
