import { useEffect } from 'react';
import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import TranslationToggle from './TranslationToggle';
import { resolveAssetUrl } from '../../config/assetUrls';

type Props = {
  message: ChatMessageType;
  onToggleTranslation: (id: string) => void;
  activeUserInitialHandle: string;
  activeUserId: string;
  onTagHighlightEvaluated?: (payload: { messageId: string; reason: 'mentions_activeUser' | 'none'; applied: boolean }) => void;
};

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export default function ChatMessage({ message, onToggleTranslation, activeUserInitialHandle, activeUserId, onTagHighlightEvaluated }: Props) {
  const isSystemJoin = message.type === 'system' && message.subtype === 'join';
  const isSystemInfo = message.type === 'system' && message.subtype !== 'join';
  const isDonate = message.type === 'donate';

  const isPlayerMessage = Boolean(activeUserInitialHandle) && (message.isSelf || normalizeHandle(message.username) === normalizeHandle(activeUserInitialHandle));
  const displayName = isPlayerMessage ? activeUserInitialHandle : message.username;
  const isTaggingActiveUser = message.type !== 'system'
    && !isPlayerMessage
    && Boolean(message.mentions?.includes(activeUserId));

  const highlightReason: 'mentions_activeUser' | 'none' = isTaggingActiveUser ? 'mentions_activeUser' : 'none';
  useEffect(() => {
    onTagHighlightEvaluated?.({ messageId: message.id, reason: highlightReason, applied: isTaggingActiveUser });
  }, [highlightReason, isTaggingActiveUser, message.id, onTagHighlightEvaluated]);
  const translationRaw = message.translation ?? '';
  const orangeWrapped = /^\[橘色\](.*)\[\/橘色\]$/u.exec(translationRaw);
  const translationText = orangeWrapped?.[1] ?? translationRaw;
  const translationClassName = orangeWrapped ? 'translation translation-orange' : 'translation';
  return (
    <article
      data-message-id={message.id}
      className={`chat-message ${message.isVip ? `vip ${message.isVip}` : ''} ${message.isSelf ? 'self' : ''} ${isSystemJoin ? 'system join' : ''} ${isSystemInfo ? 'system info' : ''} ${isDonate ? 'donate' : ''} ${isTaggingActiveUser ? 'is-mention-highlight tag-highlight-row' : ''}`}
    >
      <div className="chat-line">
        {!isSystemJoin && !isSystemInfo && (
          <span className="name">
            {message.isVip && <img src={resolveAssetUrl('assets/icons/icon_crown.svg')} alt="vip" className="crown" />}
            {displayName}
            {isPlayerMessage && <span className="you-badge">You</span>}
          </span>
        )}
        {isSystemInfo && <span className="system-tag">[系統]</span>}
        {isDonate && <span className="donate-badge">💖 ฿{message.donateAmount ?? 0}</span>}
        <span className="msg">{message.text}</span>
      </div>
      {!isSystemJoin && !isSystemInfo && message.language === 'th' && message.translation && (
        <div className="translation-actions">
          <TranslationToggle
            expanded={Boolean(message.showTranslation)}
            onClick={() => onToggleTranslation(message.id)}
          />
        </div>
      )}
      {!isSystemJoin && !isSystemInfo && message.language === 'th' && message.showTranslation && message.translation && (
        <p className={translationClassName}>{translationText}</p>
      )}
    </article>
  );
}
