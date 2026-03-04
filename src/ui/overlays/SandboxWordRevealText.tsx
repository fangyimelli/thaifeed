export type SandboxWordRevealTextPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';

type Props = {
  visible: boolean;
  phase: SandboxWordRevealTextPhase;
  wordKey?: string;
  consonantFromPrompt?: string;
  mismatch?: boolean;
  durationMs?: number;
  wordText?: string;
};

export default function SandboxWordRevealText({
  visible,
  phase,
  wordKey,
  consonantFromPrompt,
  mismatch,
  durationMs,
  wordText
}: Props) {
  const resolvedWord = (wordText ?? '').trim();
  const textReady = resolvedWord.length > 0;

  if (!visible || !textReady || phase === 'idle' || phase === 'done' || mismatch) return null;

  return (
    <div
      className={`sandbox-word-reveal-text phase-${phase}`}
      aria-live="polite"
      data-word-key={wordKey ?? ''}
      style={{ animationDuration: `${Math.max(4000, durationMs ?? 4000)}ms` }}
    >
      <span className="sandbox-word-reveal-text__word">
        <span className="sandbox-word-reveal-text__glyph sandbox-word-reveal-text__glyph--base">{consonantFromPrompt ?? ''}</span>
        <span className="sandbox-word-reveal-text__glyph sandbox-word-reveal-text__glyph--rest">{resolvedWord.slice((consonantFromPrompt ?? '').length)}</span>
      </span>
    </div>
  );
}
