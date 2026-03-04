export type WordRevealOverlayPhase = 'idle' | 'fadeIn' | 'hold' | 'fogOut' | 'done';

type Props = {
  visible: boolean;
  phase: WordRevealOverlayPhase;
  text?: string;
  wordText?: string;
  highlightChar?: string;
  baseConsonant?: string;
};

function resolveSuffixByPhase(wordText: string, baseConsonant: string, phase: WordRevealOverlayPhase) {
  const suffix = wordText.startsWith(baseConsonant) ? wordText.slice(baseConsonant.length) : wordText;
  if (phase === 'fadeIn') return suffix.slice(0, Math.max(1, Math.ceil(suffix.length * 0.5)));
  if (phase === 'hold' || phase === 'fogOut' || phase === 'done') return suffix;
  return '';
}

export default function WordRevealOverlay({ visible, phase, text, wordText, highlightChar, baseConsonant }: Props) {
  const resolvedText = wordText ?? text ?? '';
  const resolvedBase = baseConsonant ?? highlightChar ?? resolvedText.slice(0, 1);
  if (!visible || !resolvedText || phase === 'idle' || phase === 'done') return null;
  const suffix = resolveSuffixByPhase(resolvedText, resolvedBase, phase);
  return (
    <div className={`word-reveal-overlay phase-${phase}`} aria-live="polite">
      <div className="word-reveal-text">
        <strong className="word-reveal-char-highlight">{resolvedBase}</strong>
        <span className="word-reveal-suffix">{suffix}</span>
      </div>
    </div>
  );
}
