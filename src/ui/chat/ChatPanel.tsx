import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import { collectActiveUsers, getActiveUserSet, sanitizeMentions } from '../../core/systems/mentionV2';
import ChatMessage from './ChatMessage';

type Props = {
  messages: ChatMessageType[];
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToggleTranslation: (id: string) => void;
  onAutoPauseChange: (paused: boolean) => void;
};

const STICK_BOTTOM_THRESHOLD = 80;
const MAX_RENDER_COUNT = 100;

export default function ChatPanel({
  messages,
  input,
  onChange,
  onSubmit,
  onToggleTranslation,
  onAutoPauseChange
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number>(0);
  const [stickBottom, setStickBottom] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const [viewportMaxHeight, setViewportMaxHeight] = useState<number | undefined>(undefined);
  const activeSet = getActiveUserSet(collectActiveUsers(messages));
  const sanitizedMessages = messages.map((message) => ({
    ...message,
    text: sanitizeMentions(message.text, activeSet),
    translation: message.translation ? sanitizeMentions(message.translation, activeSet) : message.translation
  }));

  const forceScrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const conditionalScrollToBottom = () => {
    const el = messageListRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < STICK_BOTTOM_THRESHOLD) {
      forceScrollToBottom();
    }
  };

  useLayoutEffect(() => {
    conditionalScrollToBottom();
  }, [messages]);

  useEffect(() => {
    const box = messageListRef.current;
    if (!box) return;

    const overflowed = box.scrollHeight > box.clientHeight * 1.2;
    if (overflowed && stickBottom) {
      setAutoPaused(true);
      onAutoPauseChange(true);
    }
  }, [messages, stickBottom, onAutoPauseChange]);

  useEffect(() => {
    const resume = () => {
      if (!autoPaused) return;
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        setAutoPaused(false);
        onAutoPauseChange(false);
      }, 1000);
    };

    window.addEventListener('mousemove', resume);
    window.addEventListener('keydown', resume);
    window.addEventListener('wheel', resume, { passive: true });
    return () => {
      window.removeEventListener('mousemove', resume);
      window.removeEventListener('keydown', resume);
      window.removeEventListener('wheel', resume);
      window.clearTimeout(idleTimer.current);
    };
  }, [autoPaused, onAutoPauseChange]);

  useEffect(() => {
    if (!window.visualViewport) return;

    const syncViewport = () => {
      const panelTop = panelRef.current?.getBoundingClientRect().top ?? 0;
      const visibleHeight = Math.max(220, window.visualViewport!.height - panelTop);
      setViewportMaxHeight(visibleHeight);
    };

    syncViewport();
    window.visualViewport.addEventListener('resize', syncViewport);
    window.visualViewport.addEventListener('scroll', syncViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  return (
    <aside className="chat-panel" ref={panelRef} style={viewportMaxHeight ? { maxHeight: `${viewportMaxHeight}px` } : undefined}>
      <header className="chat-header">
        <strong>聊天室</strong>
      </header>

      <div
        ref={messageListRef}
        className="chat-list"
        onScroll={(event) => {
          const el = event.currentTarget;
          const distanceBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          setStickBottom(distanceBottom < STICK_BOTTOM_THRESHOLD);
        }}
      >
        <div className="chat-items">
          {sanitizedMessages.slice(-MAX_RENDER_COUNT).map((message) => (
            <ChatMessage key={message.id} message={message} onToggleTranslation={onToggleTranslation} />
          ))}
          <div ref={messageEndRef} />
        </div>
      </div>

      {!stickBottom && (
        <button
          className="jump-bottom"
          type="button"
          onClick={() => {
            forceScrollToBottom();
            setStickBottom(true);
          }}
        >
          最新訊息
        </button>
      )}

      <div className="chat-input">
        <input
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSubmit();
              window.setTimeout(forceScrollToBottom, 0);
            }
          }}
          placeholder="傳送訊息"
        />
        <button
          type="button"
          onClick={() => {
            onSubmit();
            window.setTimeout(forceScrollToBottom, 0);
          }}
        >
          送出
        </button>
      </div>
    </aside>
  );
}
