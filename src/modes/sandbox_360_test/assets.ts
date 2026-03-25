import { resolveAssetUrl } from '../../config/assetUrls';

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// NOTE: binary assets are not supported in this repository workflow.
// Keep sandbox_360_test path resolution isolated in this file so we can
// switch to dedicated sandbox binaries later without touching shared viewers.
export const SANDBOX360_SCENE_IMAGE_SRC = resolveAssetUrl('assets/scenes/room_360.png');

export const SANDBOX360_OVERLAY_ASSETS = {
  roomLight: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><radialGradient id="g" cx="70%" cy="40%" r="70%"><stop offset="0%" stop-color="#fff7d6" stop-opacity="0.5"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient><rect width="1920" height="1080" fill="url(#g)"/></svg>'),
  tvNoise: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" stitchTiles="stitch"/></filter><rect width="320" height="180" filter="url(#n)" opacity="0.33"/></svg>'),
  maskCrack: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><path d="M390 90L640 300L580 460L760 610L730 880" stroke="#1a1a1a" stroke-width="6" fill="none" opacity="0.46"/><path d="M1180 120L1240 300L1130 500L1320 760L1200 980" stroke="#0f0f0f" stroke-width="5" fill="none" opacity="0.35"/></svg>')
} as const;
