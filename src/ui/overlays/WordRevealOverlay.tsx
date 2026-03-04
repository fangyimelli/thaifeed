import { useEffect, useMemo, useState } from 'react';

export type WordRevealOverlayPhase = 'idle' | 'fadeIn' | 'hold' | 'fogOut';

type Props = {
  visible: boolean;
  phase: WordRevealOverlayPhase;
  text: string;
  highlightChar: string;
};

function renderHighlightedText(text: string, highlightChar: string) {
  if (!text) return null;
  const parts = text.split('');
  return parts.map((char, index) => {
    const key = `${char}-${index}`;
    if (char === highlightChar) {
      return <strong key={key} className="word-reveal-char-highlight">{char}</strong>;
    }
    return <span key={key}>{char}</span>;
  });
}

export default function WordRevealOverlay({ visible, phase, text, highlightChar }: Props) {
  const [internalPhase, setInternalPhase] = useState<WordRevealOverlayPhase>(phase);

  useEffect(() => {
    if (!visible || !text) {
      setInternalPhase('idle');
      return;
    }
    setInternalPhase('fadeIn');
    const holdTimer = window.setTimeout(() => setInternalPhase('hold'), 800);
    const fogTimer = window.setTimeout(() => setInternalPhase('fogOut'), 1700);
    const idleTimer = window.setTimeout(() => setInternalPhase('idle'), 2900);
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(fogTimer);
      window.clearTimeout(idleTimer);
    };
  }, [visible, text]);

  const resolvedPhase = useMemo<WordRevealOverlayPhase>(() => {
    if (!visible) return 'idle';
    if (phase !== 'idle') return phase;
    return internalPhase;
  }, [internalPhase, phase, visible]);

  if (!visible || !text || resolvedPhase === 'idle') return null;

  return (
    <div className={`word-reveal-overlay phase-${resolvedPhase}`} aria-live="polite">
      <div className="word-reveal-text">{renderHighlightedText(text, highlightChar)}</div>
    </div>
  );
}
