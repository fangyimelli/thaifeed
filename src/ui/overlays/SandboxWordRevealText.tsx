import { useEffect } from 'react';

export type SandboxWordRevealTextPhase = 'idle' | 'hidden' | 'word' | 'warning' | 'done';

export default function SandboxWordRevealText(props: {
  visible?: boolean;
  phase?: SandboxWordRevealTextPhase;
  consonant?: string;
  wordKey?: string;
  wordText?: string;
  durationMs?: number;
  mismatch?: boolean;
  onRenderStateChange?: (state: { rendered: boolean; blockedReason: string }) => void;
}) {
  const revealText = props.wordText ?? props.consonant ?? '';
  useEffect(() => {
    if (!props.visible) {
      props.onRenderStateChange?.({ rendered: false, blockedReason: 'hidden' });
      return;
    }
    if (!revealText) {
      props.onRenderStateChange?.({ rendered: false, blockedReason: 'missing_word_text' });
      return;
    }
    props.onRenderStateChange?.({ rendered: true, blockedReason: '' });
  }, [props.visible, revealText, props.onRenderStateChange]);

  if (!props.visible) return null;
  return <div className="sandbox-word-reveal-text"><div className="sandbox-word-reveal-text__word">{revealText}</div></div>;
}
