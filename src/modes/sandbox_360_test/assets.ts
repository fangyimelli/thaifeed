import { resolveAssetUrl } from '../../config/assetUrls';

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// NOTE: binary assets are not supported in this repository workflow.
// Keep sandbox_360_test path resolution isolated in this file so we can
// switch to dedicated sandbox binaries later without touching shared viewers.
export const SANDBOX360_SCENE_IMAGE_SRC = resolveAssetUrl('assets/scenes/room_360.png');
export const SANDBOX360_SCENE_IMAGE_FALLBACK_SRC = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><radialGradient id="bg" cx="58%" cy="42%" r="72%"><stop offset="0%" stop-color="#37404f"/><stop offset="55%" stop-color="#1f2733"/><stop offset="100%" stop-color="#0b1018"/></radialGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1b1f29"/><stop offset="100%" stop-color="#0d1118"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#bg)"/><rect y="690" width="1920" height="390" fill="url(#floor)"/><rect x="220" y="260" width="430" height="300" rx="12" fill="#171d28" stroke="#313a4d" stroke-width="4"/><rect x="1180" y="250" width="510" height="290" rx="16" fill="#171c27" stroke="#2f3747" stroke-width="4"/><circle cx="1450" cy="400" r="42" fill="#d6c58a" opacity="0.18"/><rect x="820" y="410" width="280" height="420" fill="#121721"/><rect x="860" y="180" width="200" height="120" fill="#1a2230"/><path d="M0 690L360 590L760 640L1130 570L1550 650L1920 610V1080H0Z" fill="#0b0f16" opacity="0.72"/></svg>');
export const SANDBOX360_DOLL_LAYER_ASSETS = {
  open: resolveAssetUrl('assets/sandbox_360_test/dolls/doll_layer_open.png'),
  look: resolveAssetUrl('assets/sandbox_360_test/dolls/doll_layer_look.png'),
  closed: resolveAssetUrl('assets/sandbox_360_test/dolls/doll_layer_closed.png')
} as const;

export const SANDBOX360_DOLL_LAYER_FALLBACK_ASSETS = {
  open: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 520"><rect width="320" height="520" fill="none"/><ellipse cx="160" cy="118" rx="62" ry="74" fill="#d8c4b5" fill-opacity="0.95"/><path d="M90 112c7-43 43-77 70-77s63 34 70 77" fill="none" stroke="#7b2f23" stroke-width="14" stroke-linecap="round"/><ellipse cx="138" cy="118" rx="8" ry="10" fill="#171717"/><ellipse cx="182" cy="118" rx="8" ry="10" fill="#171717"/><path d="M126 152c12 8 56 8 68 0" fill="none" stroke="#89534a" stroke-width="3" stroke-linecap="round"/><path d="M124 198h72l22 174H102z" fill="#4869b3" fill-opacity="0.92"/><path d="M102 372h116l36 120H66z" fill="#355296" fill-opacity="0.9"/></svg>'),
  look: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 520"><rect width="320" height="520" fill="none"/><ellipse cx="160" cy="118" rx="62" ry="74" fill="#d8c4b5" fill-opacity="0.95"/><path d="M90 112c7-43 43-77 70-77s63 34 70 77" fill="none" stroke="#7b2f23" stroke-width="14" stroke-linecap="round"/><ellipse cx="138" cy="116" rx="11" ry="13" fill="#111"/><ellipse cx="182" cy="116" rx="11" ry="13" fill="#111"/><path d="M118 92h84" fill="none" stroke="#7c2f2f" stroke-width="4"/><path d="M126 152c12 8 56 8 68 0" fill="none" stroke="#89534a" stroke-width="3" stroke-linecap="round"/><path d="M124 198h72l22 174H102z" fill="#4869b3" fill-opacity="0.92"/><path d="M102 372h116l36 120H66z" fill="#355296" fill-opacity="0.9"/></svg>'),
  closed: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 520"><rect width="320" height="520" fill="none"/><ellipse cx="160" cy="118" rx="62" ry="74" fill="#d8c4b5" fill-opacity="0.95"/><path d="M90 112c7-43 43-77 70-77s63 34 70 77" fill="none" stroke="#7b2f23" stroke-width="14" stroke-linecap="round"/><path d="M130 126c8 5 16 5 24 0" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/><path d="M166 126c8 5 16 5 24 0" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/><path d="M126 152c12 8 56 8 68 0" fill="none" stroke="#89534a" stroke-width="3" stroke-linecap="round"/><path d="M124 198h72l22 174H102z" fill="#4869b3" fill-opacity="0.92"/><path d="M102 372h116l36 120H66z" fill="#355296" fill-opacity="0.9"/></svg>')
} as const;

export const SANDBOX360_OVERLAY_ASSETS = {
  roomLight: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><radialGradient id="g" cx="70%" cy="40%" r="70%"><stop offset="0%" stop-color="#fff7d6" stop-opacity="0.5"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient><rect width="1920" height="1080" fill="url(#g)"/></svg>'),
  tvNoise: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" stitchTiles="stitch"/></filter><rect width="320" height="180" filter="url(#n)" opacity="0.33"/></svg>'),
  maskCrack: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><path d="M390 90L640 300L580 460L760 610L730 880" stroke="#1a1a1a" stroke-width="6" fill="none" opacity="0.46"/><path d="M1180 120L1240 300L1130 500L1320 760L1200 980" stroke="#0f0f0f" stroke-width="5" fill="none" opacity="0.35"/></svg>')
} as const;
