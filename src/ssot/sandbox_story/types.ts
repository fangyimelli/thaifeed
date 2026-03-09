export type ComprehensionOption = {
  id: string;
  text: string;
};

export type ComprehensionQuestion = {
  text: string;
  options: ComprehensionOption[];
  correctOptionId: string;
  keyword: string;
  unknownKeyword: string;
};

export type TalkSeeds = {
  related: string[];
  surprise: string[];
  guess: string[];
};

export type WordNode = {
  id: string;
  char: string;
  correctKeywords: string[];
  unknownKeywords: string[];
  word: string;
  wordText: string;
  hintAppend?: string;
  hintAppendPrefixLen?: number;
  highlightChar: string;
  audioKey: string;
  comprehensionQuestion: ComprehensionQuestion;
  talkSeeds: TalkSeeds;
};

export type ChatTemplates = {
  relatedTalk: string[];
  surprise: string[];
  guess: string[];
};

export type NightScript = {
  meta: {
    id: string;
    label: string;
    version: string;
    locale: 'zh-TW';
  };
  nodes: WordNode[];
  chatTemplates: ChatTemplates;
};

export type GhostMotionPack = {
  id: string;
  description: string;
  motionKeys: string[];
};

export type SandboxDeterministicFlowStep =
  | 'PREJOIN'
  | 'PREHEAT'
  | 'REVEAL_1_START'
  | 'WARMUP_TAG'
  | 'WARMUP_WAIT_REPLY'
  | 'INTRO_IDLE'
  | 'REVEAL_1_RIOT'
  | 'TAG_PLAYER_1'
  | 'WAIT_REPLY_1'
  | 'POST_ANSWER_GLITCH_1'
  | 'NETWORK_ANOMALY_1'
  | 'POSSESSION_AUTOFILL'
  | 'POSSESSION_AUTOSEND'
  | 'CROWD_REACT_WORD'
  | 'VIP_SUMMARY_1'
  | 'TAG_PLAYER_2_PRONOUNCE'
  | 'WAIT_REPLY_2'
  | 'DISCUSS_PRONOUNCE'
  | 'VIP_SUMMARY_2'
  | 'TAG_PLAYER_3_MEANING'
  | 'WAIT_REPLY_3'
  | 'FLUSH_TECH_BACKLOG'
  | 'ADVANCE_NEXT';

export type SandboxFlowState = {
  step: SandboxDeterministicFlowStep;
  stepStartedAt: number;
  replyGateActive: boolean;
  gateType: 'none' | 'warmup_chat_reply' | 'consonant_guess' | 'meaning_reply' | 'confirm_reply';
  canReply: boolean;
  questionEmitterId: string | null;
  retryEmitterId: string | null;
  glitchEmitterIds: string[];
  retryCount: number;
  retryLimit: number;
  lastPromptAt: number;
  nextRetryAt: number;
  questionPromptFingerprint: string;
  normalizedPrompt: string;
  gateConsumed: boolean;
  dedupeWindowMs: number;
  unresolvedBehavior: 'idle' | 'glitch_only' | 'retry_once_then_idle';
  activeSpeakerRoles: string[];
  replyTarget: string | null;
  backlogTechMessages: string[];
  playerLastReply: string | null;
  questionIndex: number;
};
