import {
  buildRevealRestColor,
  type GlyphStyleToken
} from '../../modes/sandbox_story/ui/promptGlyphStyle';

export type SandboxWordRevealTextPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';

type Props = {
  visible: boolean;
  phase: SandboxWordRevealTextPhase;
  baseText?: string;
  restText?: string;
  position?: { xPct: number; yPct: number };
  glyphStyleToken: GlyphStyleToken;
};

export default function SandboxWordRevealText({
  visible,
  phase,
  baseText,
  restText,
  position,
  glyphStyleToken
}: Props) {
  const resolvedBase = (baseText ?? '').trim();
  const resolvedRest = restText ?? '';
  const textReady = resolvedBase.length > 0;

  if (!visible || !textReady || phase === 'idle' || phase === 'done') return null;

  return (
    <div
      className={`sandbox-word-reveal-text phase-${phase}`}
      aria-live="polite"
      style={{
        left: `${position?.xPct ?? 50}%`,
        top: `${position?.yPct ?? 36}%`,
        opacity: glyphStyleToken.opacity,
        filter: glyphStyleToken.filterCss,
        textShadow: glyphStyleToken.glowCss
      }}
    >
      <span className="sandbox-word-reveal-text__word pulseAndScaleFade">
        <span className="sandbox-word-reveal-text__glyph sandbox-word-reveal-text__glyph--base" style={{ color: glyphStyleToken.baseColor }}>
          {resolvedBase}
        </span>
        <span
          className="sandbox-word-reveal-text__glyph sandbox-word-reveal-text__glyph--rest"
          style={{ color: buildRevealRestColor(glyphStyleToken.opacity) }}
        >
          {resolvedRest}
        </span>
      </span>
    </div>
  );
}
