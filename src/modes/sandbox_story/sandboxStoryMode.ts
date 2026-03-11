import type { GameMode } from '../types';
import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { NightScript } from '../../ssot/sandbox_story/types';

export type SandboxPrompt = {
  kind: 'consonant' | 'theory' | 'final';
  promptId: string;
  consonant: string;
  wordKey: string;
  pinnedText: string;
  correctKeywords: string[];
  unknownKeywords: string[];
};

export type SandboxFearDebugState = {
  fearLevel: number;
  maxFear: number;
  pressureLevel: 'low' | 'medium' | 'mid' | 'high' | 'panic';
  ghostProbability: number;
  triggers: Record<string, number>;
  footsteps: { probability: number; cooldownMs: number; cooldownRemaining: number; lastAt: number };
};

const SANDBOX_BOOTSTRAP_MIN_DURATION_MS = 30_000;

function mirrorAnswerGateFromReplyGate(
  answerGate: Record<string, any> | undefined,
  replyGate: Record<string, any> | undefined,
  fallbackAskedAt: number
) {
  const armed = Boolean(replyGate?.armed && replyGate?.gateType && replyGate.gateType !== 'none');
  return {
    ...(answerGate ?? {}),
    waiting: armed,
    pausedChat: armed,
    askedAt: armed
      ? (replyGate?.createdAt ?? answerGate?.askedAt ?? fallbackAskedAt)
      : 0
  };
}

export const createSandboxV2InitialState = () => {
  const bootAt = Date.now();
  const initialTransitions = [
    { event: 'INIT_SANDBOX_V2', at: bootAt, detail: NIGHT1.meta.version },
    { event: 'ENTER_BOOT', at: bootAt, detail: 'BOOT' }
  ] as Array<{ event: string; at: number; detail?: string }>;

  return {
  ssot: { version: NIGHT1.meta.version },
  nightId: NIGHT1.meta.id,
  flow: { step: 'PREHEAT_CHAT', questionIndex: 0, stepStartedAt: bootAt, transitions: initialTransitions, tagAskedThisStep: false },
  sandboxFlow: { step: 'PREHEAT_CHAT', stepStartedAt: bootAt, questionIndex: 0, gateType: 'none', replyTarget: null, replyGateActive: false, canReply: false, gateConsumed: false, retryCount: 0, retryLimit: 2, dedupeWindowMs: 5000, backlogTechMessages: [], pendingBacklogMessages: [], autoplayNightStatus: 'running', autoplayNightEnabled: false, questionEmitterId: '', retryEmitterId: '', glitchEmitterIds: [] as string[], postRevealChatState: 'idle', nextQuestionReady: false, nextQuestionEmitted: false, nextQuestionFromIndex: -1, nextQuestionToIndex: -1, nextQuestionFromQuestionId: '', nextQuestionToQuestionId: '', nextQuestionBlockedReason: 'not_armed', nextQuestionDecidedAt: 0, nextQuestionEmittedAt: 0, nextQuestionConsumer: '', nextQuestionStage: 'boot', nextQuestionBlockedReasonSource: 'bootstrap' },
  prompt: {
    current: null,
    overlay: { consonantShown: '' },
    pinned: { promptIdRendered: '', lastWriter: { source: 'init', blockedReason: '', writerBlocked: false } },
    mismatch: false
  },
  renderSync: { stateQuestionId: '', renderedQuestionId: '', renderBlockedReason: 'state_question_missing', committedAt: 0, commitSource: 'init' },
  reveal: { visible: false, phase: 'idle', text: '', wordKey: '', consonantFromPrompt: '', durationMs: 0, doneAt: 0, startedAt: 0, finishedAt: 0, cleanupAt: 0, rendered: false, blockedReason: '', mode: 'idle', baseGrapheme: '', restText: '', restLen: 0, splitter: '', position: { xPct: 0, yPct: 0 }, safeRect: { minX: 0, maxX: 0, minY: 0, maxY: 0 } },
  consonant: {
    nodeChar: '',
    promptText: '',
    promptCurrent: '',
    parse: { ok: false, matchedChar: '', kind: '', matchedAlias: '', inputNorm: '', inputRaw: '', allowedSetsHit: 0, matched: '', blockedReason: '' },
    judge: { lastInput: '', lastResult: 'idle', timeoutEnabled: false }
  },
  joinGate: { satisfied: false, submittedAt: 0 },
  pendingQuestions: { queue: [], revisiting: false },
  lastCategory: '',
  pendingDisambiguation: { active: false, attempts: 0, promptId: '' },
  q10Special: { armed: false, revealed: false },
  introGate: { startedAt: bootAt, minDurationMs: SANDBOX_BOOTSTRAP_MIN_DURATION_MS, passed: false, remainingMs: SANDBOX_BOOTSTRAP_MIN_DURATION_MS },
  preheat: { enabled: false, lastJoinAt: 0 },
  freeze: { frozen: false, reason: 'NONE', frozenAt: 0 },
  answerGate: { waiting: false, pausedChat: false },
  answer: { submitInFlight: false, lastSubmitAt: 0 },
  warmup: { gateActive: false, replyReceived: false, replyAt: 0, judgeArmed: false },
  glitchBurst: { pending: false, remaining: 0 },
  audio: { lastKey: '', state: 'idle' },
  player: { handle: '000', id: 'activeUser' },
  last: { lastAskAt: 0 },
  scheduler: { phase: 'preheat', blockedReason: '' },
  nodeIndex: 0,
  ghostGate: { lastReason: '' },
  advance: { inFlight: false, lastAt: 0, lastReason: '', blockedReason: '' },
  hint: { active: false, lastText: '', count: 0, lastShownAt: 0, source: '' },
  parity: { sandboxJudgeResult: 'idle', classicJudgeResult: 'idle', sandboxClassicParity: 'unknown' },
  debugOverride: { active: false, source: '', consumedAt: 0 },
  fearSystem: { footsteps: { probability: 0, cooldownRemaining: 0, lastAt: 0 } },
  wave: { count: 0, kind: 'none' },
  blocked: { reason: '' },
  mismatch: { promptVsReveal: false },
  ghostMotion: { lastId: '', state: 'idle' },
  audit: { transitions: [{ from: 'INIT', to: 'PREHEAT_CHAT', at: bootAt, reason: 'mode_state_created' }] as Array<{ from: string; to: string; at: number; reason?: string }> },
  currentPrompt: null as null | { id: string; kind: string; consonant: string; wordKey: string; thaiWord: string; translationZh: string },
  consonantJudgeAudit: {
    rawInput: '',
    normalizedInput: '',
    parseOk: false,
    parseKind: 'not_evaluated',
    matchedAlias: '',
    expectedConsonant: '',
    acceptedCandidates: [] as string[],
    compareInput: '',
    compareMode: 'normalized_alias_membership',
    judgeResult: 'idle',
    resultReason: 'not_evaluated',
    sourcePromptId: '',
    sourceQuestionId: '',
    sourceWordKey: '',
    gateType: 'none',
    consumedAt: 0
  },
  replyGate: { gateType: 'none', armed: false, canReply: false, gateConsumed: false, questionEmitter: '', retryCount: 0, retryLimit: 2, sourceMessageId: '', targetPlayerId: '', sourceType: '', consumePolicy: 'single' },
  reply: { lastInjectedMessageId: '', lastInjectedText: '', lastInjectedAt: 0, lastConsumedMessageId: '', lastConsumedText: '', lastConsumedAt: 0, consumeSource: '', consumeResult: 'idle', consumeBlockedReason: '' },
  lastReplyEval: null as null | { messageId: string; gateType: string; consumed: boolean; reason: string; rawInput: string; normalizedInput: string; extractedAnswer: string; raw: string; normalized: string; classifiedAs: string; at: number },
  techBacklog: { queued: 0, pending: 0, lastDrainAt: 0 },
  theory: { active: false, nodeId: '', promptId: '', pendingQuestions: [] as string[] },
  unresolvedAmbient: { active: false, remaining: 0, completed: 0 },
  blockedReason: '',
  transitions: initialTransitions
  };
};

export function ensureSandboxV2StateShape(raw: any) {
  const base = createSandboxV2InitialState();
  const next = { ...base, ...(raw ?? {}) };
  next.prompt = { ...base.prompt, ...(raw?.prompt ?? {}) };
  next.prompt.overlay = { ...base.prompt.overlay, ...(raw?.prompt?.overlay ?? {}) };
  next.prompt.pinned = { ...base.prompt.pinned, ...(raw?.prompt?.pinned ?? {}) };
  next.prompt.pinned.lastWriter = { ...base.prompt.pinned.lastWriter, ...(raw?.prompt?.pinned?.lastWriter ?? {}) };
  next.renderSync = { ...base.renderSync, ...(raw?.renderSync ?? {}) };
  next.reveal = { ...base.reveal, ...(raw?.reveal ?? {}) };
  next.consonant = { ...base.consonant, ...(raw?.consonant ?? {}) };
  next.consonant.parse = { ...base.consonant.parse, ...(raw?.consonant?.parse ?? {}) };
  next.consonant.judge = { ...base.consonant.judge, ...(raw?.consonant?.judge ?? {}) };
  next.sandboxFlow = { ...base.sandboxFlow, ...(raw?.sandboxFlow ?? {}) };
  next.sandboxFlow.glitchEmitterIds = Array.isArray(raw?.sandboxFlow?.glitchEmitterIds) ? raw.sandboxFlow.glitchEmitterIds : [];
  next.pendingQuestions = { ...base.pendingQuestions, ...(raw?.pendingQuestions ?? {}) };
  next.pendingQuestions.queue = Array.isArray(raw?.pendingQuestions?.queue) ? raw.pendingQuestions.queue : [];
  next.pendingDisambiguation = { ...base.pendingDisambiguation, ...(raw?.pendingDisambiguation ?? {}) };
  next.q10Special = { ...base.q10Special, ...(raw?.q10Special ?? {}) };
  next.flow = { ...base.flow, ...(raw?.flow ?? {}) };
  next.flow.transitions = Array.isArray(raw?.flow?.transitions) ? raw.flow.transitions : base.flow.transitions;
  next.scheduler = { ...base.scheduler, ...(raw?.scheduler ?? {}) };
  next.ghostGate = { ...base.ghostGate, ...(raw?.ghostGate ?? {}) };
  next.advance = { ...base.advance, ...(raw?.advance ?? {}) };
  next.hint = { ...base.hint, ...(raw?.hint ?? {}) };
  next.parity = { ...base.parity, ...(raw?.parity ?? {}) };
  next.debugOverride = { ...base.debugOverride, ...(raw?.debugOverride ?? {}) };
  next.fearSystem = { ...base.fearSystem, ...(raw?.fearSystem ?? {}) };
  next.fearSystem.footsteps = { ...base.fearSystem.footsteps, ...(raw?.fearSystem?.footsteps ?? {}) };
  next.wave = { ...base.wave, ...(raw?.wave ?? {}) };
  next.blocked = { ...base.blocked, ...(raw?.blocked ?? {}) };
  next.mismatch = { ...base.mismatch, ...(raw?.mismatch ?? {}) };
  next.ghostMotion = { ...base.ghostMotion, ...(raw?.ghostMotion ?? {}) };
  next.audit = { ...base.audit, ...(raw?.audit ?? {}) };
  next.audit.transitions = Array.isArray(raw?.audit?.transitions) ? raw.audit.transitions : [];
  const legacyReplyGate = raw?.replyGate ?? {};
  next.replyGate = {
    ...base.replyGate,
    ...legacyReplyGate,
    gateType: legacyReplyGate.gateType ?? legacyReplyGate.type ?? base.replyGate.gateType,
    targetPlayerId: legacyReplyGate.targetPlayerId ?? legacyReplyGate.targetActor ?? base.replyGate.targetPlayerId
  };
  next.answerGate = mirrorAnswerGateFromReplyGate(raw?.answerGate ?? base.answerGate, next.replyGate, next.flow?.stepStartedAt ?? Date.now());
  next.reply = { ...base.reply, ...(raw?.reply ?? {}) };
  next.lastReplyEval = raw?.lastReplyEval ? { ...(base.lastReplyEval ?? {}), ...(raw?.lastReplyEval ?? {}) } : null;
  next.techBacklog = { ...base.techBacklog, ...(raw?.techBacklog ?? {}) };
  next.theory = { ...base.theory, ...(raw?.theory ?? {}) };
  next.theory.pendingQuestions = Array.isArray(raw?.theory?.pendingQuestions) ? raw.theory.pendingQuestions : [];
  next.currentPrompt = raw?.currentPrompt ? { ...(base.currentPrompt ?? {}), ...(raw?.currentPrompt ?? {}) } : null;
  next.consonantJudgeAudit = { ...base.consonantJudgeAudit, ...(raw?.consonantJudgeAudit ?? {}) };
  next.consonantJudgeAudit.acceptedCandidates = Array.isArray(raw?.consonantJudgeAudit?.acceptedCandidates)
    ? raw.consonantJudgeAudit.acceptedCandidates
    : base.consonantJudgeAudit.acceptedCandidates;
  next.unresolvedAmbient = { ...base.unresolvedAmbient, ...(raw?.unresolvedAmbient ?? {}) };
  next.ssot = { ...base.ssot, ...(raw?.ssot ?? {}) };
  next.reveal.position = { ...base.reveal.position, ...(raw?.reveal?.position ?? {}) };
  next.reveal.safeRect = { ...base.reveal.safeRect, ...(raw?.reveal?.safeRect ?? {}) };
  next.answer = { ...base.answer, ...(raw?.answer ?? {}) };
  next.warmup = { ...base.warmup, ...(raw?.warmup ?? {}) };
  next.glitchBurst = { ...base.glitchBurst, ...(raw?.glitchBurst ?? {}) };
  next.audio = { ...base.audio, ...(raw?.audio ?? {}) };
  next.transitions = Array.isArray(raw?.transitions) ? raw.transitions : base.transitions;
  next.flow.transitions = Array.isArray(raw?.flow?.transitions) ? raw.flow.transitions : next.transitions;
  next.nightId = raw?.nightId ?? base.nightId;
  next.blockedReason = raw?.blockedReason ?? raw?.blocked?.reason ?? base.blockedReason;
  return next;
}

export function createSandboxStoryMode(): GameMode & Record<string, any> {
  let ssot: NightScript = NIGHT1;
  let state: any = createSandboxV2InitialState();
  const fear: SandboxFearDebugState = { fearLevel: 0, maxFear: 100, pressureLevel: 'low', ghostProbability: 0, triggers: { chatSpike: 0, storyEmotion: 0, darkFrame: 0, ghostNearby: 0 }, footsteps: { probability: 0, cooldownMs: 0, cooldownRemaining: 0, lastAt: 0 } };
  const appendTransition = (event: string, at: number, detail?: string) => {
    state.transitions = [...(state.transitions ?? []), { event, at, detail }].slice(-20);
    state.flow.transitions = state.transitions;
  };
  const appendAuditTransition = (from: string, to: string, at: number, reason?: string) => {
    state.audit = {
      ...state.audit,
      transitions: [...(state.audit?.transitions ?? []), { from, to, at, reason }].slice(-20)
    };
  };
  const hasBootstrapState = () => Boolean(
    state.flow?.step
    && Number.isFinite(state.flow?.questionIndex)
    && state.flow?.stepStartedAt > 0
    && state.scheduler?.phase
    && state.introGate?.startedAt > 0
    && state.introGate?.minDurationMs > 0
  );

  const bootstrapRuntime = (reason = 'mode_entry', at = Date.now(), minDurationMs = SANDBOX_BOOTSTRAP_MIN_DURATION_MS) => {
      const prevStep = state.flow?.step || 'BOOT';
      const bootAt = at;
      state.flow = { ...state.flow, step: 'PREHEAT_CHAT', questionIndex: 0, stepStartedAt: bootAt, tagAskedThisStep: false };
      state.sandboxFlow = {
        ...state.sandboxFlow,
        step: 'PREHEAT_CHAT',
        stepStartedAt: bootAt,
        questionIndex: 0,
        gateType: 'none',
        replyTarget: null,
        replyGateActive: false,
        canReply: false,
        gateConsumed: false,
        postRevealChatState: 'idle',
        nextQuestionReady: false,
        nextQuestionEmitted: false,
        nextQuestionFromIndex: -1,
        nextQuestionToIndex: -1,
        nextQuestionFromQuestionId: '',
        nextQuestionToQuestionId: '',
        nextQuestionBlockedReason: 'not_armed',
        nextQuestionDecidedAt: 0,
        nextQuestionEmittedAt: 0,
        nextQuestionConsumer: '',
        nextQuestionStage: 'boot',
        nextQuestionBlockedReasonSource: 'bootstrap'
      };
      state.scheduler = { ...state.scheduler, phase: 'preheat', blockedReason: '' };
      state.introGate = { ...state.introGate, startedAt: bootAt, minDurationMs, passed: false, remainingMs: minDurationMs };
      state.replyGate = {
        ...state.replyGate,
        gateType: 'none',
        armed: false,
        canReply: false,
        gateConsumed: false,
        sourceMessageId: '',
        targetPlayerId: '',
        sourceType: '',
        consumePolicy: 'single'
      };
      state.prompt = { ...state.prompt, current: null };
      state.renderSync = { ...state.renderSync, stateQuestionId: '', renderedQuestionId: '', renderBlockedReason: 'state_question_missing', committedAt: bootAt, commitSource: reason };
      state.currentPrompt = null;
      state.lastReplyEval = null;
      state.reply = { ...createSandboxV2InitialState().reply };
      state.consonantJudgeAudit = { ...createSandboxV2InitialState().consonantJudgeAudit };
      appendTransition('BOOTSTRAP_RUNTIME', bootAt, reason);
      appendTransition('ENTER_PREHEAT_CHAT', bootAt, reason);
      appendAuditTransition(prevStep, 'PREHEAT_CHAT', bootAt, reason);
      appendAuditTransition('scheduler', 'preheat', bootAt, reason);
    };

  return {
    id: 'sandbox_story',
    label: 'Sandbox Story V2',
    init() {},
    onIncomingTag() {},
    onPlayerReply() {},
    tick() {},
    dispose() {},
    getState: () => ensureSandboxV2StateShape(state),
    getFearDebugState: () => fear,
    getCurrentNode: () => ssot.nodes[state.nodeIndex] ?? null,
    getCurrentPrompt: () => state.prompt.current,
    getSSOT: () => ssot,
    importSSOT: (next: NightScript) => { ssot = next; state.ssot.version = next.meta.version; state.nightId = next.meta.id; return true; },
    setPlayerIdentity: (p: any) => { state.player = { ...state.player, ...p }; },
    setJoinGate: (v: any) => { state.joinGate = { ...state.joinGate, ...v }; },
    appendTransition,
    bootstrapRuntime,
    ensureBootstrapState: (reason = 'guard_recovery', at = Date.now(), minDurationMs = SANDBOX_BOOTSTRAP_MIN_DURATION_MS, force = false) => {
      if (force || !hasBootstrapState() || state.flow?.step === 'PREJOIN') {
        bootstrapRuntime(reason, at, minDurationMs);
      }
      return ensureSandboxV2StateShape(state);
    },
    setSchedulerPhase: (phase: string, blockedReason = '', at?: number) => {
      const previous = state.scheduler?.phase ?? 'unknown';
      state.scheduler = { ...state.scheduler, phase, blockedReason };
      appendTransition(`SCHEDULER_${phase.toUpperCase()}`, at ?? Date.now(), blockedReason || phase);
      appendAuditTransition(previous, phase, at ?? Date.now(), blockedReason || 'setSchedulerPhase');
    },
    setFlowStep: (step: string, reason?: string, at?: number) => {
      const transitionAt = at ?? Date.now();
      const previousStep = state.flow?.step ?? 'unknown';
      const nextQuestionIndex = Number.isInteger(state.flow?.questionIndex) ? state.flow.questionIndex : 0;
      const deriveStepScopedNextQuestion = (flowStep: string) => {
        if (flowStep === 'WAIT_WARMUP_REPLY' || flowStep === 'WAIT_REPLY_1' || flowStep === 'WAIT_REPLY_2' || flowStep === 'WAIT_REPLY_3') {
          return { nextQuestionStage: 'REPLY', nextQuestionBlockedReasonSource: 'reply', nextQuestionBlockedReason: 'reply_blocked:awaiting_consume' };
        }
        if (flowStep === 'ANSWER_EVAL') {
          return { nextQuestionStage: 'ANSWER_EVAL', nextQuestionBlockedReasonSource: 'answer_eval', nextQuestionBlockedReason: 'answer_eval_blocked:awaiting_judge' };
        }
        if (flowStep === 'REVEAL_WORD') {
          return { nextQuestionStage: 'REVEAL_WORD', nextQuestionBlockedReasonSource: 'reveal', nextQuestionBlockedReason: 'reveal_guard_blocked:awaiting_reveal' };
        }
        if (flowStep === 'POST_REVEAL_CHAT') {
          return { nextQuestionStage: 'POST_REVEAL_CHAT', nextQuestionBlockedReasonSource: 'post_reveal', nextQuestionBlockedReason: 'post_reveal_blocked:awaiting_post_reveal' };
        }
        if (flowStep === 'ADVANCE_NEXT') {
          return { nextQuestionStage: 'ADVANCE_NEXT', nextQuestionBlockedReasonSource: 'advance_next', nextQuestionBlockedReason: 'advance_next_blocked:pending_emit' };
        }
        return null;
      };
      const stepScopedNextQuestion = deriveStepScopedNextQuestion(step);
      state.flow = { ...state.flow, step, questionIndex: nextQuestionIndex, stepStartedAt: transitionAt, tagAskedThisStep: false };
      state.sandboxFlow = { ...state.sandboxFlow, step, stepStartedAt: transitionAt, questionIndex: nextQuestionIndex, ...(stepScopedNextQuestion ?? {}) };
      appendTransition(reason || 'setFlowStep', transitionAt, step);
      appendAuditTransition(previousStep, step, transitionAt, reason || 'setFlowStep');
    },
    setIntroGate: (v: any) => { state.introGate = { ...state.introGate, ...v }; },
    setPreheatState: (v: any) => { state.preheat = { ...state.preheat, ...v }; },
    markWaveDone: () => undefined,
    setSandboxFlow: (v: any) => {
      state.sandboxFlow = { ...state.sandboxFlow, ...v };
      state.replyGate = {
        ...state.replyGate,
        gateType: state.sandboxFlow.gateType,
        armed: Boolean(state.sandboxFlow.replyGateActive && state.sandboxFlow.gateType !== 'none'),
        gateConsumed: state.sandboxFlow.gateConsumed,
        canReply: state.sandboxFlow.canReply,
        retryCount: state.sandboxFlow.retryCount,
        retryLimit: state.sandboxFlow.retryLimit,
        sourceMessageId: state.sandboxFlow.replySourceMessageId ?? state.replyGate.sourceMessageId,
        sourceType: state.sandboxFlow.replySourceType ?? state.replyGate.sourceType,
        consumePolicy: state.sandboxFlow.consumePolicy ?? state.replyGate.consumePolicy,
        questionEmitter: state.sandboxFlow.questionEmitterId ?? state.replyGate.questionEmitter,
        targetPlayerId: state.sandboxFlow.replyTarget ?? state.replyGate.targetPlayerId
      };
      state.answerGate = {
        ...mirrorAnswerGateFromReplyGate(state.answerGate, state.replyGate, state.flow?.stepStartedAt ?? Date.now())
      };
    },
    setReplyGate: (v: any) => {
      state.replyGate = { ...state.replyGate, ...v };
      state.sandboxFlow = {
        ...state.sandboxFlow,
        gateType: state.replyGate.gateType,
        replyGateActive: Boolean(state.replyGate.armed),
        canReply: Boolean(state.replyGate.canReply),
        gateConsumed: Boolean(state.replyGate.gateConsumed),
        replyTarget: state.replyGate.targetPlayerId,
        replySourceMessageId: state.replyGate.sourceMessageId,
        replySourceType: state.replyGate.sourceType,
        consumePolicy: state.replyGate.consumePolicy,
      };
      state.answerGate = {
        ...mirrorAnswerGateFromReplyGate(state.answerGate, state.replyGate, state.flow?.stepStartedAt ?? Date.now())
      };
    },
    setLastReplyEval: (evalPatch: any) => {
      const prev = state.lastReplyEval ?? { messageId: '', gateType: 'none', consumed: false, reason: '', rawInput: '', normalizedInput: '', extractedAnswer: '', raw: '', normalized: '', classifiedAs: 'none', at: 0 };
      state.lastReplyEval = { ...prev, ...evalPatch };
    },
    setReplyTelemetry: (patch: any) => {
      state.reply = {
        ...(state.reply ?? createSandboxV2InitialState().reply),
        ...(patch ?? {})
      };
    },
    setJudgeResult: (result: string, detail?: any) => {
      state.consonant = {
        ...state.consonant,
        judge: {
          ...state.consonant.judge,
          lastResult: result,
          ...(detail ?? {})
        }
      };
    },
    setConsonantJudgeAudit: (audit: any) => {
      state.consonantJudgeAudit = {
        ...state.consonantJudgeAudit,
        ...(audit ?? {}),
        acceptedCandidates: Array.isArray(audit?.acceptedCandidates)
          ? audit.acceptedCandidates
          : state.consonantJudgeAudit.acceptedCandidates
      };
    },
    commitConsonantJudgeResult: (payload: { input?: string; parsed?: string; judge?: string; classicJudgeResult?: string }) => {
      const normalizedInput = payload?.parsed ?? '';
      state.consonant = {
        ...state.consonant,
        parse: {
          ...state.consonant.parse,
          inputRaw: payload?.input ?? '',
          inputNorm: normalizedInput,
          matchedAlias: normalizedInput,
          matched: normalizedInput,
          ok: Boolean(normalizedInput),
          blockedReason: payload?.judge === 'wrong_format' || payload?.judge === 'wrong_answer' ? payload.judge : ''
        },
        judge: {
          ...state.consonant.judge,
          lastInput: normalizedInput,
          lastResult: payload?.judge ?? state.consonant.judge.lastResult
        }
      };
      state.parity = {
        ...state.parity,
        sandboxJudgeResult: payload?.judge ?? state.parity.sandboxJudgeResult,
        classicJudgeResult: payload?.classicJudgeResult ?? payload?.judge ?? state.parity.classicJudgeResult,
        sandboxClassicParity: payload?.judge && payload?.classicJudgeResult
          ? (payload.judge === payload.classicJudgeResult ? 'match' : 'mismatch')
          : state.parity.sandboxClassicParity
      };
    },
    setFreeze: (v: any) => { state.freeze = { ...state.freeze, ...v }; },
    setAnswerGate: (v: any) => {
      state.answerGate = mirrorAnswerGateFromReplyGate({ ...state.answerGate, ...(v ?? {}) }, state.replyGate, state.flow?.stepStartedAt ?? Date.now());
    },
    commitPinnedWriter: (payload: { source?: string; writerBlocked?: boolean; blockedReason?: string } = {}) => {
      state.prompt = {
        ...state.prompt,
        pinned: {
          ...state.prompt.pinned,
          lastWriter: {
            source: payload.source ?? state.prompt.pinned.lastWriter.source,
            writerBlocked: Boolean(payload.writerBlocked),
            blockedReason: payload.blockedReason ?? ''
          }
        }
      };
    },
    commitPromptPinnedRendered: (messageId: string) => {
      state.prompt = {
        ...state.prompt,
        pinned: {
          ...state.prompt.pinned,
          promptIdRendered: messageId || state.prompt.pinned.promptIdRendered
        }
      };
    },
    canTriggerGhostMotion: () => ({ allowed: true, reason: 'ok' }),
    setPronounceState: (stateName: 'idle' | 'playing' | 'error', payload?: { key?: string; reason?: string }) => { state.audio = { ...state.audio, state: stateName, lastKey: payload?.key ?? state.audio.lastKey }; state.blocked = { ...state.blocked, reason: stateName === 'error' ? (payload?.reason ?? 'pronounce_failed') : '' }; },
    forceRevealDone: () => { const now = Date.now(); const finishedAt = state.reveal.finishedAt > 0 ? state.reveal.finishedAt : Math.max(now, state.reveal.startedAt || now); state.reveal = { ...state.reveal, phase: 'done', doneAt: state.reveal.doneAt > 0 ? state.reveal.doneAt : finishedAt, finishedAt, cleanupAt: 0, visible: true, mode: 'idle' }; },
    markRevealDone: () => { const now = Date.now(); const doneAt = state.reveal.doneAt > 0 ? state.reveal.doneAt : now; const finishedAt = state.reveal.finishedAt > 0 ? state.reveal.finishedAt : Math.max(doneAt, state.reveal.startedAt || doneAt); state.reveal = { ...state.reveal, phase: 'done', doneAt, finishedAt, cleanupAt: now, visible: false, mode: 'idle' }; },
    setCurrentPrompt: (prompt: SandboxPrompt) => {
      const node = ssot.nodes.find((n) => n.id === prompt.wordKey);
      state.prompt.current = prompt;
      state.currentPrompt = {
        id: prompt.promptId,
        kind: prompt.kind,
        consonant: prompt.consonant,
        wordKey: prompt.wordKey,
        thaiWord: node?.wordText ?? '',
        translationZh: node?.translationZh ?? ''
      };
      state.consonant.nodeChar = prompt.consonant;
      state.renderSync = {
        ...state.renderSync,
        stateQuestionId: prompt.wordKey,
        renderBlockedReason: state.renderSync.renderedQuestionId === prompt.wordKey ? 'committed' : 'awaiting_visual_commit',
        commitSource: 'setCurrentPrompt'
      };
    },
    forceRevealCurrent: () => { const prompt = state.prompt.current; if (!prompt) return null; const node = ssot.nodes.find((n) => n.id === prompt.wordKey); const now = Date.now(); const revealText = node?.wordText ?? ''; state.reveal = { ...state.reveal, visible: Boolean(revealText), phase: revealText ? 'word' : 'hidden', text: revealText, wordKey: node?.id ?? prompt.wordKey, rendered: Boolean(revealText), blockedReason: revealText ? '' : 'missing_word_text', startedAt: now, finishedAt: 0, doneAt: 0, cleanupAt: 0 }; return node; },
    commitAdvanceBlockedReason: (reason: string) => { state.advance = { ...state.advance, blockedReason: reason, lastAt: Date.now(), inFlight: false }; },
    setConsonantPromptText: (text: string) => { state.consonant = { ...state.consonant, promptText: text, promptCurrent: text }; },
    commitPromptOverlay: (overlay: any) => { state.prompt = { ...state.prompt, overlay: { ...state.prompt.overlay, ...(overlay ?? {}) } }; },
    commitRenderSync: (payload: { stateQuestionId?: string; renderedQuestionId?: string; renderBlockedReason?: string; committedAt?: number; commitSource?: string }) => {
      state.renderSync = {
        ...state.renderSync,
        ...(payload ?? {}),
        committedAt: payload?.committedAt ?? Date.now(),
        commitSource: payload?.commitSource ?? state.renderSync.commitSource
      };
    },
    markTagAskedThisStep: () => { state.flow.tagAskedThisStep = true; },
    setLastTimestamps: (v: any) => { state.last = { ...state.last, ...v }; },
    setReveal: (v: any) => { state.reveal = { ...state.reveal, ...v }; },
    forceAdvanceNode: () => { const now = Date.now(); if (state.nodeIndex >= ssot.nodes.length - 1) { state.advance = { ...state.advance, blockedReason: 'end_of_nodes', lastAt: now, inFlight: false }; return false; } state.nodeIndex += 1; state.flow = { ...state.flow, questionIndex: state.nodeIndex, stepStartedAt: now, tagAskedThisStep: false }; state.sandboxFlow = { ...state.sandboxFlow, questionIndex: state.nodeIndex, stepStartedAt: now, nextQuestionBlockedReason: '', nextQuestionDecidedAt: now, nextQuestionEmittedAt: now }; state.prompt = { ...state.prompt, current: null }; state.currentPrompt = null; state.reveal = { ...state.reveal, visible: false, phase: 'idle', text: '', wordKey: '', doneAt: 0, startedAt: 0, finishedAt: 0, cleanupAt: 0, rendered: false, blockedReason: '', mode: 'idle' }; state.renderSync = { ...state.renderSync, stateQuestionId: '', renderedQuestionId: '', renderBlockedReason: 'state_question_missing', committedAt: now, commitSource: 'forceAdvanceNode_reset' }; state.unresolvedAmbient = { ...state.unresolvedAmbient, remaining: 0 }; state.advance = { ...state.advance, blockedReason: '', lastAt: now, inFlight: false, lastReason: 'force_advance_node' }; return true; },
    commitHintText: (text: string, source = 'unknown') => { state.hint = { ...state.hint, active: Boolean(text), lastText: text, count: (state.hint.count ?? 0) + 1, lastShownAt: Date.now(), source }; },
    activateDebugOverride: (source = 'debug') => { state.debugOverride = { ...state.debugOverride, active: true, source, consumedAt: 0 }; },
    advancePrompt: (reason = 'advance') => { const now = Date.now(); if (state.nodeIndex >= ssot.nodes.length - 1) { state.advance = { ...state.advance, inFlight: false, lastAt: now, lastReason: reason, blockedReason: 'end_of_nodes' }; return false; } const previousIndex = state.nodeIndex; const nextIndex = Math.min(ssot.nodes.length - 1, previousIndex + 1); state.nodeIndex = nextIndex; state.flow = { ...state.flow, questionIndex: nextIndex, stepStartedAt: now, tagAskedThisStep: false }; state.sandboxFlow = { ...state.sandboxFlow, questionIndex: nextIndex, stepStartedAt: now, nextQuestionFromIndex: previousIndex, nextQuestionToIndex: nextIndex, nextQuestionBlockedReason: '', nextQuestionDecidedAt: now, nextQuestionEmittedAt: now }; state.prompt = { ...state.prompt, current: null }; state.currentPrompt = null; state.reveal = { ...state.reveal, visible: false, phase: 'idle', text: '', wordKey: '', doneAt: 0, startedAt: 0, finishedAt: 0, cleanupAt: 0, rendered: false, blockedReason: '', mode: 'idle' }; state.advance = { ...state.advance, inFlight: false, lastAt: now, lastReason: reason, blockedReason: '' }; return true; },
    applyCorrect: (payload?: { input?: string; matchedChar?: string }) => { const now = Date.now(); const prompt = state.prompt.current; state.consonant = { ...state.consonant, parse: { ...state.consonant.parse, ok: true, inputRaw: payload?.input ?? state.consonant.parse.inputRaw, inputNorm: payload?.matchedChar ?? state.consonant.parse.inputNorm, matchedChar: payload?.matchedChar ?? state.consonant.parse.matchedChar, matchedAlias: payload?.matchedChar ?? state.consonant.parse.matchedAlias, blockedReason: '' }, judge: { ...state.consonant.judge, lastInput: payload?.matchedChar ?? state.consonant.judge.lastInput, lastResult: 'correct' } }; if (prompt) { const node = ssot.nodes.find((n) => n.id === prompt.wordKey); state.reveal = { ...state.reveal, visible: true, phase: 'word', text: node?.wordText ?? '', wordKey: prompt.wordKey, consonantFromPrompt: prompt.consonant, startedAt: now, finishedAt: 0, doneAt: 0, cleanupAt: 0 }; } state.replyGate = { ...state.replyGate, armed: false, canReply: false, gateConsumed: true }; state.sandboxFlow = { ...state.sandboxFlow, replyGateActive: false, canReply: false, gateConsumed: true }; state.answerGate = { ...state.answerGate, waiting: false, pausedChat: false, askedAt: 0 }; if (state.debugOverride.active) state.debugOverride = { ...state.debugOverride, active: false, consumedAt: now }; },
    debugAddFear: (n: number) => { fear.fearLevel = Math.min(fear.maxFear, fear.fearLevel + n); fear.pressureLevel = fear.fearLevel > 80 ? 'panic' : fear.fearLevel > 66 ? 'high' : fear.fearLevel > 33 ? 'medium' : 'low'; },
    debugResetFear: () => { fear.fearLevel = 0; fear.pressureLevel = 'low'; },
    forceAskComprehensionNow: () => undefined,
    forceAskConsonantNow: () => undefined,
    forceWave: (kind: 'related' | 'surprise' | 'guess') => { state.wave = { ...state.wave, count: (state.wave.count ?? 0) + 1, kind }; },
    registerFootstepsRoll: () => ({ chance: 0 }),
    setSubmitInFlight: () => undefined
  };
}
