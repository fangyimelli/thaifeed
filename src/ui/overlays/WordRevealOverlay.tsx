export type WordRevealOverlayPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';
export type WordRevealRenderMode = 'pair' | 'fullWord';

type Props = {
  visible: boolean;
  phase: WordRevealOverlayPhase;
  renderMode?: WordRevealRenderMode;
  wordText?: string;
  baseConsonant?: string;
  appendedText?: string;
};

const splitGraphemes = (text: string) => Array.from(text || '');

export default function WordRevealOverlay({
  visible,
  phase,
  renderMode = 'fullWord',
  wordText,
  baseConsonant,
  appendedText
}: Props) {
  const resolvedWord = wordText ?? '';
  const graphemes = splitGraphemes(resolvedWord);
  const fallbackBaseChar = graphemes[0] ?? '';
  const resolvedBaseChar = (baseConsonant && splitGraphemes(baseConsonant)[0]) || fallbackBaseChar;
  const resolvedRest = renderMode === 'pair' ? (appendedText ?? '') : graphemes.slice(1).join('');
  const isFullWord = renderMode === 'fullWord';

  if (!visible || !resolvedWord || phase === 'idle' || phase === 'done') return null;

  return (
    <div className={`word-reveal-overlay phase-${phase}`} aria-live="polite">
      <div className="word-reveal-text" data-render-mode={renderMode}>
        {isFullWord ? (
          <>
            <span className="word-reveal-char-highlight">{fallbackBaseChar}</span>
            <span className="word-reveal-rest">{resolvedRest}</span>
          </>
        ) : (
          <>
            <span className="word-reveal-char-highlight">{resolvedBaseChar}</span>
            <span className="word-reveal-rest">{resolvedRest}</span>
          </>
        )}
      </div>
    </div>
  );
}
