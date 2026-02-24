import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import TranslationToggle from './TranslationToggle';

type Props = {
  message: ChatMessageType;
  onToggleTranslation: (id: string) => void;
};

export default function ChatMessage({ message, onToggleTranslation }: Props) {
  return (
    <article
      className={`chat-message ${message.isVip ? `vip ${message.isVip}` : ''} ${message.isSelf ? 'self' : ''}`}
    >
      <div className="chat-line">
        <span className="name">
          {message.isVip && <img src="/assets/icons/icon_crown.svg" alt="vip" className="crown" />}
          {message.username}
        </span>
        <span className="msg">{message.text}</span>
      </div>
      {message.language === 'th' && message.translation && (
        <div className="translation-actions">
          <TranslationToggle
            expanded={Boolean(message.showTranslation)}
            onClick={() => onToggleTranslation(message.id)}
          />
        </div>
      )}
      {message.language === 'th' && message.showTranslation && message.translation && (
        <p className="translation">{message.translation}</p>
      )}
    </article>
  );
}
