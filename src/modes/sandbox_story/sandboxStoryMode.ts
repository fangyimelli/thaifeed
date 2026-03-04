import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { NightScript, WordNode } from '../../ssot/sandbox_story/types';
import type { GameMode } from '../types';

export type SandboxStoryPhase =
  | 'boot'
  | 'awaitingTag'
  | 'awaitingAnswer'
  | 'revealingWord'
  | 'awaitingWave';

export type SandboxRevealPhase = 'idle' | 'enter' | 'pulse' | 'exit' | 'done';
export type SandboxRevealSplitter = 'segmenter' | 'arrayfrom';

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
  nodeIndex: number;
  scheduler: { phase: SandboxStoryPhase; blockedReason: string };
  consonant: {
    nodeChar: string;
    promptText: string;
    promptCurrent: string;
    parse: { ok: boolean; matchedChar: string; kind: string; matchedAlias: string; inputNorm: string; inputRaw: string; allowedSetsHit: { latin: boolean; bopomofo: boolean; thai: boolean; cjk: boolean }; matched: string; blockedReason: string };
    judge: {
      lastInput: string;
      lastResult: 'correct' | 'wrong' | 'unknown' | 'timeout' | 'none';
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
    judge: 'correct' | 'wrong' | 'unknown' | 'timeout';
  }) => void;
  getFearDebugState: () => SandboxFearDebugState;
  canTriggerGhostMotion: (ctx: { qnaType: 'consonant' | 'comprehension'; answerResult: 'correct' | 'wrong' | 'unknown' }) => SandboxGhostGateResult;
  registerFootstepsRoll: (now?: number) => { probability: number; cooldownRemaining: number; lastAt: number; shouldTrigger: boolean };
  debugAddFear: (value?: number) => void;
  debugResetFear: () => void;
  markRevealDone: () => void;
  forceRevealDone: () => void;
  applyCorrect: (payload?: { input?: string; matchedChar?: string }) => void;
  advancePrompt: (reason: string) => void;
  markWaveDone: (kind: 'related' | 'surprise' | 'guess', count: number) => void;
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
    nodeIndex: 0,
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

  const getCurrentNode = () => script.nodes[state.nodeIndex] ?? null;
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
  };
  const advancePromptInternal = (reason: string, token: string) => {
    state.advance = { ...state.advance, inFlight: true, lastToken: token, lastAt: Date.now(), lastReason: reason, blockedReason: '' };
    state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(script.nodes.length - 1, 0));
    syncNodeChar();
    state.scheduler.phase = 'awaitingTag';
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
      state.scheduler.phase = 'awaitingTag';
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
      if (state.scheduler.phase === 'awaitingTag') state.scheduler.phase = 'awaitingAnswer';
      syncFear();
    },
    onPlayerReply() { syncFear(); },
    tick() {
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
    forceAskConsonantNow() { state.scheduler.phase = 'awaitingTag'; syncFear(); },
    forceAskComprehensionNow() { state.scheduler.phase = 'awaitingTag'; syncFear(); },
    forceGhostMotion(motionId) {
      state.ghostMotion = { lastId: motionId ?? 'disabled_no_ghost_entity', state: 'idle' };
      syncFear();
      return null;
    },
    forceAdvanceNode() {
      state.advance = { ...state.advance, inFlight: false, lastToken: '', lastAt: Date.now(), lastReason: 'forceAdvanceNode', blockedReason: '' };
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(0, script.nodes.length - 1));
      state.scheduler.phase = 'awaitingTag';
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
      state.scheduler.phase = 'awaitingTag';
      clearSchedulerBlockedReason();
      syncFear();
    },
    getSSOT: () => cloneScript(script),
    importSSOT(nextScript) {
      if (!nextScript?.nodes?.length) return false;
      script = cloneScript(nextScript);
      state.nodeIndex = 0;
      state.scheduler.phase = 'awaitingTag';
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
      if (state.consonant.parse.blockedReason === 'input_sanitized_to_empty') {
        state.advance.blockedReason = 'input_sanitized_to_empty';
      } else if (!result.parsed.ok || (result.parsed.debug?.kind ?? '') === 'none') {
        state.advance.blockedReason = 'parse_none';
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
        state.scheduler.phase = 'awaitingWave';
      } else {
        state.scheduler.phase = 'awaitingAnswer';
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
        kind: 'debug_apply_correct',
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
      startReveal('correct');
      syncFear();
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
      const token = `wave:${kind}:${count}:${state.prompt.current?.promptId ?? 'none'}:${state.nodeIndex}`;
      if (state.advance.inFlight || state.advance.lastToken === token) {
        state.advance = { ...state.advance, blockedReason: 'double_advance', lastReason: 'blocked', lastAt: Date.now() };
        return;
      }
      state.wave = { kind, count };
      advancePromptInternal(`markWaveDone:${kind}:${count}`, token);
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
    }
  };
}
