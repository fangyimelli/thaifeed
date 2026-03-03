import type { GameMode } from '../types';

type ClassicModeHooks = {
  onIncomingTag?: (tagText: string) => void;
  onPlayerReply?: (replyText: string) => void;
  onTick?: (now: number) => void;
  onInit?: () => void;
  onDispose?: () => void;
};

export function createClassicMode(hooks: ClassicModeHooks = {}): GameMode {
  return {
    id: 'classic',
    label: 'Classic Mode',
    init() {
      hooks.onInit?.();
    },
    onIncomingTag(tagText: string) {
      hooks.onIncomingTag?.(tagText);
    },
    onPlayerReply(replyText: string) {
      hooks.onPlayerReply?.(replyText);
    },
    tick(now: number) {
      hooks.onTick?.(now);
    },
    dispose() {
      hooks.onDispose?.();
    }
  };
}
