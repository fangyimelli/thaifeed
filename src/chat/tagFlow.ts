import type { ChatMessage } from '../core/state/types';

type RunTagStartFlowParams = {
  tagMessage: ChatMessage;
  pinnedText: string;
  shouldFreeze: boolean;
  appendMessage: (message: ChatMessage) => void;
  forceScrollToBottom: (options: { reason: 'tag' | 'reply' | 'manual' }) => Promise<void> | void;
  setPinnedReply: (payload: { visible: boolean; text: string; author: string }) => void;
  freezeChat: (payload: { reason: 'tag_wait_reply' }) => void;
  onStep?: (step: 'append' | 'scroll' | 'pin' | 'freeze', at: number) => void;
};

export async function nextPaint() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export async function runTagStartFlow(params: RunTagStartFlowParams) {
  const { tagMessage, pinnedText, shouldFreeze, appendMessage, forceScrollToBottom, setPinnedReply, freezeChat, onStep } = params;

  appendMessage(tagMessage);
  onStep?.('append', Date.now());

  await nextPaint();
  await forceScrollToBottom({ reason: 'tag' });
  onStep?.('scroll', Date.now());

  setPinnedReply({
    visible: true,
    text: pinnedText,
    author: tagMessage.username || 'system'
  });
  onStep?.('pin', Date.now());

  await nextPaint();

  if (shouldFreeze) {
    freezeChat({ reason: 'tag_wait_reply' });
    onStep?.('freeze', Date.now());
  }
}
