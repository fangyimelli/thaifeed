export type AssetType = 'video' | 'image' | 'audio';

export type AssetManifestItem = {
  type: AssetType;
  src: string;
  required: boolean;
};

export const ASSET_MANIFEST: AssetManifestItem[] = [
  // Required: Scene
  { type: 'video', src: '/assets/scenes/oldhouse_room_loop.mp4', required: true },
  { type: 'video', src: '/assets/scenes/oldhouse_room_loop2.mp4', required: false },
  { type: 'audio', src: '/assets/sfx/oldhouse_room_loop.wav', required: false },
  { type: 'audio', src: '/assets/sfx/oldhouse_room_loop2.wav', required: false },

  // Required: Overlays
  { type: 'image', src: '/assets/overlays/overlay_smoke_room.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_crack_glass.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_noise_film.png', required: true },
  { type: 'image', src: '/assets/overlays/overlay_vignette.png', required: true },

  // Optional: Icons
  { type: 'image', src: '/assets/icons/icon_crown.svg', required: false },

  // Optional: SFX
  { type: 'audio', src: '/assets/sfx/sfx_typing.wav', required: false },
  { type: 'audio', src: '/assets/sfx/sfx_send.wav', required: false },
  { type: 'audio', src: '/assets/sfx/sfx_success.wav', required: false },
  { type: 'audio', src: '/assets/sfx/sfx_error.wav', required: false },
  { type: 'audio', src: '/assets/sfx/sfx_glitch.wav', required: false }
];
