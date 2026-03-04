export type SandboxWordRevealTextPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';

type Props = {
  visible: boolean;
  phase: SandboxWordRevealTextPhase;
  baseText?: string;
  restText?: string;
  position?: { xPct: number; yPct: number };
};

export default function SandboxWordRevealText({
  visible,
  phase,
  baseText,
  restText,
  position
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
        top: `${position?.yPct ?? 36}%`
      }}
    >
      <span className="sandbox-word-reveal-text__word pulseAndScaleFade">
        <span className="sandbox-word-reveal-text__glyph sandbox-word-reveal-text__glyph--base">{resolvedBase}</span>
        <span className="sandbox-word-reveal-text__glyph sandbox-word-reveal-text__glyph--rest">{resolvedRest}</span>
      </span>
    </div>
  );
}
