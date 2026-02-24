import { useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import ChatMessage from './ChatMessage';

export type ChatPanelSettings = {
  title: string;
  inputPlaceholder: string;
  submitLabel: string;
  jumpToLatestLabel: string;
  maxRenderCount: number;
  stickBottomThreshold: number;
  audienceMinMs: number;
  audienceMaxMs: number;
};

type Props = {
  settings: ChatPanelSettings;
  messages: ChatMessageType[];
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToggleTranslation: (id: string) => void;
};

export default function ChatPanel({
  settings,
  messages,
  input,
  onChange,
  onSubmit,
  onToggleTranslation
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [stickBottom, setStickBottom] = useState(true);

  useLayoutEffect(() => {
    const box = scrollerRef.current;
    if (!box || !stickBottom) return;
    box.scrollTop = box.scrollHeight;
  }, [messages, stickBottom]);

  return (
    <aside className="chat-panel">
      <header className="chat-header">
        <strong>{settings.title}</strong>
      </header>

      <div
        ref={scrollerRef}
        className="chat-list"
        onScroll={(event) => {
          const el = event.currentTarget;
          const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < settings.stickBottomThreshold;
          setStickBottom(isBottom);
        }}
      >
        <div className="chat-items">
          {messages.slice(-settings.maxRenderCount).map((message) => (
            <ChatMessage key={message.id} message={message} onToggleTranslation={onToggleTranslation} />
          ))}
        </div>
      </div>

      {!stickBottom && (
        <button
          className="jump-bottom"
          type="button"
          onClick={() => {
            const box = scrollerRef.current;
            if (box) box.scrollTop = box.scrollHeight;
            setStickBottom(true);
          }}
        >
          {settings.jumpToLatestLabel}
        </button>
      )}

      <div className="chat-input">
        <input
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          placeholder={settings.inputPlaceholder}
        />
        <button type="button" onClick={onSubmit}>
          {settings.submitLabel}
        </button>
      </div>
    </aside>
  );
}
