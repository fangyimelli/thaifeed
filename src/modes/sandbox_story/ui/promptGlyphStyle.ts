export type GlyphStyleToken = {
  baseColor: string;
  opacity: number;
  glowCss?: string;
  filterCss?: string;
  source: 'cssVar' | 'themeToken';
};

const PROMPT_GLYPH_BASE_COLOR = 'rgba(182, 236, 255, 0.98)';

const clampOpacity = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
};

export const buildSandboxPromptGlyphStyleToken = (params: {
  curse: number;
  opacity: number;
}): GlyphStyleToken => {
  const { curse, opacity } = params;
  return {
    baseColor: PROMPT_GLYPH_BASE_COLOR,
    opacity: clampOpacity(opacity),
    glowCss: `0 0 ${18 + curse / 3}px rgba(134, 217, 255, ${0.7 + curse / 300}), 0 0 ${40 + curse / 2}px rgba(88, 162, 255, ${0.45 + curse / 250})`,
    filterCss: `contrast(${1 + curse / 180})`,
    source: 'themeToken'
  };
};

export const buildRevealRestColor = (opacity: number): string => `rgba(255, 255, 255, ${clampOpacity(opacity)})`;
