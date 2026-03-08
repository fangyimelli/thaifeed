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
  | 'TAG_PLAYER_1'
  | 'WAIT_REPLY_1'
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
  replyTarget: string | null;
  backlogTechMessages: string[];
  playerLastReply: string | null;
  questionIndex: number;
};
