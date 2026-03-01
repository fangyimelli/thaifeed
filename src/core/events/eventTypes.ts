export type StoryEventKey =
  | 'VOICE_CONFIRM'
  | 'GHOST_PING'
  | 'TV_EVENT'
  | 'NAME_CALL'
  | 'VIEWER_SPIKE'
  | 'LIGHT_GLITCH'
  | 'FEAR_CHALLENGE';

export type EventTopic = 'ghost' | 'footsteps' | 'light';

export type EventLinePhase = 'opener' | 'followUp' | 'closer';

export type EventLineOption = {
  id: string;
  text: string;
};

export type StoryEventDialog = {
  opener: EventLineOption[];
  followUp: EventLineOption[];
  closer?: EventLineOption[];
};

export type StoryEventDefinition = {
  key: StoryEventKey;
  requiresTag: true;
  cooldownMs: number;
  chance: number;
  minActiveUsers: number;
  lockOnStart?: boolean;
  usesLock?: boolean;
  qnaFlowId?: string;
  preEffect?: {
    sfxKey?: 'ghost_female' | 'footsteps' | 'fan_loop';
    videoKey?: 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3';
  };
  postEffect?: {
    sfxKey?: 'ghost_female' | 'footsteps' | 'fan_loop';
    videoKey?: 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3';
  };
};

export type EventLifecycleState = 'active' | 'aborted' | 'done';

export type EventRunRecord = {
  eventId: string;
  key: StoryEventKey;
  state: EventLifecycleState;
  at: number;
  starterTagSent: boolean;
  preEffectTriggered?: boolean;
  preEffectAt?: number;
  preEffect?: {
    sfxKey?: 'ghost_female' | 'footsteps' | 'fan_loop';
    videoKey?: 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3';
  };
  abortedReason?: string;
  openerLineId?: string;
  followUpLineId?: string;
  lineIds: string[];
  topic?: EventTopic;
};

export type EventSendResult = {
  ok: boolean;
  blockedReason?: string;
  lineId?: string;
};
