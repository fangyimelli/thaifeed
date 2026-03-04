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
  const graphemes = Array.from(wordText);
  const baseGraphemes = Array.from(baseConsonant || '');
  const suffix = graphemes.slice(baseGraphemes.length).join('');
  const suffixGraphemes = Array.from(suffix);
  if (phase === 'fadeIn') return suffixGraphemes.slice(0, Math.ceil(suffixGraphemes.length * 0.45)).join('');
  if (phase === 'hold' || phase === 'fogOut' || phase === 'done') return suffix;
  return '';
}

export default function WordRevealOverlay({ visible, phase, text, wordText, highlightChar, baseConsonant }: Props) {
  const resolvedText = wordText ?? text ?? '';
  const resolvedBase = baseConsonant ?? highlightChar ?? Array.from(resolvedText)[0] ?? '';
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
