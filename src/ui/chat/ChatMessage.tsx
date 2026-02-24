import type { ChatMessage as ChatMessageType } from '../../core/state/types';
import TranslationToggle from './TranslationToggle';

type Props = {
  message: ChatMessageType;
  onToggleTranslation: (id: string) => void;
};

export default function ChatMessage({ message, onToggleTranslation }: Props) {
  return (
    <article className={`chat-message ${message.isVip ? `vip ${message.isVip}` : ''}`}>
      <header>
        <span className="name">
          {message.isVip && <img src="/assets/icons/icon_crown.svg" alt="vip" className="crown" />}
          {message.username}
        </span>
        {message.text_zh && (
          <TranslationToggle
            expanded={Boolean(message.showTranslation)}
            onClick={() => onToggleTranslation(message.id)}
          />
        )}
      </header>
      <p>{message.text_th}</p>
      {message.showTranslation && message.text_zh && <p className="translation">{message.text_zh}</p>}
    </article>
  );
}
