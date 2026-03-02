import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import { collectActiveUsers, getActiveUserSet, sanitizeMentions } from '../../core/systems/mentionV2';
import ChatMessage from './ChatMessage';
import { isMobileDevice } from '../../utils/isMobile';
import type { SendResult, SendSource } from '../../app/App';

type Props = {
  messages: ChatMessageType[];
  input: string;
  onChange: (value: string) => void;
  onSubmit: (source: SendSource) => Promise<SendResult>;
  onToggleTranslation: (id: string) => void;
  onAutoPauseChange: (paused: boolean) => void;
  isSending: boolean;
  isReady: boolean;
  isComposing: boolean;
  loadingStatusText: string;
  onInputHeightChange?: (height: number) => void;
  onCompositionStateChange: (isComposing: boolean) => void;
  sendFeedback?: string | null;
  onDebugSimulateSend?: () => Promise<SendResult>;
  onDebugToggleSelfTag?: () => void;
  onDebugToggleComposing?: () => void;
  onSendButtonClick?: () => void;
  lockTarget?: string | null;
  isLocked?: boolean;
  questionMessageId?: string | null;
  qnaStatus?: 'IDLE' | 'ASKING' | 'AWAITING_REPLY' | 'RESOLVED' | 'ABORTED';
  activeUserInitialHandle: string;
  autoScrollMode: 'FOLLOW' | 'COUNTDOWN_FREEZE' | 'FROZEN';
  replyPreviewSuppressedReason?: string | null;
};

const STICK_BOTTOM_THRESHOLD = 80;
const MAX_RENDER_COUNT = 100;
const KEYBOARD_CLOSE_FOLLOWUP_MS = 250;
const KEYBOARD_VIEWPORT_SYNC_WINDOW_MS = 500;

export default function ChatPanel({
  messages,
  input,
  onChange,
  onSubmit,
  onToggleTranslation,
  onAutoPauseChange,
  isSending,
  isReady,
  isComposing,
  loadingStatusText,
  onInputHeightChange,
  onCompositionStateChange,
  sendFeedback,
  onDebugSimulateSend,
  onDebugToggleSelfTag,
  onDebugToggleComposing,
  onSendButtonClick,
  lockTarget,
  isLocked,
  questionMessageId,
  qnaStatus = 'IDLE',
  activeUserInitialHandle,
  autoScrollMode,
  replyPreviewSuppressedReason = null
}: Props) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardSinkRef = useRef<HTMLButtonElement>(null);
  const inputFormRef = useRef<HTMLFormElement>(null);
  const submitPendingRef = useRef(false);
  const idleTimer = useRef<number>(0);
  const isComposingRef = useRef(false);
  const viewportSyncUntilRef = useRef(0);
  const [stickBottom, setStickBottom] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const isMobile = isMobileDevice();
  const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  const activeSet = getActiveUserSet(collectActiveUsers(messages));
  const sanitizedMessages = messages.map((message) => ({
    ...message,
    text: sanitizeMentions(message.text, activeSet),
    translation: message.translation ? sanitizeMentions(message.translation, activeSet) : message.translation
  }));
  const originalMessage = questionMessageId
    ? sanitizedMessages.find((message) => message.id === questionMessageId)
    : null;

  const originalMessageHasActiveUserTag = Boolean(originalMessage && activeUserInitialHandle && originalMessage.text.includes(`@${activeUserInitialHandle}`));
  const shouldRenderReplyPreview = Boolean(qnaStatus === 'AWAITING_REPLY' && questionMessageId && isLocked && lockTarget && originalMessageHasActiveUserTag);

  const truncateReplyText = (text: string, limit: number) => {
    const singleLine = text.replace(/\s*\n+\s*/gu, ' ').trim();
    if (!singleLine) return '';
    const intlWithSegmenter = Intl as typeof Intl & { Segmenter?: new (locale: string, options: { granularity: 'grapheme' }) => { segment: (input: string) => Iterable<{ segment: string }> } };
    const segmented = typeof Intl !== 'undefined' && intlWithSegmenter.Segmenter
      ? Array.from(new intlWithSegmenter.Segmenter('zh', { granularity: 'grapheme' }).segment(singleLine), (segment) => segment.segment)
      : Array.from(singleLine);
    if (segmented.length <= limit) return singleLine;
    return `${segmented.slice(0, limit).join('')}…`;
  };
  const replyPreviewText = originalMessage ? truncateReplyText(originalMessage.text, 40) : '（原始訊息已不存在）';

  const logDebugState = (reason: string) => {
    if (!debugEnabled) return;
    const listEl = messageListRef.current;
    const activeEl = document.activeElement as HTMLElement | null;
    console.log('[CHAT_DEBUG]', {
      reason,
      activeElement: activeEl
        ? { tagName: activeEl.tagName, className: activeEl.className }
        : { tagName: 'NONE', className: '' },
      isMobile,
      chatScroll: listEl
        ? {
            scrollTop: listEl.scrollTop,
            scrollHeight: listEl.scrollHeight,
            clientHeight: listEl.clientHeight
          }
        : null,
      visualViewportHeight: window.visualViewport?.height ?? null
    });
  };

  const scrollChatToBottom = (reason: string) => {
    const listEl = messageListRef.current;
    if (listEl) {
      listEl.scrollTop = listEl.scrollHeight;
    }
    logDebugState(`scroll:${reason}`);
  };

  const conditionalScrollToBottom = () => {
    if (autoScrollMode === 'FROZEN') {
      logDebugState('scroll-skipped:autoScrollMode:FROZEN');
      return;
    }
    const el = messageListRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < STICK_BOTTOM_THRESHOLD) {
      scrollChatToBottom('conditional-stick-bottom');
    }
  };

  const closeKeyboard = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    inputEl.blur();

    if (document.activeElement === inputEl) {
      const sink = keyboardSinkRef.current;
      sink?.focus();
      sink?.blur();
    }

    viewportSyncUntilRef.current = Date.now() + KEYBOARD_VIEWPORT_SYNC_WINDOW_MS;
    logDebugState('closeKeyboard');
  };

  const handleMessageSubmit = async (source: SendSource) => {
    const result = await onSubmit(source);
    if (!result.ok) return;

    window.requestAnimationFrame(() => {
      scrollChatToBottom('after-append');
    });

    if (isMobile && (window.visualViewport || window.innerWidth < 1024)) {
      closeKeyboard();
      window.setTimeout(() => {
        scrollChatToBottom('after-closeKeyboard');
      }, KEYBOARD_CLOSE_FOLLOWUP_MS);
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
    const form = inputFormRef.current;
    if (!form) return;

    const syncHeight = () => {
      const nextHeight = form.getBoundingClientRect().height;
      onInputHeightChange?.(nextHeight);
    };

    syncHeight();
    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(form);

    return () => {
      resizeObserver.disconnect();
    };
  }, [onInputHeightChange]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onViewportResize = () => {
      if (Date.now() > viewportSyncUntilRef.current) return;
      scrollChatToBottom('visualViewport.resize-after-closeKeyboard');
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
          {!isReady && <div className="chat-loading-banner">{loadingStatusText || '初始化中'}</div>}
          {sanitizedMessages.slice(-MAX_RENDER_COUNT).map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onToggleTranslation={onToggleTranslation}
              activeUserInitialHandle={activeUserInitialHandle}
            />
          ))}
          <div ref={messageEndRef} />
        </div>
      </div>

      {!stickBottom && (
        <button
          className="jump-bottom"
          type="button"
          onClick={() => {
            scrollChatToBottom('jump-bottom');
            setStickBottom(true);
          }}
        >
          最新訊息
        </button>
      )}

      {shouldRenderReplyPreview && (
        <div className="replyPinBar" role="status" aria-live="polite">
          <div className="replyPinHeader">↳ @{lockTarget}</div>
          <div className="replyPinText">「{replyPreviewText}」</div>
        </div>
      )}

      {debugEnabled && isLocked && lockTarget && !shouldRenderReplyPreview && (
        <div className="chat-send-feedback">Reply Preview suppressed: {replyPreviewSuppressedReason ?? 'not_visible_or_missing_tag'}</div>
      )}

      <form
        ref={inputFormRef}
        className="chat-input input-surface"
        onSubmit={(event) => {
          event.preventDefault();
          submitPendingRef.current = false;
          void handleMessageSubmit('submit');
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true;
            onCompositionStateChange(true);
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            onCompositionStateChange(false);
          }}
          onKeyDown={(event) => {
            const nativeIsComposing = (event.nativeEvent as KeyboardEvent).isComposing;
            const isImeEnter = event.keyCode === 229;
            if (event.key === 'Enter' && !event.shiftKey && !isComposingRef.current && !nativeIsComposing && !isImeEnter) {
              event.preventDefault();
              void handleMessageSubmit('submit');
            }
          }}
          placeholder="傳送訊息"
        />
        <button
          type="submit"
          disabled={isSending || !isReady}
          onClick={() => {
            onSendButtonClick?.();
            submitPendingRef.current = true;
            window.setTimeout(() => {
              if (!submitPendingRef.current) return;
              submitPendingRef.current = false;
              void handleMessageSubmit('fallback_click');
            }, 0);
          }}
        >
          {!isReady ? '初始化中…' : isSending ? '送出中…' : '送出'}
        </button>
        <button
          ref={keyboardSinkRef}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="keyboard-focus-sink"
        />
      </form>

      {!!sendFeedback && <div className="chat-send-feedback">{sendFeedback}</div>}

      {debugEnabled && (
        <div className="chat-debug-send-tools">
          <button type="button" onClick={() => { void onDebugSimulateSend?.(); }}>Simulate Send</button>
          <button type="button" onClick={onDebugToggleSelfTag}>Toggle TagLock(Self)</button>
          <button type="button" onClick={onDebugToggleComposing}>Toggle isComposing ({String(isComposing)})</button>
        </div>
      )}
    </section>
  );
}
