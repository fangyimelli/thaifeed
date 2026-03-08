import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { NightScript, WordNode } from '../../ssot/sandbox_story/types';
import type { GameMode } from '../types';
import { SANDBOX_VIP } from '../../sandbox/chat/vip_identity';

export type SandboxStoryPhase =
  | 'boot'
  | 'intro'
  | 'awaitingTag'
  | 'awaitingAnswer'
  | 'revealingWord'
  | 'chatRiot'
  | 'supernaturalEvent'
  | 'vipTranslate'
  | 'reasoningPhase'
  | 'tagPlayerPhase';

export type SandboxRevealPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';
export type SandboxRevealSplitter = 'segmenter' | 'arrayfrom';
export type SandboxFlowStep =
  | 'PREJOIN'
  | 'PREHEAT'
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

export type SandboxFearDebugState = {
  fearLevel: number;
  maxFear: number;
  pressureLevel: 'low' | 'medium' | 'high' | 'panic';
  ghostProbability: number;
  triggers: {
    chatSpike: number;
    storyEmotion: number;
    darkFrame: number;
    ghostNearby: number;
  };
  footsteps: {
    probability: number;
    cooldownMs: number;
    cooldownRemaining: number;
    lastAt: number;
  };
};

export type SandboxGhostGateResult = {
  allowed: boolean;
  reason: string;
};

export type SandboxPrompt =
  | {
      kind: 'consonant';
      promptId: string;
      consonant: string;
      wordKey: string;
      pinnedText: string;
      correctKeywords: string[];
      unknownKeywords: string[];
    }
  | {
      kind: 'comprehension';
      promptId: string;
      questionKey: string;
      pinnedText: string;
      options: string[];
      correctOptionId: string;
    };

export type SandboxStoryState = {
  sandboxFlow: {
    step: SandboxFlowStep;
    phase: string;
    stepStartedAt: number;
    phaseStartedAt: number;
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
    allowNaturalChat: boolean;
    autoplayMockOnWait: boolean;
    replyTarget: string | null;
    currentEmitter: string | null;
    currentStepHasEmitted: boolean;
    backlogTechMessages: string[];
    pendingBacklogMessages: string[];
    pendingGlyph: string | null;
    pendingWord: string | null;
    playerLastReply: string | null;
    sanityPressure: number;
    autoplayNightEnabled: boolean;
    autoplayNightStatus: 'idle' | 'running' | 'completed';
    waitingForMockReply: boolean;
    introElapsedMs: number;
    nextBeatAt: number;
    questionIndex: number;
  };
  joinGate: { satisfied: boolean; submittedAt?: number };
  nodeIndex: number;
  lastCategory: 'woman' | 'girl' | 'boy' | null;
  pendingDisambiguation: { active: boolean; attempts: number; promptId: string };
  q10Special: { armed: boolean; revealed: boolean };
  introGate: { startedAt: number; minDurationMs: number; passed: boolean; remainingMs: number };
  preheat: { enabled: boolean; joinTarget: number; lastJoinAt: number };
  answerGate: { waiting: boolean; askedAt: number; timeoutMs: number; pausedChat: boolean };
  warmup: { gateActive: boolean; replyReceived: boolean; replyAt: number; normalizedReply: string; judgeArmed: boolean };
  flow: {
    questionIndex: number;
    step: SandboxFlowStep;
    currentTagIndex: 1 | 2 | 3;
    stepStartedAt: number;
    askedAt?: number;
    lastAnswerAt?: number;
    lastRevealAt?: number;
    tagAskedThisStep?: boolean;
    tagAskedAt?: number;
  };
  freeze: { frozen: boolean; reason: 'NONE' | 'AWAIT_PLAYER_INPUT'; frozenAt?: number };
  glitchBurst: { pending: boolean; remaining: number; lastEmitAt?: number };
  player: { handle: string; id?: string } | null;
  last: { lastAskAt?: number; lastAnswerAt?: number; lastRevealAt?: number };
  pendingQuestions: { queue: string[]; revisiting: boolean };
  pipeline: { reasoningCount: number; tagPrompted: boolean };
  scheduler: { phase: SandboxStoryPhase; blockedReason: string };
  consonant: {
    nodeChar: string;
    promptText: string;
    promptCurrent: string;
    parse: { ok: boolean; matchedChar: string; kind: string; matchedAlias: string; inputNorm: string; inputRaw: string; allowedSetsHit: { latin: boolean; bopomofo: boolean; thai: boolean; cjk: boolean }; matched: string; blockedReason: string };
    judge: {
      lastInput: string;
      lastResult: 'correct' | 'wrong' | 'unknown' | 'pass' | 'timeout' | 'none';
      timeoutEnabled: boolean;
    };
  };
  reveal: {
    visible: boolean;
    phase: SandboxRevealPhase;
    text: string;
    highlightChar: string;
    baseConsonant: string;
    appended: string;
    baseGrapheme: string;
    restText: string;
    restLen: number;
    splitter: SandboxRevealSplitter;
    mode: 'correct' | 'wrong' | 'unknown';
    audioKey: string;
    startedAt: number;
    doneAt: number;
    wordKey: string;
    consonantFromPrompt: string;
    durationMs: number;
    position: {
      xPct: number;
      yPct: number;
    };
    safeRect: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
  };
  ghostMotion: { lastId: string | null; state: 'idle' | 'playing' };
  ghostGate: { lastReason: string };
  fearSystem: SandboxFearDebugState;
  wave: { count: number; kind: 'related' | 'surprise' | 'guess' };
  blocked: { reason: '' | 'phaseBusy'; count: number };
  answer: { submitInFlight: boolean; lastSubmitAt: number };
  advance: { inFlight: boolean; lastToken: string; lastAt: number; lastReason: string; blockedReason: string };
  audio: { lastKey: string; state: 'playing' | 'idle' | 'error'; reason: string };
  hint: { active: boolean; lastText: string; count: number; lastShownAt: number; source: '' | 'classic_shared' };
  parity: {
    sandboxJudgeResult: 'correct' | 'wrong' | 'unknown' | 'pass' | 'timeout' | 'none';
    classicJudgeResult: 'correct' | 'wrong' | 'unknown' | 'pass' | 'timeout' | 'none';
    sandboxClassicParity: boolean;
  };
  debugOverride: {
    active: boolean;
    source: '' | 'button';
    consumedAt: number;
  };
  prompt: {
    current: SandboxPrompt | null;
    overlay: { consonantShown: string };
    pinned: {
      promptIdRendered: string;
      lastWriter: {
        source: 'sandboxPromptCoordinator' | 'qnaEngine' | 'eventEngine' | 'unknown';
        writerBlocked: boolean;
        blockedReason: '' | 'notSandbox' | 'phaseBusy' | 'writerNotAllowed';
      };
    };
    mismatch: boolean;
  };
  mismatch: {
    promptVsReveal: boolean;
  };
  audit: {
    transitions: Array<{ at: number; from: SandboxFlowStep; to: SandboxFlowStep; reason: string }>;
  };
};

export type SandboxStoryMode = GameMode & {
  getState: () => SandboxStoryState;
  getCurrentNode: () => WordNode | null;
  forceRevealCurrent: () => WordNode | null;
  forceAskConsonantNow: () => void;
  forceAskComprehensionNow: () => void;
  forceGhostMotion: (motionId?: string) => string | null;
  forceAdvanceNode: () => void;
  forceWave: (kind: 'related' | 'surprise' | 'guess') => void;
  getSSOT: () => NightScript;
  importSSOT: (nextScript: NightScript) => boolean;
  setConsonantPromptText: (promptText: string) => void;
  commitConsonantJudgeResult: (result: {
    input: string;
    parsed: { ok: boolean; matchedChar?: string; debug?: { kind?: string; matchedAlias?: string; inputNorm?: string; inputRaw?: string; matched?: string; blockedReason?: string; normalize?: { allowedSetsHit?: { latin?: boolean; bopomofo?: boolean; thai?: boolean; cjk?: boolean } } } };
    judge: 'correct' | 'wrong' | 'unknown' | 'pass' | 'timeout';
    classicJudgeResult?: 'correct' | 'wrong' | 'unknown' | 'pass' | 'timeout';
  }) => void;
  getFearDebugState: () => SandboxFearDebugState;
  canTriggerGhostMotion: (ctx: { qnaType: 'consonant' | 'comprehension'; answerResult: 'correct' | 'wrong' | 'unknown' }) => SandboxGhostGateResult;
  registerFootstepsRoll: (now?: number) => { probability: number; cooldownRemaining: number; lastAt: number; shouldTrigger: boolean };
  debugAddFear: (value?: number) => void;
  debugResetFear: () => void;
  markRevealDone: () => void;
  forceRevealDone: () => void;
  applyCorrect: (payload?: { input?: string; matchedChar?: string }) => void;
  activateDebugOverride: (source?: 'button') => void;
  advancePrompt: (reason: string) => void;
  markWaveDone: (kind: 'related' | 'surprise' | 'guess', count: number) => void;
  markSupernaturalDone: () => void;
  markVipTranslateDone: () => void;
  markReasoningDone: (count: number) => void;
  resolveTagPlayerPhase: (result: 'hit' | 'miss') => void;
  commitLastCategory: (category: 'woman' | 'girl' | 'boy' | null) => void;
  setPendingDisambiguation: (payload: { active: boolean; attempts: number; promptId?: string }) => void;
  setQ10SpecialState: (payload: { armed?: boolean; revealed?: boolean }) => void;
  setPronounceState: (state: 'playing' | 'idle' | 'error', payload?: { key?: string; reason?: string }) => void;
  notifyBlockedByPhase: () => void;
  commitAdvanceBlockedReason: (reason: string) => void;
  setCurrentPrompt: (prompt: SandboxPrompt | null) => void;
  getCurrentPrompt: () => SandboxPrompt | null;
  commitPromptOverlay: (consonantShown: string) => void;
  commitPromptPinnedRendered: (promptIdRendered: string) => void;
  commitPinnedWriter: (payload: {
    source: 'sandboxPromptCoordinator' | 'qnaEngine' | 'eventEngine' | 'unknown';
    writerBlocked: boolean;
    blockedReason?: '' | 'notSandbox' | 'phaseBusy' | 'writerNotAllowed';
  }) => void;
  commitHintText: (text: string, source?: '' | 'classic_shared') => void;
  setSubmitInFlight: (inFlight: boolean, timestamp?: number) => void;
  setFlowStep: (step: SandboxFlowStep, reason?: string, now?: number) => void;
  markTagAskedThisStep: (askedAt?: number) => void;
  setFreeze: (payload: Partial<SandboxStoryState['freeze']>) => void;
  setGlitchBurst: (payload: Partial<SandboxStoryState['glitchBurst']>) => void;
  setPlayerIdentity: (payload: { handle: string; id?: string } | null) => void;
  setJoinGate: (payload: Partial<SandboxStoryState['joinGate']>) => void;
  setIntroGate: (payload: Partial<SandboxStoryState['introGate']>) => void;
  setAnswerGate: (payload: Partial<SandboxStoryState['answerGate']>) => void;
  setWarmupState: (payload: Partial<SandboxStoryState['warmup']>) => void;
  setLastTimestamps: (payload: Partial<SandboxStoryState['last']>) => void;
  setPreheatState: (payload: Partial<SandboxStoryState['preheat']>) => void;
  setSandboxFlow: (payload: Partial<SandboxStoryState['sandboxFlow']>) => void;
};

const cloneScript = (script: NightScript): NightScript => JSON.parse(JSON.stringify(script)) as NightScript;

const REVEAL_SAFE_RECT = {
  minX: 8,
  maxX: 92,
  minY: 8,
  maxY: 74
} as const;

const randomPct = (min: number, max: number): number => {
  if (max <= min) return min;
  return Math.random() * (max - min) + min;
};

export function createSandboxStoryMode(): SandboxStoryMode {
  let script: NightScript = cloneScript(NIGHT1);
  const maxFear = 100;
  let extraFear = 0;
  const REVEAL_DURATION_MS = 4000;
  const state: SandboxStoryState = {
    sandboxFlow: { step: 'PREJOIN', phase: 'PREJOIN', stepStartedAt: 0, phaseStartedAt: 0, replyGateActive: false, gateType: 'none', canReply: false, questionEmitterId: null, retryEmitterId: null, glitchEmitterIds: [], retryCount: 0, retryLimit: 1, lastPromptAt: 0, nextRetryAt: 0, questionPromptFingerprint: '', normalizedPrompt: '', gateConsumed: false, dedupeWindowMs: 5000, unresolvedBehavior: 'idle', activeSpeakerRoles: [], allowNaturalChat: false, autoplayMockOnWait: false, replyTarget: null, currentEmitter: null, currentStepHasEmitted: false, backlogTechMessages: [], pendingBacklogMessages: [], pendingGlyph: null, pendingWord: null, playerLastReply: null, sanityPressure: 0, autoplayNightEnabled: true, autoplayNightStatus: 'idle', waitingForMockReply: false, introElapsedMs: 0, nextBeatAt: 0, questionIndex: 1 },
    nodeIndex: 0,
    lastCategory: null,
    pendingDisambiguation: { active: false, attempts: 0, promptId: '' },
    q10Special: { armed: false, revealed: false },
    joinGate: { satisfied: false },
    introGate: { startedAt: 0, minDurationMs: 30_000, passed: false, remainingMs: 30_000 },
    preheat: { enabled: true, joinTarget: 10, lastJoinAt: 0 },
    answerGate: { waiting: false, askedAt: 0, timeoutMs: 15_000, pausedChat: false },
    warmup: { gateActive: false, replyReceived: false, replyAt: 0, normalizedReply: '', judgeArmed: false },
    flow: { questionIndex: 1, step: 'PREJOIN', currentTagIndex: 1, stepStartedAt: 0, tagAskedThisStep: false, tagAskedAt: 0 },
    freeze: { frozen: false, reason: 'NONE' },
    glitchBurst: { pending: false, remaining: 0, lastEmitAt: 0 },
    player: null,
    last: {},
    pendingQuestions: { queue: [], revisiting: false },
    pipeline: { reasoningCount: 0, tagPrompted: false },
    scheduler: { phase: 'boot', blockedReason: '' },
    consonant: {
      nodeChar: '',
      promptText: '',
      promptCurrent: '',
      parse: { ok: false, matchedChar: '', kind: '', matchedAlias: '', inputNorm: '', inputRaw: '', allowedSetsHit: { latin: false, bopomofo: false, thai: false, cjk: false }, matched: '', blockedReason: '' },
      judge: { lastInput: '', lastResult: 'none', timeoutEnabled: false }
    },
    reveal: {
      visible: false,
      phase: 'idle',
      text: '',
      highlightChar: '',
      baseConsonant: '',
      appended: '',
      baseGrapheme: '',
      restText: '',
      restLen: 0,
      splitter: 'arrayfrom',
      mode: 'correct',
      audioKey: '',
      startedAt: 0,
      doneAt: 0,
      wordKey: '',
      consonantFromPrompt: '',
      durationMs: REVEAL_DURATION_MS,
      position: { xPct: 50, yPct: 36 },
      safeRect: { ...REVEAL_SAFE_RECT }
    },
    ghostMotion: { lastId: null, state: 'idle' },
    ghostGate: { lastReason: 'init' },
    fearSystem: {
      fearLevel: 0,
      maxFear,
      pressureLevel: 'low',
      ghostProbability: 0.1,
      triggers: { chatSpike: 0, storyEmotion: 0, darkFrame: 0, ghostNearby: 0 },
      footsteps: { probability: 0.12, cooldownMs: 38_000, cooldownRemaining: 0, lastAt: 0 }
    },
    wave: { count: 0, kind: 'related' },
    blocked: { reason: '', count: 0 },
    answer: { submitInFlight: false, lastSubmitAt: 0 },
    advance: { inFlight: false, lastToken: '', lastAt: 0, lastReason: '', blockedReason: '' },
    audio: { lastKey: '', state: 'idle', reason: '' },
    hint: { active: false, lastText: '', count: 0, lastShownAt: 0, source: '' },
    parity: { sandboxJudgeResult: 'none', classicJudgeResult: 'none', sandboxClassicParity: true },
    debugOverride: { active: false, source: '', consumedAt: 0 },
    prompt: {
      current: null,
      overlay: { consonantShown: '' },
      pinned: {
        promptIdRendered: '',
        lastWriter: { source: 'unknown', writerBlocked: false, blockedReason: '' }
      },
      mismatch: false
    },
    mismatch: {
      promptVsReveal: false
    },
    audit: {
      transitions: []
    }
  };

  const splitGraphemes = (text: string): { graphemes: string[]; splitter: SandboxRevealSplitter } => {
    const IntlWithSegmenter = Intl as unknown as { Segmenter?: new (locale: string, opts: { granularity: 'grapheme' }) => { segment: (input: string) => Iterable<{ segment: string }> } };
    if (typeof Intl !== 'undefined' && typeof IntlWithSegmenter.Segmenter !== 'undefined') {
      const segmenter = new IntlWithSegmenter.Segmenter('th', { granularity: 'grapheme' });
      return {
        graphemes: [...segmenter.segment(text || '')].map((entry) => entry.segment),
        splitter: 'segmenter'
      };
    }
    return {
      graphemes: Array.from(text || ''),
      splitter: 'arrayfrom'
    };
  };
  const pickAppendedByNode = (node: WordNode | null, mode: 'correct' | 'wrong' | 'unknown') => {
    if (!node) return '';
    const all = splitGraphemes(node.wordText).graphemes;
    const appended = all.slice(1).join('');
    if (mode === 'correct') return appended;
    if (node.hintAppend) return node.hintAppend;
    const hintLen = Math.max(1, Math.min(2, node.hintAppendPrefixLen ?? 2));
    return splitGraphemes(appended).graphemes.slice(0, hintLen).join('');
  };

  const syncPromptMismatch = () => {
    const currentPrompt = state.prompt.current;
    const overlayConsonant = state.prompt.overlay.consonantShown;
    const pinnedPromptId = state.prompt.pinned.promptIdRendered;
    const overlayMismatch = currentPrompt?.kind === 'consonant'
      ? overlayConsonant !== currentPrompt.consonant
      : overlayConsonant.length > 0;
    const pinnedMismatch = currentPrompt
      ? pinnedPromptId !== currentPrompt.promptId
      : pinnedPromptId.length > 0;
    state.prompt.mismatch = overlayMismatch || pinnedMismatch;
  };

  let nextLinearNodeIndex = 1;
  const getCurrentNode = () => script.nodes[state.nodeIndex] ?? null;
  const syncIntroGate = (now = Date.now()) => {
    const remainingMs = Math.max(0, state.introGate.startedAt + state.introGate.minDurationMs - now);
    state.introGate.remainingMs = remainingMs;
    if (!state.introGate.passed && remainingMs <= 0) {
      state.introGate.passed = true;
      if (state.scheduler.phase === 'intro') {
        state.scheduler.phase = 'awaitingTag';
      }
    }
  };
  const schedulerPhaseByStep = (step: SandboxFlowStep): SandboxStoryPhase => {
    if (step === 'PREJOIN') return 'boot';
    if (step === 'PREHEAT') return 'intro';
    if (step === 'WARMUP_TAG' || step === 'INTRO_IDLE') return 'awaitingTag';
    if (step === 'WARMUP_WAIT_REPLY') return 'awaitingAnswer';
    if (step === 'REVEAL_1_RIOT') return 'chatRiot';
    if (step === 'TAG_PLAYER_1' || step === 'TAG_PLAYER_2_PRONOUNCE' || step === 'TAG_PLAYER_3_MEANING') return 'awaitingTag';
    if (step === 'WAIT_REPLY_1' || step === 'WAIT_REPLY_2' || step === 'WAIT_REPLY_3') return 'awaitingAnswer';
    if (step === 'POST_ANSWER_GLITCH_1' || step === 'NETWORK_ANOMALY_1') return 'supernaturalEvent';
    if (step === 'POSSESSION_AUTOFILL' || step === 'POSSESSION_AUTOSEND') return 'revealingWord';
    if (step === 'CROWD_REACT_WORD' || step === 'DISCUSS_PRONOUNCE') return 'chatRiot';
    if (step === 'VIP_SUMMARY_1' || step === 'VIP_SUMMARY_2') return 'vipTranslate';
    if (step === 'FLUSH_TECH_BACKLOG') return 'supernaturalEvent';
    return 'awaitingTag';
  };
  const setFlowStepInternal = (step: SandboxFlowStep, reason = '', now = Date.now()) => {
    const prevStep = state.flow.step;
    if (prevStep === step) {
      return;
    }
    const currentTagIndex: 1 | 2 | 3 =
      step === 'TAG_PLAYER_2_PRONOUNCE' || step === 'WAIT_REPLY_2' || step === 'DISCUSS_PRONOUNCE' || step === 'VIP_SUMMARY_2'
        ? 2
        : step === 'TAG_PLAYER_3_MEANING' || step === 'WAIT_REPLY_3' || step === 'FLUSH_TECH_BACKLOG'
          ? 3
          : 1;
    const gateType: SandboxStoryState['sandboxFlow']['gateType'] = step === 'WARMUP_WAIT_REPLY'
      ? 'warmup_chat_reply'
      : (step === 'WAIT_REPLY_1' ? 'consonant_guess' : (step === 'WAIT_REPLY_2' || step === 'WAIT_REPLY_3' ? 'meaning_reply' : 'none'));
    const replyGateActive = gateType !== 'none';
    state.flow = { ...state.flow, step, currentTagIndex, stepStartedAt: now, tagAskedThisStep: false, tagAskedAt: 0 };
    const waitReplyContract: {
      questionEmitterId: string | null;
      retryEmitterId: string | null;
      glitchEmitterIds: string[];
      retryLimit: number;
      dedupeWindowMs: number;
      unresolvedBehavior: SandboxStoryState['sandboxFlow']['unresolvedBehavior'];
      activeSpeakerRoles: string[];
    } = step === 'WAIT_REPLY_1'
      ? {
          questionEmitterId: 'mod_live',
          retryEmitterId: SANDBOX_VIP.handle,
          glitchEmitterIds: ['viewer_118', 'viewer_203', 'viewer_409'],
          retryLimit: 1,
          dedupeWindowMs: 5000,
          unresolvedBehavior: 'retry_once_then_idle',
          activeSpeakerRoles: ['questionEmitter', 'retryEmitter', 'glitchEmitterPool', 'ambientViewerPool']
        }
      : {
          questionEmitterId: null,
          retryEmitterId: null,
          glitchEmitterIds: [] as string[],
          retryLimit: 0,
          dedupeWindowMs: 5000,
          unresolvedBehavior: step === 'POST_ANSWER_GLITCH_1' ? 'glitch_only' : 'idle',
          activeSpeakerRoles: [] as string[]
        };
    state.sandboxFlow = {
      ...state.sandboxFlow,
      step,
      phase: step,
      stepStartedAt: now,
      phaseStartedAt: now,
      currentStepHasEmitted: false,
      questionIndex: state.flow.questionIndex,
      replyGateActive,
      gateType,
      canReply: replyGateActive,
      questionEmitterId: waitReplyContract.questionEmitterId,
      retryEmitterId: waitReplyContract.retryEmitterId,
      glitchEmitterIds: waitReplyContract.glitchEmitterIds,
      retryCount: 0,
      retryLimit: waitReplyContract.retryLimit,
      lastPromptAt: 0,
      nextRetryAt: 0,
      questionPromptFingerprint: '',
      normalizedPrompt: '',
      gateConsumed: false,
      dedupeWindowMs: waitReplyContract.dedupeWindowMs,
      unresolvedBehavior: waitReplyContract.unresolvedBehavior,
      activeSpeakerRoles: waitReplyContract.activeSpeakerRoles,
      allowNaturalChat: step === 'PREHEAT' || step === 'REVEAL_1_RIOT' || step === 'POST_ANSWER_GLITCH_1' || step === 'NETWORK_ANOMALY_1' || step === 'CROWD_REACT_WORD' || step === 'DISCUSS_PRONOUNCE',
      autoplayMockOnWait: replyGateActive,
      waitingForMockReply: replyGateActive,
      nextBeatAt: replyGateActive ? 0 : now + 1200
    };
    state.warmup.gateActive = false;
    state.warmup.judgeArmed = state.sandboxFlow.replyGateActive;
    state.audit.transitions = [...state.audit.transitions, { at: now, from: prevStep, to: step, reason: reason || '-' }].slice(-20);
    state.scheduler.phase = schedulerPhaseByStep(step);
    clearSchedulerBlockedReason();
    if (import.meta.env.DEV) {
      console.debug('[sandbox.flow]', `${prevStep} -> ${step}`, reason || '-');
    }
  };
  const clearSchedulerBlockedReason = () => {
    state.scheduler.blockedReason = '';
  };
  const syncNodeChar = () => {
    state.consonant.nodeChar = getCurrentNode()?.char ?? '';
  };
  const syncFear = () => {
    const base = Math.min(90, state.nodeIndex * 6 + (state.scheduler.phase === 'revealingWord' ? 15 : 3));
    const fear = Math.max(0, Math.min(maxFear, base + extraFear));
    const probability = Math.min(0.9, 0.08 + fear / maxFear * 0.55);
    const cooldownMs = Math.max(7_500, 42_000 - fear * 300);
    const now = Date.now();
    const cooldownRemaining = Math.max(0, (state.fearSystem.footsteps.lastAt || 0) + cooldownMs - now);
    state.fearSystem = {
      fearLevel: fear,
      maxFear,
      pressureLevel: fear > 80 ? 'panic' : fear > 60 ? 'high' : fear > 30 ? 'medium' : 'low',
      ghostProbability: Math.min(1, 0.1 + fear / maxFear),
      triggers: { chatSpike: Math.min(30, state.wave.count * 4), storyEmotion: Math.min(35, state.reveal.visible ? 20 : 8), darkFrame: state.reveal.phase === 'exit' ? 12 : 3, ghostNearby: 4 },
      footsteps: {
        probability,
        cooldownMs,
        cooldownRemaining,
        lastAt: state.fearSystem.footsteps.lastAt || 0
      }
    };
  };
  const startReveal = (mode: 'correct' | 'wrong' | 'unknown') => {
    if (mode !== 'correct') {
      state.scheduler.phase = 'awaitingAnswer';
      state.reveal = { ...state.reveal, visible: false, phase: 'idle', startedAt: 0, doneAt: 0 };
      state.advance.blockedReason = 'not_correct_or_pass';
      clearSchedulerBlockedReason();
      return;
    }
    const currentPrompt = state.prompt.current;
    if (!currentPrompt || currentPrompt.kind !== 'consonant') {
      state.scheduler.blockedReason = 'mismatch:prompt_missing';
      state.advance.blockedReason = 'mismatch';
      state.mismatch.promptVsReveal = true;
      return;
    }
    const node = script.nodes.find((item) => item.id === currentPrompt.wordKey) ?? null;
    const revealMismatch = !node || node.char !== currentPrompt.consonant;
    state.mismatch.promptVsReveal = revealMismatch;
    if (revealMismatch || !node) {
      state.scheduler.blockedReason = 'mismatch:prompt_vs_reveal';
      state.advance.blockedReason = 'mismatch';
      return;
    }
    if (mode === 'correct') state.scheduler.phase = 'revealingWord';
    clearSchedulerBlockedReason();
    const splitWord = splitGraphemes(node.wordText);
    const wordGraphemes = splitWord.graphemes;
    const baseGrapheme = wordGraphemes[0] ?? '';
    const restText = pickAppendedByNode(node, mode);
    const restLen = splitGraphemes(restText).graphemes.length;
    const position = {
      xPct: randomPct(REVEAL_SAFE_RECT.minX, REVEAL_SAFE_RECT.maxX),
      yPct: randomPct(REVEAL_SAFE_RECT.minY, REVEAL_SAFE_RECT.maxY)
    };
    state.reveal = {
      visible: true,
      phase: 'enter',
      text: node.wordText,
      highlightChar: node.char,
      baseConsonant: node.char,
      appended: restText,
      baseGrapheme,
      restText,
      restLen,
      splitter: splitWord.splitter,
      mode,
      audioKey: node.audioKey,
      startedAt: Date.now(),
      doneAt: 0,
      wordKey: currentPrompt.wordKey,
      consonantFromPrompt: currentPrompt.consonant,
      durationMs: REVEAL_DURATION_MS,
      position,
      safeRect: { ...REVEAL_SAFE_RECT }
    };
  };
  const resetPromptRuntimeState = () => {
    state.reveal = { ...state.reveal, visible: false, phase: 'idle', appended: '', startedAt: 0, doneAt: state.reveal.doneAt || Date.now() };
    state.prompt.current = null;
    state.prompt.overlay.consonantShown = '';
    state.prompt.pinned.promptIdRendered = '';
    state.hint = { ...state.hint, active: false };
    state.answer.submitInFlight = false;
    state.pipeline = { reasoningCount: 0, tagPrompted: false };
  };
  const enqueueCurrentNodeForRevisit = () => {
    const currentNode = getCurrentNode();
    if (!currentNode) return;
    if (!state.pendingQuestions.queue.includes(currentNode.id)) {
      state.pendingQuestions.queue = [...state.pendingQuestions.queue, currentNode.id];
    }
  };
  const selectNextNodeIndex = () => {
    const pendingNodeId = state.pendingQuestions.queue[0];
    if (pendingNodeId) {
      const revisitIndex = script.nodes.findIndex((node) => node.id === pendingNodeId);
      if (revisitIndex >= 0) {
        state.pendingQuestions.revisiting = true;
        state.nodeIndex = revisitIndex;
        return;
      }
      state.pendingQuestions.queue = state.pendingQuestions.queue.slice(1);
    }
    state.pendingQuestions.revisiting = false;
    const clamped = Math.max(0, Math.min(script.nodes.length - 1, nextLinearNodeIndex));
    state.nodeIndex = clamped;
    nextLinearNodeIndex = Math.max(nextLinearNodeIndex, Math.min(clamped + 1, Math.max(script.nodes.length - 1, 0)));
    state.flow.questionIndex = state.nodeIndex + 1;
    state.sandboxFlow.questionIndex = state.flow.questionIndex;
  };
  const advancePromptInternal = (reason: string, token: string) => {
    state.advance = { ...state.advance, inFlight: true, lastToken: token, lastAt: Date.now(), lastReason: reason, blockedReason: '' };
    selectNextNodeIndex();
    syncNodeChar();
    setFlowStepInternal('TAG_PLAYER_1', 'advance_prompt_internal');
    clearSchedulerBlockedReason();
    resetPromptRuntimeState();
    syncPromptMismatch();
    state.mismatch.promptVsReveal = false;
    state.advance.inFlight = false;
    syncFear();
  };

  return {
    id: 'sandbox_story',
    label: 'Sandbox Story Mode',
    init() {
      state.nodeIndex = 0;
      nextLinearNodeIndex = 1;
      state.joinGate = { satisfied: false };
      state.introGate = { startedAt: 0, minDurationMs: 30_000, passed: false, remainingMs: 30_000 };
      state.preheat = { enabled: true, joinTarget: 10, lastJoinAt: 0 };
      state.answerGate = { waiting: false, askedAt: 0, timeoutMs: 15_000, pausedChat: false };
      state.warmup = { gateActive: false, replyReceived: false, replyAt: 0, normalizedReply: '', judgeArmed: false };
      state.sandboxFlow = { step: 'PREJOIN', phase: 'PREJOIN', stepStartedAt: 0, phaseStartedAt: 0, replyGateActive: false, gateType: 'none', canReply: false, questionEmitterId: null, retryEmitterId: null, glitchEmitterIds: [], retryCount: 0, retryLimit: 1, lastPromptAt: 0, nextRetryAt: 0, questionPromptFingerprint: '', normalizedPrompt: '', gateConsumed: false, dedupeWindowMs: 5000, unresolvedBehavior: 'idle', activeSpeakerRoles: [], allowNaturalChat: false, autoplayMockOnWait: false, replyTarget: null, currentEmitter: null, currentStepHasEmitted: false, backlogTechMessages: [], pendingBacklogMessages: [], pendingGlyph: null, pendingWord: null, playerLastReply: null, sanityPressure: 0, autoplayNightEnabled: true, autoplayNightStatus: 'idle', waitingForMockReply: false, introElapsedMs: 0, nextBeatAt: 0, questionIndex: 1 };
      state.flow = { questionIndex: 1, step: 'PREJOIN', currentTagIndex: 1, stepStartedAt: Date.now(), tagAskedThisStep: false, tagAskedAt: 0 };
      state.freeze = { frozen: false, reason: 'NONE' };
      state.glitchBurst = { pending: false, remaining: 0, lastEmitAt: 0 };
      state.last = {};
      state.pendingQuestions = { queue: [], revisiting: false };
      state.lastCategory = null;
      state.pendingDisambiguation = { active: false, attempts: 0, promptId: '' };
      state.q10Special = { armed: false, revealed: false };
      state.pipeline = { reasoningCount: 0, tagPrompted: false };
      state.audit.transitions = [];
      setFlowStepInternal('PREJOIN', 'init');
      clearSchedulerBlockedReason();
      state.reveal.visible = false;
      state.reveal.phase = 'idle';
      state.reveal.appended = '';
      state.reveal.doneAt = 0;
      state.hint = { active: false, lastText: '', count: 0, lastShownAt: 0, source: '' };
      state.wave = { count: 0, kind: 'related' };
      state.blocked = { reason: '', count: 0 };
      state.answer = { submitInFlight: false, lastSubmitAt: 0 };
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      state.prompt.pinned.lastWriter = { source: 'unknown', writerBlocked: false, blockedReason: '' };
      state.advance = { inFlight: false, lastToken: '', lastAt: 0, lastReason: '', blockedReason: '' };
      state.mismatch.promptVsReveal = false;
      syncPromptMismatch();
      syncNodeChar();
      syncFear();
    },
    onIncomingTag() {
      if (state.scheduler.phase === 'revealingWord') {
        state.blocked = { reason: 'phaseBusy', count: state.blocked.count + 1 };
        state.scheduler.blockedReason = 'phaseBusy:incoming_tag';
        syncFear();
        return;
      }
      if (state.flow.step === 'WARMUP_TAG') {
        state.answerGate = { waiting: true, askedAt: Date.now(), timeoutMs: 15_000, pausedChat: false };
        setFlowStepInternal('WARMUP_WAIT_REPLY', 'incoming_tag_warmup');
      }
      if (state.flow.step === 'TAG_PLAYER_1') {
        state.answerGate = { waiting: true, askedAt: Date.now(), timeoutMs: 15_000, pausedChat: false };
        setFlowStepInternal('WAIT_REPLY_1', 'incoming_tag');
      }
      syncFear();
    },
    onPlayerReply() { syncFear(); },
    tick() {
      const now = Date.now();
      if (state.flow.step === 'PREJOIN' || !state.joinGate.satisfied) {
        syncFear();
        return;
      }
      syncIntroGate();
      state.sandboxFlow.introElapsedMs = state.introGate.startedAt > 0 ? Math.max(0, now - state.introGate.startedAt) : 0;
      if (state.flow.step === 'PREHEAT' && state.sandboxFlow.introElapsedMs >= state.introGate.minDurationMs) {
        state.preheat.enabled = false;
        setFlowStepInternal('WARMUP_TAG', 'intro_passed');
      }
      if (state.reveal.visible && state.reveal.phase !== 'done') {
        const elapsed = Date.now() - state.reveal.startedAt;
        state.reveal.phase = elapsed < 1000 ? 'enter' : elapsed < REVEAL_DURATION_MS ? 'pulse' : 'done';
        if (state.reveal.phase === 'done' && !state.reveal.doneAt) {
          state.reveal.doneAt = Date.now();
        }
      }
      syncFear();
    },
    dispose() {},
    getState: () => JSON.parse(JSON.stringify(state)) as SandboxStoryState,
    getCurrentNode,
    forceRevealCurrent() {
      const node = getCurrentNode();
      startReveal('correct');
      syncFear();
      return node;
    },
    forceAskConsonantNow() { if (state.sandboxFlow.introElapsedMs < state.introGate.minDurationMs) return; setFlowStepInternal('TAG_PLAYER_1', 'force_ask_consonant'); syncFear(); },
    forceAskComprehensionNow() { if (state.sandboxFlow.introElapsedMs < state.introGate.minDurationMs) return; setFlowStepInternal('TAG_PLAYER_1', 'force_ask_comprehension'); syncFear(); },
    forceGhostMotion(motionId) {
      state.ghostMotion = { lastId: motionId ?? 'disabled_no_ghost_entity', state: 'idle' };
      syncFear();
      return null;
    },
    forceAdvanceNode() {
      state.advance = { ...state.advance, inFlight: false, lastToken: '', lastAt: Date.now(), lastReason: 'forceAdvanceNode', blockedReason: '' };
      selectNextNodeIndex();
      setFlowStepInternal('TAG_PLAYER_1', 'force_advance_node');
      clearSchedulerBlockedReason();
      state.reveal = { ...state.reveal, visible: false, phase: 'idle', appended: '', startedAt: 0, doneAt: 0 };
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      syncPromptMismatch();
      state.mismatch.promptVsReveal = false;
      syncNodeChar();
      syncFear();
    },
    forceWave(kind) {
      state.wave.kind = kind;
      state.scheduler.phase = 'chatRiot';
      clearSchedulerBlockedReason();
      syncFear();
    },
    getSSOT: () => cloneScript(script),
    importSSOT(nextScript) {
      if (!nextScript?.nodes?.length) return false;
      script = cloneScript(nextScript);
      state.nodeIndex = 0;
      nextLinearNodeIndex = 1;
      state.joinGate = { satisfied: false };
      state.introGate = { startedAt: 0, minDurationMs: 30_000, passed: false, remainingMs: 30_000 };
      state.preheat = { enabled: true, joinTarget: 10, lastJoinAt: 0 };
      state.answerGate = { waiting: false, askedAt: 0, timeoutMs: 15_000, pausedChat: false };
      state.warmup = { gateActive: false, replyReceived: false, replyAt: 0, normalizedReply: '', judgeArmed: false };
      state.sandboxFlow = { step: 'PREJOIN', phase: 'PREJOIN', stepStartedAt: 0, phaseStartedAt: 0, replyGateActive: false, gateType: 'none', canReply: false, questionEmitterId: null, retryEmitterId: null, glitchEmitterIds: [], retryCount: 0, retryLimit: 1, lastPromptAt: 0, nextRetryAt: 0, questionPromptFingerprint: '', normalizedPrompt: '', gateConsumed: false, dedupeWindowMs: 5000, unresolvedBehavior: 'idle', activeSpeakerRoles: [], allowNaturalChat: false, autoplayMockOnWait: false, replyTarget: null, currentEmitter: null, currentStepHasEmitted: false, backlogTechMessages: [], pendingBacklogMessages: [], pendingGlyph: null, pendingWord: null, playerLastReply: null, sanityPressure: 0, autoplayNightEnabled: true, autoplayNightStatus: 'idle', waitingForMockReply: false, introElapsedMs: 0, nextBeatAt: 0, questionIndex: 1 };
      state.flow = { questionIndex: 1, step: 'PREJOIN', currentTagIndex: 1, stepStartedAt: Date.now(), tagAskedThisStep: false, tagAskedAt: 0 };
      state.freeze = { frozen: false, reason: 'NONE' };
      state.glitchBurst = { pending: false, remaining: 0, lastEmitAt: 0 };
      state.last = {};
      state.pendingQuestions = { queue: [], revisiting: false };
      state.lastCategory = null;
      state.pendingDisambiguation = { active: false, attempts: 0, promptId: '' };
      state.q10Special = { armed: false, revealed: false };
      state.pipeline = { reasoningCount: 0, tagPrompted: false };
      state.audit.transitions = [];
      setFlowStepInternal('PREJOIN', 'import_ssot');
      clearSchedulerBlockedReason();
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      syncPromptMismatch();
      state.mismatch.promptVsReveal = false;
      syncNodeChar();
      syncFear();
      return true;
    },
    setConsonantPromptText(promptText) {
      state.consonant.promptText = promptText;
      state.consonant.promptCurrent = getCurrentNode()?.char ?? '';
    },
    commitConsonantJudgeResult(result) {
      state.consonant.parse = {
        ok: result.parsed.ok,
        matchedChar: result.parsed.matchedChar ?? '',
        kind: result.parsed.debug?.kind ?? '',
        matchedAlias: result.parsed.debug?.matchedAlias ?? '',
        inputNorm: result.parsed.debug?.inputNorm ?? '',
        inputRaw: result.parsed.debug?.inputRaw ?? result.input,
        allowedSetsHit: {
          latin: Boolean(result.parsed.debug?.normalize?.allowedSetsHit?.latin),
          bopomofo: Boolean(result.parsed.debug?.normalize?.allowedSetsHit?.bopomofo),
          thai: Boolean(result.parsed.debug?.normalize?.allowedSetsHit?.thai),
          cjk: Boolean(result.parsed.debug?.normalize?.allowedSetsHit?.cjk)
        },
        matched: result.parsed.debug?.matched ?? '',
        blockedReason: result.parsed.debug?.blockedReason ?? ''
      };
      state.consonant.judge = { ...state.consonant.judge, lastInput: result.input, lastResult: result.judge };
      const classicJudgeResult = result.classicJudgeResult ?? result.judge;
      state.parity = {
        sandboxJudgeResult: result.judge,
        classicJudgeResult,
        sandboxClassicParity: result.judge === classicJudgeResult
      };
      if (state.consonant.parse.blockedReason === 'input_sanitized_to_empty') {
        state.advance.blockedReason = 'input_sanitized_to_empty';
      } else if ((result.parsed.debug?.kind ?? '') === 'none' || (!result.parsed.ok && result.judge !== 'pass')) {
        state.advance.blockedReason = 'parse_none';
      }
      if (result.judge === 'pass') {
        state.advance.blockedReason = '';
      }
      if (result.judge === 'correct' && result.parsed.matchedChar === state.consonant.nodeChar) startReveal('correct');
      if (result.judge === 'wrong' && state.advance.blockedReason !== 'input_sanitized_to_empty') {
        state.advance.blockedReason = 'not_correct_or_pass';
      }
      if (result.judge === 'unknown' && state.advance.blockedReason !== 'input_sanitized_to_empty') {
        state.advance.blockedReason = 'not_correct_or_pass';
      }
      syncFear();
    },
    getFearDebugState() { syncFear(); return JSON.parse(JSON.stringify(state.fearSystem)) as SandboxFearDebugState; },
    canTriggerGhostMotion(ctx) {
      if (ctx.qnaType !== 'comprehension') {
        state.ghostGate.lastReason = 'blocked:not_comprehension';
        return { allowed: false, reason: state.ghostGate.lastReason };
      }
      if (ctx.answerResult !== 'correct') {
        state.ghostGate.lastReason = `blocked:comprehension_${ctx.answerResult}`;
        return { allowed: false, reason: state.ghostGate.lastReason };
      }
      state.ghostGate.lastReason = 'allowed:comprehension_correct';
      return { allowed: true, reason: state.ghostGate.lastReason };
    },
    registerFootstepsRoll(now = Date.now()) {
      syncFear();
      const steps = state.fearSystem.footsteps;
      const cooldownRemaining = Math.max(0, (steps.lastAt || 0) + steps.cooldownMs - now);
      if (cooldownRemaining > 0) {
        state.fearSystem.footsteps.cooldownRemaining = cooldownRemaining;
        return { probability: steps.probability, cooldownRemaining, lastAt: steps.lastAt, shouldTrigger: false };
      }
      const shouldTrigger = Math.random() < steps.probability;
      if (shouldTrigger) {
        state.fearSystem.footsteps.lastAt = now;
      }
      syncFear();
      return {
        probability: state.fearSystem.footsteps.probability,
        cooldownRemaining: state.fearSystem.footsteps.cooldownRemaining,
        lastAt: state.fearSystem.footsteps.lastAt,
        shouldTrigger
      };
    },
    debugAddFear(value = 10) { extraFear += value; syncFear(); },
    debugResetFear() { extraFear = 0; syncFear(); },
    markRevealDone() {
      state.reveal.doneAt = state.reveal.doneAt || Date.now();
      if (state.reveal.mode === 'correct') {
        state.q10Special.armed = state.nodeIndex === 9;
        state.q10Special.revealed = false;
        setFlowStepInternal('CROWD_REACT_WORD', 'mark_reveal_done');
      } else {
        setFlowStepInternal('WAIT_REPLY_1', 'mark_reveal_done_non_correct');
      }
      clearSchedulerBlockedReason();
      state.reveal.visible = false;
      state.reveal.phase = 'done';
      syncFear();
    },
    forceRevealDone() {
      state.reveal.visible = true;
      state.reveal.phase = 'done';
      state.reveal.doneAt = Date.now();
      syncFear();
    },
    applyCorrect(payload) {
      const node = getCurrentNode();
      state.consonant.parse = {
        ok: true,
        matchedChar: payload?.matchedChar ?? node?.char ?? '',
        kind: state.debugOverride.active ? 'debug_apply_correct' : 'manual_apply_correct',
        matchedAlias: '',
        inputNorm: payload?.input ?? '',
        inputRaw: payload?.input ?? '',
        allowedSetsHit: { latin: false, bopomofo: false, thai: false, cjk: false },
        matched: 'keyword',
        blockedReason: ''
      };
      state.consonant.judge = {
        ...state.consonant.judge,
        lastInput: payload?.input ?? state.consonant.judge.lastInput,
        lastResult: 'correct'
      };
      if (state.debugOverride.active) {
        state.debugOverride = { ...state.debugOverride, active: false, consumedAt: Date.now() };
      }
      startReveal('correct');
      syncFear();
    },
    activateDebugOverride(source = 'button') {
      state.debugOverride = { active: true, source, consumedAt: 0 };
    },
    advancePrompt(reason) {
      if (reason !== 'correct_done' && reason !== 'debug_pass') {
        state.advance = { ...state.advance, blockedReason: 'not_correct_or_pass', lastReason: 'blocked', lastAt: Date.now() };
        return;
      }
      const token = `${reason}:${state.prompt.current?.promptId ?? 'none'}:${state.nodeIndex}`;
      if (state.advance.inFlight || state.advance.lastToken === token) {
        state.advance = { ...state.advance, blockedReason: 'double_advance', lastReason: 'blocked', lastAt: Date.now() };
        return;
      }
      if (state.prompt.mismatch || state.mismatch.promptVsReveal) {
        state.advance = { ...state.advance, blockedReason: 'mismatch', lastReason: 'blocked', lastAt: Date.now() };
        state.scheduler.blockedReason = 'mismatch';
        return;
      }
      if (state.scheduler.phase === 'revealingWord' && reason === 'debug_pass') {
        resetPromptRuntimeState();
      }
      advancePromptInternal(reason, token);
    },
    markWaveDone(kind, count) {
      state.wave = { kind, count };
      state.scheduler.phase = 'supernaturalEvent';
      clearSchedulerBlockedReason();
      syncFear();
    },
    markSupernaturalDone() {
      state.scheduler.phase = 'vipTranslate';
      clearSchedulerBlockedReason();
      syncFear();
    },
    markVipTranslateDone() {
      state.scheduler.phase = 'reasoningPhase';
      clearSchedulerBlockedReason();
      syncFear();
    },
    markReasoningDone(count) {
      state.pipeline.reasoningCount = count;
      state.pendingDisambiguation = { active: false, attempts: 0, promptId: '' };
      state.scheduler.phase = 'tagPlayerPhase';
      clearSchedulerBlockedReason();
      syncFear();
    },
    resolveTagPlayerPhase(result) {
      if (result !== 'hit') {
        enqueueCurrentNodeForRevisit();
        state.pendingDisambiguation = {
          active: false,
          attempts: 0,
          promptId: ''
        };
      } else if (state.pendingQuestions.queue.length > 0 && state.pendingQuestions.revisiting) {
        const currentNode = getCurrentNode();
        if (currentNode && state.pendingQuestions.queue[0] === currentNode.id) {
          state.pendingQuestions.queue = state.pendingQuestions.queue.slice(1);
        }
      }
      const token = `tagPlayer:${state.prompt.current?.promptId ?? 'none'}:${state.nodeIndex}:${result}`;
      if (state.advance.inFlight || state.advance.lastToken === token) {
        state.advance = { ...state.advance, blockedReason: 'double_advance', lastReason: 'blocked', lastAt: Date.now() };
        return;
      }
      state.pipeline.tagPrompted = true;
      advancePromptInternal(`tagPlayer:${result}`, token);
    },
    commitLastCategory(category) {
      state.lastCategory = category;
    },
    setPendingDisambiguation(payload) {
      state.pendingDisambiguation = {
        active: payload.active,
        attempts: Math.max(0, payload.attempts),
        promptId: payload.promptId ?? state.pendingDisambiguation.promptId
      };
    },
    setQ10SpecialState(payload) {
      state.q10Special = {
        armed: payload.armed ?? state.q10Special.armed,
        revealed: payload.revealed ?? state.q10Special.revealed
      };
    },
    setPronounceState(nextState, payload) { state.audio = { state: nextState, lastKey: payload?.key ?? state.audio.lastKey, reason: payload?.reason ?? '' }; },
    notifyBlockedByPhase() {
      state.blocked = { reason: 'phaseBusy', count: state.blocked.count + 1 };
      state.scheduler.blockedReason = 'phaseBusy';
      state.advance.blockedReason = 'phaseBusy';
      syncFear();
    },
    commitAdvanceBlockedReason(reason) {
      state.advance.blockedReason = reason;
    },
    setCurrentPrompt(prompt) {
      state.prompt.current = prompt;
      state.prompt.overlay.consonantShown = prompt?.kind === 'consonant' ? prompt.consonant : '';
      if (!prompt) {
        state.prompt.pinned.promptIdRendered = '';
      }
      syncPromptMismatch();
    },
    getCurrentPrompt() {
      return state.prompt.current ? JSON.parse(JSON.stringify(state.prompt.current)) as SandboxPrompt : null;
    },
    commitPromptOverlay(_consonantShown) {
      state.prompt.overlay.consonantShown = state.prompt.current?.kind === 'consonant' ? state.prompt.current.consonant : '';
      syncPromptMismatch();
    },
    commitPromptPinnedRendered(promptIdRendered) {
      state.prompt.pinned.promptIdRendered = promptIdRendered;
      syncPromptMismatch();
    },
    commitPinnedWriter(payload) {
      state.prompt.pinned.lastWriter = {
        source: payload.source,
        writerBlocked: payload.writerBlocked,
        blockedReason: payload.blockedReason ?? ''
      };
    },
    commitHintText(text, source = '') {
      state.hint = { active: Boolean(text), lastText: text, count: state.hint.count + 1, lastShownAt: Date.now(), source };
    },
    setSubmitInFlight(inFlight, timestamp = Date.now()) {
      state.answer.submitInFlight = inFlight;
      state.answer.lastSubmitAt = timestamp;
      if (!inFlight) {
        state.advance.blockedReason = state.advance.blockedReason === 'double_submit' ? '' : state.advance.blockedReason;
      }
    },
    setFlowStep(step, reason = '', now = Date.now()) {
      setFlowStepInternal(step, reason, now);
      syncFear();
    },
    markTagAskedThisStep(askedAt = Date.now()) {
      state.flow = {
        ...state.flow,
        tagAskedThisStep: true,
        tagAskedAt: askedAt
      };
    },
    setFreeze(payload) {
      state.freeze = { ...state.freeze, ...payload };
    },
    setGlitchBurst(payload) {
      state.glitchBurst = { ...state.glitchBurst, ...payload };
    },
    setPlayerIdentity(payload) {
      if (!payload?.handle) {
        state.player = null;
        return;
      }
      state.player = { handle: payload.handle, id: payload.id };
    },
    setJoinGate(payload) {
      state.joinGate = { ...state.joinGate, ...payload };
    },
    setIntroGate(payload) {
      state.introGate = { ...state.introGate, ...payload };
    },
    setAnswerGate(payload) {
      state.answerGate = { ...state.answerGate, ...payload };
    },
    setWarmupState(payload) {
      state.warmup = { ...state.warmup, ...payload };
    },
    setLastTimestamps(payload) {
      state.last = { ...state.last, ...payload };
      state.flow = {
        ...state.flow,
        askedAt: payload.lastAskAt ?? state.flow.askedAt,
        tagAskedThisStep: payload.lastAskAt ? true : state.flow.tagAskedThisStep,
        tagAskedAt: payload.lastAskAt ?? state.flow.tagAskedAt,
        lastAnswerAt: payload.lastAnswerAt ?? state.flow.lastAnswerAt,
        lastRevealAt: payload.lastRevealAt ?? state.flow.lastRevealAt
      };
    },
    setPreheatState(payload) {
      state.preheat = { ...state.preheat, ...payload };
    },
    setSandboxFlow(payload) {
      state.sandboxFlow = { ...state.sandboxFlow, ...payload };
      state.flow = {
        ...state.flow,
        step: state.sandboxFlow.step,
        stepStartedAt: state.sandboxFlow.stepStartedAt,
        questionIndex: state.sandboxFlow.questionIndex
      };
      state.warmup.judgeArmed = state.sandboxFlow.replyGateActive;
    }
  };
}
