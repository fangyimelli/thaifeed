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
  return (
    <aside className="chat-panel">
      <div className="chat-list">
        {messages.slice(-30).map((message) => (
          <ChatMessage key={message.id} message={message} onToggleTranslation={onToggleTranslation} />
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          placeholder="輸入答案（ผ / ph / ㄆ）"
        />
        <button type="button" onClick={onSubmit}>
          送出
        </button>
      </div>
    </aside>
  );
}
