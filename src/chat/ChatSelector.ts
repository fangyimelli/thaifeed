import { ChatMessageType, type ChatEvent } from './ChatTypes';

const weightedIdleTypes: Array<{ type: ChatMessageType; weight: number }> = [
  { type: ChatMessageType.IDLE_BORING, weight: 50 },
  { type: ChatMessageType.DREAD_BUILDUP, weight: 30 },
  { type: ChatMessageType.SOCIAL_REPLY, weight: 20 }
];

type ReactionSpec = {
  startAt: number;
  endAt: number;
  pending: number;
  minGapMs: number;
  maxGapMs: number;
  nextEmitAt: number;
  type: ChatMessageType;
};

function weightedPick<T>(items: Array<{ type: T; weight: number }>): T {
  const total = items.reduce((acc, item) => acc + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.type;
  }
  return items[0].type;
}

export function pickTypeForEvent(event: ChatEvent): ChatMessageType | null {
  if (event.type === 'IDLE_TICK') return weightedPick(weightedIdleTypes);
  if (event.type === 'USER_SENT') return Math.random() < 0.65 ? ChatMessageType.SOCIAL_REPLY : ChatMessageType.FEAR_SELF_DOUBT;
  return null;
}

export function buildReactionWindow(
  event: Extract<ChatEvent, { type: 'SCENE_SWITCH' | 'SFX_START' }>,
  curse: number,
  now: number
): ReactionSpec | null {
  const intensity = curse >= 80 ? 2 : curse >= 60 ? 1 : 0;
  const total = 4 + Math.floor(Math.random() * (4 + intensity));
  const durationMs = 10_000 + Math.floor(Math.random() * 2_001);
  const minGapMs = Math.max(700, 1_000 - intensity * 150);
  const maxGapMs = Math.max(2_000, 5_000 - intensity * 300);

  if (event.type === 'SCENE_SWITCH') {
    if (!['oldhouse_room_loop', 'oldhouse_room_loop2', 'oldhouse_room_loop4'].includes(event.toKey)) return null;
    return {
      startAt: now + 5_000,
      endAt: now + 5_000 + durationMs,
      pending: total,
      minGapMs,
      maxGapMs,
      nextEmitAt: now + 5_000,
      type: ChatMessageType.SCENE_FLICKER_REACT
    };
  }

  const sfxType = event.sfxKey === 'fan'
    ? ChatMessageType.SFX_REACT_FAN
    : event.sfxKey === 'footsteps'
      ? ChatMessageType.SFX_REACT_FOOTSTEPS
      : ChatMessageType.SFX_REACT_GHOST;

  return {
    startAt: now + 2_000,
    endAt: now + 2_000 + durationMs,
    pending: total,
    minGapMs,
    maxGapMs,
    nextEmitAt: now + 2_000,
    type: sfxType
  };
}

export type { ReactionSpec };
