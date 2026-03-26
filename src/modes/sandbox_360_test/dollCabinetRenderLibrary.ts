import type { DollCabinetTarget, DollVariant } from './dollCabinetSystem';

export type DollLayerAsset = {
  source: string;
  sourceId: string;
};

export type DollVariantRenderPath = {
  slotId: DollCabinetTarget['cabinetSlot'];
  neutral: DollLayerAsset | null;
  glance_to_player: DollLayerAsset | null;
  stare_player: DollLayerAsset | null;
  hard_stare: DollLayerAsset | null;
  eyeOverlay: DollLayerAsset | null;
  highlightOverlay: DollLayerAsset | null;
};

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const headSvg = (fillA: string, fillB: string, shadow: string, eyeX: number, eyeY: number, pupilOffsetX: number, glareX: number, glareY: number, mouthCurve: string) =>
  svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="skin" cx="50%" cy="34%" r="68%">
          <stop offset="0%" stop-color="${fillA}" />
          <stop offset="100%" stop-color="${fillB}" />
        </radialGradient>
        <radialGradient id="shade" cx="58%" cy="62%" r="70%">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="100%" stop-color="${shadow}" />
        </radialGradient>
      </defs>
      <path d="M120 26c44 0 76 30 76 77 0 50-31 92-76 92S44 153 44 103c0-47 32-77 76-77Z" fill="url(#skin)" />
      <path d="M72 98c18 0 28 12 28 26 0 14-9 28-28 28S45 138 45 124s9-26 27-26Zm96 0c18 0 27 12 27 26 0 14-9 28-27 28s-28-14-28-28c0-14 10-26 28-26Z" fill="rgba(22,28,36,.62)" />
      <circle cx="${eyeX}" cy="${eyeY}" r="20" fill="rgba(232,238,246,.88)" />
      <circle cx="${eyeX + 64}" cy="${eyeY}" r="20" fill="rgba(232,238,246,.88)" />
      <circle cx="${eyeX + pupilOffsetX}" cy="${eyeY + 2}" r="10" fill="rgba(15,24,32,.96)" />
      <circle cx="${eyeX + 64 + pupilOffsetX}" cy="${eyeY + 2}" r="10" fill="rgba(15,24,32,.96)" />
      <circle cx="${glareX}" cy="${glareY}" r="4" fill="rgba(255,255,255,.9)" />
      <circle cx="${glareX + 64}" cy="${glareY}" r="4" fill="rgba(255,255,255,.9)" />
      <path d="${mouthCurve}" stroke="rgba(40,20,20,.55)" stroke-width="4" fill="none" stroke-linecap="round" />
      <ellipse cx="120" cy="128" rx="88" ry="90" fill="url(#shade)" />
    </svg>`
  );

const eyeOverlaySvg = (offsetX: number, opacity: number, glow: string) =>
  svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <ellipse cx="${85 + offsetX}" cy="113" rx="30" ry="17" fill="${glow}" opacity="${opacity}" />
      <ellipse cx="${155 + offsetX}" cy="113" rx="30" ry="17" fill="${glow}" opacity="${opacity}" />
    </svg>`
  );

const highlightSvg = (intensity: number) =>
  svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <radialGradient id="hl" cx="42%" cy="30%" r="70%">
        <stop offset="0%" stop-color="rgba(210,238,255,${intensity})"/>
        <stop offset="70%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
      <rect width="240" height="240" fill="url(#hl)"/>
    </svg>`
  );

const neutral = headSvg('#d8d2c9', '#8f8479', 'rgba(9,10,14,.4)', 88, 108, -1, 96, 101, 'M90 158c10 6 50 7 60 0');
const glance = headSvg('#ddd5cb', '#8a7d72', 'rgba(8,10,14,.46)', 84, 109, -8, 90, 101, 'M88 158c11 5 53 5 63 -1');
const stare = headSvg('#e0d8ce', '#7b6f66', 'rgba(6,8,14,.58)', 88, 111, 0, 95, 101, 'M92 160c14 2 42 2 56 -1');
const hardStare = headSvg('#e6ddd2', '#72665d', 'rgba(4,6,12,.72)', 88, 112, 2, 94, 100, 'M94 161c16 -2 34 -2 52 0');

const SLOT_LIBRARY: Record<DollCabinetTarget['cabinetSlot'], DollVariantRenderPath> = {
  top_center: {
    slotId: 'top_center',
    neutral: { source: neutral, sourceId: 'doll_head_top_center_neutral_v1' },
    glance_to_player: { source: glance, sourceId: 'doll_head_top_center_glance_v1' },
    stare_player: { source: stare, sourceId: 'doll_head_top_center_stare_v1' },
    hard_stare: { source: hardStare, sourceId: 'doll_head_top_center_hard_stare_v1' },
    eyeOverlay: { source: eyeOverlaySvg(-4, 0.34, 'rgba(142,190,248,.75)'), sourceId: 'doll_eye_top_center_overlay_v1' },
    highlightOverlay: { source: highlightSvg(0.18), sourceId: 'doll_highlight_top_center_overlay_v1' }
  },
  top_right: {
    slotId: 'top_right',
    neutral: { source: neutral, sourceId: 'doll_head_top_right_neutral_v1' },
    glance_to_player: { source: glance, sourceId: 'doll_head_top_right_glance_v1' },
    stare_player: { source: stare, sourceId: 'doll_head_top_right_stare_v1' },
    hard_stare: { source: hardStare, sourceId: 'doll_head_top_right_hard_stare_v1' },
    eyeOverlay: { source: eyeOverlaySvg(-2, 0.4, 'rgba(182,220,255,.72)'), sourceId: 'doll_eye_top_right_overlay_v1' },
    highlightOverlay: { source: highlightSvg(0.16), sourceId: 'doll_highlight_top_right_overlay_v1' }
  },
  bottom_center: {
    slotId: 'bottom_center',
    neutral: { source: neutral, sourceId: 'doll_head_bottom_center_neutral_v1' },
    glance_to_player: { source: glance, sourceId: 'doll_head_bottom_center_glance_v1' },
    stare_player: { source: stare, sourceId: 'doll_head_bottom_center_stare_v1' },
    hard_stare: { source: hardStare, sourceId: 'doll_head_bottom_center_hard_stare_v1' },
    eyeOverlay: { source: eyeOverlaySvg(-6, 0.46, 'rgba(188,230,255,.78)'), sourceId: 'doll_eye_bottom_center_overlay_v1' },
    highlightOverlay: { source: highlightSvg(0.21), sourceId: 'doll_highlight_bottom_center_overlay_v1' }
  },
  bottom_right: {
    slotId: 'bottom_right',
    neutral: { source: neutral, sourceId: 'doll_head_bottom_right_neutral_v1' },
    glance_to_player: { source: glance, sourceId: 'doll_head_bottom_right_glance_v1' },
    stare_player: { source: stare, sourceId: 'doll_head_bottom_right_stare_v1' },
    hard_stare: { source: hardStare, sourceId: 'doll_head_bottom_right_hard_stare_v1' },
    eyeOverlay: { source: eyeOverlaySvg(-3, 0.5, 'rgba(205,236,255,.82)'), sourceId: 'doll_eye_bottom_right_overlay_v1' },
    highlightOverlay: { source: highlightSvg(0.24), sourceId: 'doll_highlight_bottom_right_overlay_v1' }
  },
  top_left: { slotId: 'top_left', neutral: null, glance_to_player: null, stare_player: null, hard_stare: null, eyeOverlay: null, highlightOverlay: null },
  bottom_left: { slotId: 'bottom_left', neutral: null, glance_to_player: null, stare_player: null, hard_stare: null, eyeOverlay: null, highlightOverlay: null }
};

export const resolveDollVariantRenderPath = (
  slotId: DollCabinetTarget['cabinetSlot'],
  requestedVariant: DollVariant
) => {
  const slot = SLOT_LIBRARY[slotId];
  const fallbackVariantMap: Record<DollVariant, DollVariant | 'hidden'> = {
    neutral: slot.neutral ? 'neutral' : 'hidden',
    glance_to_player: slot.glance_to_player ? 'glance_to_player' : slot.neutral ? 'neutral' : 'hidden',
    stare_player: slot.stare_player ? 'stare_player' : slot.neutral ? 'neutral' : 'hidden',
    hard_stare: slot.hard_stare ? 'hard_stare' : slot.neutral ? 'neutral' : 'hidden'
  };
  const resolvedVariant = fallbackVariantMap[requestedVariant];
  const selectedAsset = resolvedVariant === 'hidden' ? null : slot[resolvedVariant];
  return {
    slot,
    requestedVariant,
    resolvedVariant,
    selectedAsset,
    fallbackVariantMap
  };
};
