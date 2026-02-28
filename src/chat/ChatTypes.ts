export type ChatLanguage = 'zh' | 'th';

export type PersonaId =
  | 'chill' | 'nervous' | 'troll' | 'quiet' | 'observer'
  | 'hype' | 'skeptical' | 'empath' | 'meme' | 'foodie'
  | 'gamer' | 'sleepy' | 'detective' | 'caretaker' | 'chaotic'
  | 'polite' | 'impatient' | 'storyteller' | 'minimalist' | 'latecomer';

export const PERSONA_IDS: PersonaId[] = [
  'chill','nervous','troll','quiet','observer','hype','skeptical','empath','meme','foodie',
  'gamer','sleepy','detective','caretaker','chaotic','polite','impatient','storyteller','minimalist','latecomer'
];

export enum ChatMessageType {
  SYSTEM_PROMPT = 'SYSTEM_PROMPT',
  FEAR_SELF_DOUBT = 'FEAR_SELF_DOUBT',
  DREAD_BUILDUP = 'DREAD_BUILDUP',
  SOCIAL_REPLY = 'SOCIAL_REPLY',
  UI_STATUS = 'UI_STATUS',
  IDLE_BORING = 'IDLE_BORING',
  SCENE_FLICKER_REACT = 'SCENE_FLICKER_REACT',
  SFX_REACT_FAN = 'SFX_REACT_FAN',
  SFX_REACT_FOOTSTEPS = 'SFX_REACT_FOOTSTEPS',
  SFX_REACT_GHOST = 'SFX_REACT_GHOST'
}

export type PersonaPolicy = {
  enabled: boolean;
  rotateWindow: number;
};

export type ChatTypeMeta = {
  language: ChatLanguage;
  allowTag: boolean;
  cooldownMs: number;
  poolId: string;
  maxRepeatWindow: number;
  personaPolicy: PersonaPolicy;
};

export const CHAT_TYPE_META: Record<ChatMessageType, ChatTypeMeta> = {
  [ChatMessageType.SYSTEM_PROMPT]: { language: 'zh', allowTag: false, cooldownMs: 4000, poolId: 'system_prompt', maxRepeatWindow: 40, personaPolicy: { enabled: false, rotateWindow: 0 } },
  [ChatMessageType.FEAR_SELF_DOUBT]: { language: 'zh', allowTag: false, cooldownMs: 3500, poolId: 'fear_self_doubt', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.DREAD_BUILDUP]: { language: 'zh', allowTag: false, cooldownMs: 2600, poolId: 'dread_build', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.SOCIAL_REPLY]: { language: 'zh', allowTag: true, cooldownMs: 2400, poolId: 'social_reply', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.UI_STATUS]: { language: 'zh', allowTag: false, cooldownMs: 1200, poolId: 'ui_status', maxRepeatWindow: 20, personaPolicy: { enabled: false, rotateWindow: 0 } },
  [ChatMessageType.IDLE_BORING]: { language: 'zh', allowTag: false, cooldownMs: 2200, poolId: 'idle_boring', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.SCENE_FLICKER_REACT]: { language: 'zh', allowTag: false, cooldownMs: 1800, poolId: 'scene_flicker', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.SFX_REACT_FAN]: { language: 'zh', allowTag: false, cooldownMs: 1600, poolId: 'sfx_fan', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.SFX_REACT_FOOTSTEPS]: { language: 'zh', allowTag: false, cooldownMs: 1600, poolId: 'sfx_steps', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } },
  [ChatMessageType.SFX_REACT_GHOST]: { language: 'th', allowTag: false, cooldownMs: 1400, poolId: 'sfx_ghost', maxRepeatWindow: 40, personaPolicy: { enabled: true, rotateWindow: 8 } }
};

export type ChatEvent =
  | {
      type: 'IDLE_TICK';
      topicWeights?: {
        randomComment: number;
        videoObservation: number;
        suspicion: number;
        buildUp: number;
        eventTopic: number;
      };
    }
  | { type: 'SCENE_SWITCH'; toKey: string }
  | { type: 'SFX_START'; sfxKey: 'fan' | 'footsteps' | 'ghost' }
  | { type: 'USER_SENT'; text: string; user: string }
  | { type: 'CURSE_CHANGE'; value: number };

export type ChatEnvelope = {
  type: ChatMessageType;
  text: string;
  language: ChatLanguage;
  personaId?: PersonaId;
  username: string;
  tagTarget?: string;
  translation?: string;
};
