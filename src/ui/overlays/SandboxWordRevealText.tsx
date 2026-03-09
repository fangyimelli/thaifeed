export type SandboxWordRevealTextPhase = 'idle' | 'hidden' | 'word' | 'warning' | 'done';

export default function SandboxWordRevealText(props: {
  visible?: boolean;
  phase?: SandboxWordRevealTextPhase;
  consonant?: string;
  wordKey?: string;
  wordText?: string;
  durationMs?: number;
  mismatch?: boolean;
}) {
  if (!props.visible) return null;
  return <div className="sandbox-word-reveal-text"><div className="sandbox-word-reveal-text__word">{props.wordText ?? props.consonant ?? ''}</div></div>;
}
