import type { StoryEventKey } from '../../core/events/eventTypes';
import { pickOne } from '../../utils/random';
import { QNA_FLOWS } from './qnaFlows';
import { matchOptions } from './qnaKeyword';
import { nextQnaAskAt } from './qnaSchedule';
import type { QnaOption, QnaParseResult, QnaState } from './qnaTypes';

export const QNA_STATUS_FIELD_POLICY = {
  IDLE: {
    allowQuestionMessageId: false,
    awaitingReplyProjection: false
  },
  ASKING: {
    allowQuestionMessageId: false,
    awaitingReplyProjection: true
  },
  AWAITING_REPLY: {
    allowQuestionMessageId: true,
    awaitingReplyProjection: true
  },
  RESOLVED: {
    allowQuestionMessageId: true,
    awaitingReplyProjection: false
  },
  ABORTED: {
    allowQuestionMessageId: true,
    awaitingReplyProjection: false
  }
} as const;

export const QNA_ASKING_STALL_TIMEOUT_MS = 8_000;

type QnaStatus = keyof typeof QNA_STATUS_FIELD_POLICY;

export function projectAwaitingReplyFromActive(state: QnaState): boolean {
  return QNA_STATUS_FIELD_POLICY[state.active.status].awaitingReplyProjection;
}

export function isQnaAwaitingReplyGateOpen(state: QnaState): boolean {
  return state.active.status === 'AWAITING_REPLY' && Boolean(state.active.questionMessageId);
}

export function shouldAbortStalledAsking(state: QnaState, now = Date.now(), timeoutMs = QNA_ASKING_STALL_TIMEOUT_MS): boolean {
  if (state.active.status !== 'ASKING' || state.active.questionMessageId) return false;
  if (!state.active.id) return false;
  const anchorAskedAt = state.active.askedAt ?? state.lastAskedAt;
  if (!anchorAskedAt || anchorAskedAt <= 0) return false;
  return now - anchorAskedAt >= timeoutMs;
}

function syncAwaitingReplyCompatibility(state: QnaState) {
  state.awaitingReply = projectAwaitingReplyFromActive(state);
}

function setActiveStatus(state: QnaState, status: QnaStatus) {
  state.active.status = status;
  syncAwaitingReplyCompatibility(state);
}

const UNKNOWN_OPTION: QnaOption = {
  id: 'UNKNOWN',
  label: '不知道',
  keywords: ['不知道', '不清楚', '不確定', '不曉得', 'idk', '不知道欸']
};

export const createInitialQnaState = (): QnaState => ({
  isActive: false,
  flowId: '',
  eventKey: null,
  stepId: '',
  awaitingReply: false,
  lastAskedAt: 0,
  attempts: 0,
  taggedUser: null,
  lockTarget: null,
  lastQuestionActor: null,
  lastAskedTextPreview: '',
  matched: null,
  pendingChain: null,
  history: [],
  askedQuestionHistory: [],
  askedPromptHistory: [],
  nextAskAt: 0,
  startedAt: 0,
  pressure40Triggered: false,
  pressure60Triggered: false,
  active: {
    id: '',
    eventKey: '',
    askerActorId: '',
    taggedUserId: '',
    taggedUserHandle: '',
    status: 'IDLE',
    questionMessageId: null,
    askedAt: null,
    resolvedAt: null,
    abortReason: null
  }
});

function getFlow(flowId: string) {
  return QNA_FLOWS[flowId];
}

function getStep(state: QnaState) {
  const flow = getFlow(state.flowId);
  return flow?.steps.find((step) => step.id === state.stepId) ?? null;
}

function pickVariant(variants: string[], recent: string[]): string {
  const nonRepeat = variants.filter((line) => !recent.slice(-3).includes(line));
  return pickOne(nonRepeat.length > 0 ? nonRepeat : variants);
}

export function startQnaFlow(state: QnaState, payload: { eventKey: StoryEventKey; flowId: string; taggedUser: string; questionActor: string }) {
  const flow = getFlow(payload.flowId);
  if (!flow) return false;
  const now = Date.now();
  state.isActive = true;
  state.flowId = flow.id;
  state.eventKey = payload.eventKey;
  state.stepId = flow.initialStepId;
  state.awaitingReply = false;
  state.lastAskedAt = 0;
  state.attempts = 0;
  state.taggedUser = payload.taggedUser;
  state.lockTarget = payload.questionActor;
  state.lastQuestionActor = payload.questionActor;
  state.lastAskedTextPreview = '';
  state.matched = null;
  state.pendingChain = null;
  state.history = [...state.history, `start:${payload.eventKey}:${flow.id}:${now}`].slice(-40);
  state.askedPromptHistory = [];
  state.askedQuestionHistory = [];
  state.nextAskAt = now;
  state.startedAt = now;
  state.pressure40Triggered = false;
  state.pressure60Triggered = false;
  state.active = {
    id: crypto.randomUUID(),
    eventKey: payload.eventKey,
    askerActorId: payload.questionActor,
    taggedUserId: payload.taggedUser,
    taggedUserHandle: payload.taggedUser,
    status: 'ASKING',
    questionMessageId: null,
    askedAt: null,
    resolvedAt: null,
    abortReason: null
  };
  syncAwaitingReplyCompatibility(state);
  return true;
}

export function askCurrentQuestion(state: QnaState): { text: string; options: QnaOption[] } | null {
  const step = getStep(state);
  if (!step) return null;
  const askedAt = Date.now();
  const question = pickVariant(step.questionVariants, state.askedQuestionHistory);
  state.askedQuestionHistory = [...state.askedQuestionHistory, question].slice(-8);
  state.lastAskedAt = askedAt;
  setActiveStatus(state, 'ASKING');
  state.active.askedAt = askedAt;
  state.active.questionMessageId = null;
  state.active.resolvedAt = null;
  state.active.abortReason = null;
  state.attempts += 1;
  state.nextAskAt = nextQnaAskAt(askedAt, state.attempts);
  const options = [...step.options, UNKNOWN_OPTION];
  return { text: question, options };
}

export function setQnaQuestionActor(state: QnaState, questionActor: string) {
  state.lockTarget = questionActor;
  state.lastQuestionActor = questionActor;
  state.active.askerActorId = questionActor;
}

export function updateLastAskedPreview(state: QnaState, line: string) {
  state.lastAskedTextPreview = line.slice(0, 30);
}

export function parsePlayerReplyToOption(state: QnaState, playerText: string): QnaParseResult {
  const step = getStep(state);
  if (!step) return null;
  const options = [...step.options, UNKNOWN_OPTION];
  const matched = matchOptions(playerText, options);
  if (!matched) return null;
  return { optionId: matched.option.id, matchedKeyword: matched.keyword };
}

export function applyOptionResult(state: QnaState, option: QnaOption): { type: 'next' | 'retry' | 'chain' | 'end'; nextStepId?: string } {
  if (option.id === 'UNKNOWN') {
    state.history = [...state.history, `unknown:${state.stepId}:${Date.now()}`].slice(-40);
    setActiveStatus(state, 'ABORTED');
    state.active.abortReason = 'unknown_retry';
    state.nextAskAt = nextQnaAskAt(Date.now(), state.attempts);
    return { type: 'retry' };
  }
  if (option.nextEventKey) {
    state.pendingChain = {
      eventKey: option.nextEventKey,
      fromStepId: state.stepId,
      fromOptionId: option.id
    };
    setActiveStatus(state, 'RESOLVED');
    state.active.resolvedAt = Date.now();
    return { type: 'chain' };
  }
  if (option.nextStepId) {
    state.stepId = option.nextStepId;
    setActiveStatus(state, 'RESOLVED');
    state.active.resolvedAt = Date.now();
    state.nextAskAt = nextQnaAskAt(Date.now(), state.attempts);
    return { type: 'next', nextStepId: option.nextStepId };
  }
  if (option.end) {
    setActiveStatus(state, 'RESOLVED');
    state.active.resolvedAt = Date.now();
    return { type: 'end' };
  }
  setActiveStatus(state, 'ABORTED');
  state.active.abortReason = 'retry';
  return { type: 'retry' };
}

export function handleTimeoutPressure(state: QnaState): 'low_rumble' | 'ghost_ping' | null {
  if (!state.isActive || state.active.status !== 'AWAITING_REPLY' || !state.lastAskedAt) return null;
  const elapsed = Date.now() - state.lastAskedAt;
  if (elapsed >= 60_000 && !state.pressure60Triggered) {
    state.pressure60Triggered = true;
    state.history = [...state.history, `pressure60:${Date.now()}`].slice(-40);
    return 'ghost_ping';
  }
  if (elapsed >= 40_000 && !state.pressure40Triggered) {
    state.pressure40Triggered = true;
    state.history = [...state.history, `pressure40:${Date.now()}`].slice(-40);
    return 'low_rumble';
  }
  return null;
}

export function getCurrentStepOptions(state: QnaState): QnaOption[] {
  const step = getStep(state);
  if (!step) return [];
  return [...step.options, UNKNOWN_OPTION];
}

export function getUnknownPrompt(state: QnaState): string {
  const step = getStep(state);
  if (!step) return '先想一下，我們再試一次。';
  const variants = step.unknownPromptVariants ?? ['先想一下，我們再試一次。'];
  const picked = pickVariant(variants, state.askedPromptHistory);
  state.askedPromptHistory = [...state.askedPromptHistory, picked].slice(-8);
  return picked;
}

export function getRetryPrompt(state: QnaState): string {
  const step = getStep(state);
  if (!step) return '我沒抓到關鍵字，再選一次。';
  const variants = step.retryPromptVariants ?? ['我沒抓到關鍵字，再選一次。'];
  const picked = pickVariant(variants, state.askedPromptHistory);
  state.askedPromptHistory = [...state.askedPromptHistory, picked].slice(-8);
  return picked;
}

export function getOptionById(state: QnaState, optionId: string): QnaOption | null {
  return getCurrentStepOptions(state).find((option) => option.id === optionId) ?? null;
}



export function markQnaQuestionCommitted(state: QnaState, payload: { messageId: string; askedAt: number }) {
  if (!payload.messageId) {
    setActiveStatus(state, 'ABORTED');
    state.active.abortReason = 'missing_question_message_id';
    return;
  }
  state.active.questionMessageId = payload.messageId;
  state.active.askedAt = payload.askedAt;
  state.active.abortReason = null;
  state.active.resolvedAt = null;
  setActiveStatus(state, 'AWAITING_REPLY');
}

export function markQnaResolved(state: QnaState, at: number) {
  if (state.active.status === 'AWAITING_REPLY' || state.active.status === 'ASKING') {
    setActiveStatus(state, 'RESOLVED');
    state.active.resolvedAt = at;
  }
}

export function markQnaAborted(state: QnaState, reason: string, at: number) {
  setActiveStatus(state, 'ABORTED');
  state.active.abortReason = reason;
  state.active.resolvedAt = at;
}

export function stopQnaFlow(state: QnaState, reason: string) {
  state.history = [...state.history, `stop:${reason}:${Date.now()}`].slice(-40);
  const reset = createInitialQnaState();
  Object.assign(state, reset);
}
