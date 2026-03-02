import type { StoryEventKey } from '../../core/events/eventTypes';

export type QnaOption = {
  id: string;
  label: string;
  keywords: string[];
  nextStepId?: string;
  nextEventKey?: StoryEventKey;
  end?: boolean;
};

export type QnaStep = {
  id: string;
  questionVariants: string[];
  retryPromptVariants?: string[];
  unknownPromptVariants?: string[];
  options: QnaOption[];
};

export type QnaFlow = {
  id: string;
  eventKey: StoryEventKey;
  steps: QnaStep[];
  initialStepId: string;
};

export type QnaMatched = {
  optionId: string;
  keyword: string;
  at: number;
};

export type QnaPendingChain = {
  eventKey: StoryEventKey;
  fromStepId: string;
  fromOptionId: string;
};

export type QnaState = {
  isActive: boolean;
  flowId: string;
  eventKey: StoryEventKey | null;
  stepId: string;
  awaitingReply: boolean;
  lastAskedAt: number;
  attempts: number;
  taggedUser: string | null;
  lockTarget: string | null;
  lastQuestionActor: string | null;
  lastAskedTextPreview: string;
  matched: QnaMatched | null;
  pendingChain: QnaPendingChain | null;
  history: string[];
  askedQuestionHistory: string[];
  askedPromptHistory: string[];
  nextAskAt: number;
  startedAt: number;
  pressure40Triggered: boolean;
  pressure60Triggered: boolean;
  active: {
    id: string;
    eventKey: string;
    askerActorId: string;
    taggedUserId: string;
    taggedUserHandle: string;
    status: 'IDLE' | 'ASKING' | 'AWAITING_REPLY' | 'RESOLVED' | 'ABORTED';
    questionMessageId: string | null;
    askedAt: number | null;
    resolvedAt: number | null;
    abortReason: string | null;
  };
};

export type QnaParseResult = { optionId: string; matchedKeyword: string } | null;
