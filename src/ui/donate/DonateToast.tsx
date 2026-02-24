import { useEffect } from 'react';
import type { DonateMessage } from '../../core/state/types';
import TranslationToggle from '../chat/TranslationToggle';

type Props = {
  toasts: DonateMessage[];
  onToggleTranslation: (id: string) => void;
  onDismiss: (id: string) => void;
};

export default function DonateToast({ toasts, onToggleTranslation, onDismiss }: Props) {
  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        onDismiss(toast.id);
      }, 4200)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, onDismiss]);

  return (
    <div className="donate-stack">
      {toasts.map((toast) => (
        <article key={toast.id} className="donate-toast">
          <header>
            <strong>{toast.username}</strong>
            <span>donated ฿{toast.amount}</span>
            <TranslationToggle
              expanded={Boolean(toast.showTranslation)}
              onClick={() => onToggleTranslation(toast.id)}
            />
          </header>
          <p>{toast.message_th}</p>
          {toast.showTranslation && <p className="translation">{toast.message_zh}</p>}
        </article>
      ))}
    </div>
  );
}
