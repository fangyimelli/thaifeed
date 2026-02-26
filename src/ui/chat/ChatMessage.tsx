import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import TranslationToggle from './TranslationToggle';
import { resolveAssetUrl } from '../../config/assetUrls';

type Props = {
  message: ChatMessageType;
  onToggleTranslation: (id: string) => void;
};

export default function ChatMessage({ message, onToggleTranslation }: Props) {
  const isSystemJoin = message.type === 'system' && message.subtype === 'join';
  const isSystemInfo = message.type === 'system' && message.subtype !== 'join';
  const isDonate = message.type === 'donate';

  return (
    <article
      className={`chat-message ${message.isVip ? `vip ${message.isVip}` : ''} ${message.isSelf ? 'self' : ''} ${isSystemJoin ? 'system join' : ''} ${isSystemInfo ? 'system info' : ''} ${isDonate ? 'donate' : ''}`}
    >
      <div className="chat-line">
        {!isSystemJoin && !isSystemInfo && (
          <span className="name">
            {message.isVip && <img src={resolveAssetUrl('assets/icons/icon_crown.svg')} alt="vip" className="crown" />}
            {message.username}
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
        <p className="translation">{message.translation}</p>
      )}
    </article>
  );
}
