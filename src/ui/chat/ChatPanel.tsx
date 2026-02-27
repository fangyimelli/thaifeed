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
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef<number>(0);
  const isComposingRef = useRef(false);
  const baselineViewportHeightRef = useRef<number>(window.innerHeight);
  const [stickBottom, setStickBottom] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const activeSet = getActiveUserSet(collectActiveUsers(messages));
  const sanitizedMessages = messages.map((message) => ({
    ...message,
    text: sanitizeMentions(message.text, activeSet),
    translation: message.translation ? sanitizeMentions(message.translation, activeSet) : message.translation
  }));

  const forceScrollToBottom = () => {
    const listEl = messageListRef.current;
    if (listEl) {
      listEl.scrollTop = listEl.scrollHeight;
    }
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const conditionalScrollToBottom = () => {
    const el = messageListRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < STICK_BOTTOM_THRESHOLD) {
      forceScrollToBottom();
    }
  };

  const handleMessageSubmit = () => {
    onSubmit();
    inputRef.current?.blur();
    window.scrollTo(0, 0);
    window.setTimeout(() => {
      forceScrollToBottom();
    }, 0);
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
    const vv = window.visualViewport;
    if (!vv) return;

    baselineViewportHeightRef.current = Math.max(baselineViewportHeightRef.current, vv.height);

    const onViewportResize = () => {
      const baseline = Math.max(baselineViewportHeightRef.current, window.innerHeight);
      const keyboardLikelyOpen = vv.height < baseline - 120;
      if (keyboardLikelyOpen) {
        forceScrollToBottom();
      } else {
        baselineViewportHeightRef.current = Math.max(baselineViewportHeightRef.current, vv.height);
      }
    };

    vv.addEventListener('resize', onViewportResize);
    return () => {
      vv.removeEventListener('resize', onViewportResize);
    };
  }, []);

  return (
    <section className="chat-panel">
      <header className="chat-header input-surface">
        <strong>聊天室</strong>
      </header>

      <div
        ref={messageListRef}
        className="chat-messages chat-list"
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
        className="chat-input input-surface"
        onSubmit={(event) => {
          event.preventDefault();
          handleMessageSubmit();
        }}
      >
        <input
          ref={inputRef}
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
              handleMessageSubmit();
            }
          }}
          placeholder="傳送訊息"
        />
        <button
          type="button"
          disabled={isSending}
          onClick={handleMessageSubmit}
          onTouchEnd={(event) => {
            event.preventDefault();
            handleMessageSubmit();
          }}
        >
          {isSending ? '送出中…' : '送出'}
        </button>
      </form>
    </section>
  );
}
