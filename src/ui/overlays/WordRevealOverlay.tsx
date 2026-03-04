export type WordRevealOverlayPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';

type Props = {
  visible: boolean;
  phase: WordRevealOverlayPhase;
  wordText?: string;
  baseText?: string;
  appendedText?: string;
};

export default function WordRevealOverlay({
  visible,
  phase,
  wordText,
  baseText,
  appendedText
}: Props) {
  const resolvedWord = (wordText ?? '').trim();
  const resolvedBase = (baseText ?? '').trim();
  const resolvedRest = appendedText ?? '';
  const textReady = resolvedWord.length > 0 && resolvedBase.length > 0;

  if (!visible || !textReady || phase === 'idle' || phase === 'done') return null;

  return (
    <div className={`word-reveal-overlay phase-${phase}`} aria-live="polite" data-overlay-count="1">
      <div className="revealText pulseAndExit">
        <span className="revealGlyph revealGlyph--base">{resolvedBase}</span>
        <span className="revealGlyph revealGlyph--rest">{resolvedRest}</span>
      </div>
    </div>
  );
}
