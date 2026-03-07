import type { ChatMessage } from '../core/state/types';

type RunTagStartFlowParams = {
  tagMessage: ChatMessage;
  pinnedText: string;
  shouldFreeze: boolean;
  appendMessage: (message: ChatMessage) => Promise<{ ok: true; messageId: string } | { ok: false; blockedReason: string }> | { ok: true; messageId: string } | { ok: false; blockedReason: string };
  forceScrollToBottom: (options: { reason: 'tag' | 'reply' | 'manual' }) => Promise<void> | void;
  setPinnedReply: (payload: { visible: boolean; text: string; author: string; messageId: string }) => void;
  freezeChat: (payload: { reason: 'tag_wait_reply' }) => void;
  onStep?: (step: 'append' | 'scroll' | 'pin' | 'freeze', at: number) => void;
};

export type RunTagStartFlowResult = {
  ok: true;
  messageId: string;
} | {
  ok: false;
  blockedReason: string;
};

export async function nextPaint() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export async function runTagStartFlow(params: RunTagStartFlowParams): Promise<RunTagStartFlowResult> {
  const { tagMessage, pinnedText, shouldFreeze, appendMessage, forceScrollToBottom, setPinnedReply, freezeChat, onStep } = params;
  const resolvedPinnedText = (tagMessage.text || '').trim() || pinnedText;

  const appendResult = await appendMessage(tagMessage);
  if (!appendResult.ok) {
    return appendResult;
  }

  onStep?.('append', Date.now());

  await nextPaint();
  await forceScrollToBottom({ reason: 'tag' });
  onStep?.('scroll', Date.now());

  setPinnedReply({
    visible: true,
    text: resolvedPinnedText,
    author: tagMessage.username || 'system',
    messageId: appendResult.messageId
  });
  onStep?.('pin', Date.now());

  await nextPaint();

  if (shouldFreeze) {
    freezeChat({ reason: 'tag_wait_reply' });
    onStep?.('freeze', Date.now());
  }

  return { ok: true, messageId: appendResult.messageId };
}
