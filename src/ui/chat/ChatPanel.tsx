import { useEffect, useRef, useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import ChatMessage from './ChatMessage';

type Props = {
  messages: ChatMessageType[];
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToggleTranslation: (id: string) => void;
};

export default function ChatPanel({ messages, input, onChange, onSubmit, onToggleTranslation }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [stickBottom, setStickBottom] = useState(true);

  useEffect(() => {
    const box = scrollerRef.current;
    if (!box || !stickBottom) return;
    box.scrollTop = box.scrollHeight;
  }, [messages, stickBottom]);

  return (
    <aside className="chat-panel">
      <header className="chat-header">
        <strong>直播聊天室</strong>
        <span>{messages.length} 則訊息</span>
      </header>

      <div
        ref={scrollerRef}
        className="chat-list"
        onScroll={(event) => {
          const el = event.currentTarget;
          const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
          setStickBottom(isBottom);
        }}
      >
        {messages.slice(-80).map((message) => (
          <ChatMessage key={message.id} message={message} onToggleTranslation={onToggleTranslation} />
        ))}
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
          查看最新訊息
        </button>
      )}

      <div className="chat-input">
        <input
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          placeholder="輸入訊息"
        />
        <button type="button" onClick={onSubmit}>
          送出
        </button>
      </div>
    </aside>
  );
}
