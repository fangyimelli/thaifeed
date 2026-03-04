export type WordRevealOverlayPhase = 'idle' | 'fadeIn' | 'scaleUp' | 'fadeOut' | 'done';

type Props = {
  visible: boolean;
  phase: WordRevealOverlayPhase;
  wordText?: string;
  baseConsonant?: string;
  appendedText?: string;
};

function resolveSuffixByPhase(appendedText: string, phase: WordRevealOverlayPhase) {
  const graphemes = Array.from(appendedText || '');
  if (phase === 'fadeIn') return graphemes.slice(0, Math.max(1, Math.ceil(graphemes.length * 0.45))).join('');
  return appendedText;
}

export default function WordRevealOverlay({ visible, phase, wordText, baseConsonant, appendedText }: Props) {
  const resolvedWord = wordText ?? '';
  const resolvedBase = baseConsonant ?? Array.from(resolvedWord)[0] ?? '';
  const resolvedAppended = appendedText ?? '';
  if (!visible || (!resolvedBase && !resolvedAppended) || phase === 'idle' || phase === 'done') return null;
  const suffix = resolveSuffixByPhase(resolvedAppended, phase);
  return (
    <div className={`word-reveal-overlay phase-${phase}`} aria-live="polite">
      <div className="word-reveal-text">
        <strong className="word-reveal-char-highlight">{resolvedBase}</strong>
        <span className="word-reveal-suffix">{suffix}</span>
      </div>
    </div>
  );
}
