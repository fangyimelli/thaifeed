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
  isSending: boolean;
};

const STICK_BOTTOM_THRESHOLD = 80;
const MAX_RENDER_COUNT = 100;

export default function ChatPanel({
  messages,
  input,
  onChange,
  onSubmit,
  onToggleTranslation,
  onAutoPauseChange,
  isSending
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLFormElement>(null);
  const idleTimer = useRef<number>(0);
  const isComposingRef = useRef(false);
  const [stickBottom, setStickBottom] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
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

    const syncInputWithViewport = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const inputBar = inputBarRef.current;
      if (!inputBar) return;
      inputBar.style.transform = keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : 'translateY(0)';
    };

    syncInputWithViewport();
    window.visualViewport.addEventListener('resize', syncInputWithViewport);
    window.visualViewport.addEventListener('scroll', syncInputWithViewport);

    return () => {
      const inputBar = inputBarRef.current;
      if (inputBar) inputBar.style.transform = 'translateY(0)';
      window.visualViewport?.removeEventListener('resize', syncInputWithViewport);
      window.visualViewport?.removeEventListener('scroll', syncInputWithViewport);
    };
  }, []);

  return (
    <aside className="chat-panel" ref={panelRef}>
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

      <form
        className="chat-input chat-input-bar"
        ref={inputBarRef}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
          window.setTimeout(forceScrollToBottom, 0);
        }}
      >
        <input
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onKeyDown={(event) => {
            const nativeIsComposing = (event.nativeEvent as KeyboardEvent).isComposing;
            const isImeEnter = event.keyCode === 229;
            if (event.key === 'Enter' && !event.shiftKey && !isComposingRef.current && !nativeIsComposing && !isImeEnter) {
              event.preventDefault();
              onSubmit();
              window.setTimeout(forceScrollToBottom, 0);
            }
          }}
          placeholder="傳送訊息"
        />
        <button
          type="button"
          disabled={isSending}
          onClick={() => {
            onSubmit();
            window.setTimeout(forceScrollToBottom, 0);
          }}
          onTouchEnd={(event) => {
            event.preventDefault();
            onSubmit();
            window.setTimeout(forceScrollToBottom, 0);
          }}
        >
          {isSending ? '送出中…' : '送出'}
        </button>
      </form>
    </aside>
  );
}
