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
export type SandboxRevealRenderMode = 'pair' | 'fullWord';

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
  scheduler: { phase: SandboxStoryPhase };
  consonant: {
    nodeChar: string;
    promptText: string;
    promptCurrent: string;
    parse: { ok: boolean; matchedChar: string; kind: string; matchedAlias: string; inputNorm: string };
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
    renderMode: SandboxRevealRenderMode;
    baseChar: string;
    restTextLen: number;
    mode: 'correct' | 'wrong' | 'unknown';
    audioKey: string;
    startedAt: number;
    wordKey: string;
  };
  ghostMotion: { lastId: string | null; state: 'idle' | 'playing' };
  ghostGate: { lastReason: string };
  fearSystem: SandboxFearDebugState;
  wave: { count: number; kind: 'related' | 'surprise' | 'guess' };
  blocked: { reason: '' | 'phaseBusy'; count: number };
  audio: { lastKey: string; state: 'playing' | 'idle' | 'error'; reason: string };
  hint: { lastText: string; count: number };
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
    parsed: { ok: boolean; matchedChar?: string; debug?: { kind?: string; matchedAlias?: string; inputNorm?: string } };
    judge: 'correct' | 'wrong' | 'unknown' | 'timeout';
  }) => void;
  getFearDebugState: () => SandboxFearDebugState;
  canTriggerGhostMotion: (ctx: { qnaType: 'consonant' | 'comprehension'; answerResult: 'correct' | 'wrong' | 'unknown' }) => SandboxGhostGateResult;
  registerFootstepsRoll: (now?: number) => { probability: number; cooldownRemaining: number; lastAt: number; shouldTrigger: boolean };
  debugAddFear: (value?: number) => void;
  debugResetFear: () => void;
  markRevealDone: () => void;
  markWaveDone: (kind: 'related' | 'surprise' | 'guess', count: number) => void;
  setPronounceState: (state: 'playing' | 'idle' | 'error', payload?: { key?: string; reason?: string }) => void;
  notifyBlockedByPhase: () => void;
  setCurrentPrompt: (prompt: SandboxPrompt | null) => void;
  getCurrentPrompt: () => SandboxPrompt | null;
  commitPromptOverlay: (consonantShown: string) => void;
  commitPromptPinnedRendered: (promptIdRendered: string) => void;
  commitPinnedWriter: (payload: {
    source: 'sandboxPromptCoordinator' | 'qnaEngine' | 'eventEngine' | 'unknown';
    writerBlocked: boolean;
    blockedReason?: '' | 'notSandbox' | 'phaseBusy' | 'writerNotAllowed';
  }) => void;
  commitHintText: (text: string) => void;
};

const cloneScript = (script: NightScript): NightScript => JSON.parse(JSON.stringify(script)) as NightScript;

export function createSandboxStoryMode(): SandboxStoryMode {
  let script: NightScript = cloneScript(NIGHT1);
  const maxFear = 100;
  let extraFear = 0;
  const state: SandboxStoryState = {
    nodeIndex: 0,
    scheduler: { phase: 'boot' },
    consonant: {
      nodeChar: '',
      promptText: '',
      promptCurrent: '',
      parse: { ok: false, matchedChar: '', kind: '', matchedAlias: '', inputNorm: '' },
      judge: { lastInput: '', lastResult: 'none', timeoutEnabled: false }
    },
    reveal: {
      visible: false,
      phase: 'idle',
      text: '',
      highlightChar: '',
      baseConsonant: '',
      appended: '',
      renderMode: 'fullWord',
      baseChar: '',
      restTextLen: 0,
      mode: 'correct',
      audioKey: '',
      startedAt: 0,
      wordKey: ''
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
    audio: { lastKey: '', state: 'idle', reason: '' },
    hint: { lastText: '', count: 0 },
    prompt: {
      current: null,
      overlay: { consonantShown: '' },
      pinned: {
        promptIdRendered: '',
        lastWriter: { source: 'unknown', writerBlocked: false, blockedReason: '' }
      },
      mismatch: false
    }
  };


  const splitGraphemes = (text: string) => Array.from(text || '');
  const DEFAULT_REVEAL_RENDER_MODE: SandboxRevealRenderMode = 'fullWord';
  const COMBINING_MARK_REGEX = /\p{Mark}/u;
  const shouldFallbackToFullWord = (text: string, baseConsonant: string) => {
    const wordGraphemes = splitGraphemes(text);
    const baseGraphemes = splitGraphemes(baseConsonant);
    const firstWordGrapheme = wordGraphemes[0] ?? '';
    const firstBaseGrapheme = baseGraphemes[0] ?? '';
    if (!firstWordGrapheme) return true;
    if (!firstBaseGrapheme) return true;
    if (baseGraphemes.length !== 1) return true;
    if (firstWordGrapheme !== firstBaseGrapheme) return true;
    const secondWordGrapheme = wordGraphemes[1] ?? '';
    if (secondWordGrapheme && COMBINING_MARK_REGEX.test(secondWordGrapheme)) return true;
    return false;
  };
  const pickAppendedByNode = (node: WordNode | null, mode: 'correct' | 'wrong' | 'unknown') => {
    if (!node) return '';
    const all = splitGraphemes(node.wordText);
    const baseLen = splitGraphemes(node.char).length || 1;
    const appended = all.slice(baseLen).join('');
    if (mode === 'correct') return appended;
    if (node.hintAppend) return node.hintAppend;
    const hintLen = Math.max(1, Math.min(2, node.hintAppendPrefixLen ?? 2));
    return splitGraphemes(appended).slice(0, hintLen).join('');
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
  const startReveal = (node: WordNode | null, mode: 'correct' | 'wrong' | 'unknown') => {
    if (!node) return;
    if (mode === 'correct') state.scheduler.phase = 'revealingWord';
    const wordGraphemes = splitGraphemes(node.wordText);
    const baseChar = wordGraphemes[0] ?? '';
    const restTextLen = Math.max(0, wordGraphemes.length - 1);
    const canUsePair = !shouldFallbackToFullWord(node.wordText, node.char);
    const renderMode: SandboxRevealRenderMode = canUsePair ? DEFAULT_REVEAL_RENDER_MODE : 'fullWord';
    state.reveal = {
      visible: true,
      phase: 'enter',
      text: node.wordText,
      highlightChar: node.char,
      baseConsonant: node.char,
      appended: pickAppendedByNode(node, mode),
      renderMode,
      baseChar,
      restTextLen,
      mode,
      audioKey: node.audioKey,
      startedAt: Date.now(),
      wordKey: node.id
    };
  };

  return {
    id: 'sandbox_story',
    label: 'Sandbox Story Mode',
    init() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'awaitingTag';
      state.reveal.visible = false;
      state.reveal.phase = 'idle';
      state.reveal.appended = '';
      state.hint = { lastText: '', count: 0 };
      state.wave = { count: 0, kind: 'related' };
      state.blocked = { reason: '', count: 0 };
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      state.prompt.pinned.lastWriter = { source: 'unknown', writerBlocked: false, blockedReason: '' };
      syncPromptMismatch();
      syncNodeChar();
      syncFear();
    },
    onIncomingTag() {
      if (state.scheduler.phase === 'revealingWord') {
        state.blocked = { reason: 'phaseBusy', count: state.blocked.count + 1 };
        syncFear();
        return;
      }
      if (state.scheduler.phase === 'awaitingTag') state.scheduler.phase = 'awaitingAnswer';
      syncFear();
    },
    onPlayerReply() { syncFear(); },
    tick() {
      if (state.scheduler.phase === 'revealingWord') {
        const elapsed = Date.now() - state.reveal.startedAt;
        state.reveal.phase = elapsed < 200 ? 'enter' : elapsed < 1200 ? 'pulse' : elapsed < 2100 ? 'exit' : 'done';
      }
      syncFear();
    },
    dispose() {},
    getState: () => JSON.parse(JSON.stringify(state)) as SandboxStoryState,
    getCurrentNode,
    forceRevealCurrent() {
      const node = getCurrentNode();
      startReveal(node, 'correct');
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
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(0, script.nodes.length - 1));
      state.scheduler.phase = 'awaitingTag';
      state.reveal = { ...state.reveal, visible: false, phase: 'idle', appended: '', startedAt: 0 };
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      syncPromptMismatch();
      syncNodeChar();
      syncFear();
    },
    forceWave(kind) {
      state.wave.kind = kind;
      state.scheduler.phase = 'awaitingTag';
      syncFear();
    },
    getSSOT: () => cloneScript(script),
    importSSOT(nextScript) {
      if (!nextScript?.nodes?.length) return false;
      script = cloneScript(nextScript);
      state.nodeIndex = 0;
      state.scheduler.phase = 'awaitingTag';
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      syncPromptMismatch();
      syncNodeChar();
      syncFear();
      return true;
    },
    setConsonantPromptText(promptText) {
      state.consonant.promptText = promptText;
      state.consonant.promptCurrent = getCurrentNode()?.char ?? '';
    },
    commitConsonantJudgeResult(result) {
      state.consonant.parse = { ok: result.parsed.ok, matchedChar: result.parsed.matchedChar ?? '', kind: result.parsed.debug?.kind ?? '', matchedAlias: result.parsed.debug?.matchedAlias ?? '', inputNorm: result.parsed.debug?.inputNorm ?? '' };
      state.consonant.judge = { ...state.consonant.judge, lastInput: result.input, lastResult: result.judge };
      if (result.judge === 'correct' && result.parsed.matchedChar === state.consonant.nodeChar) startReveal(getCurrentNode(), 'correct');
      if (result.judge === 'wrong') startReveal(getCurrentNode(), 'wrong');
      if (result.judge === 'unknown') startReveal(getCurrentNode(), 'unknown');
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
      if (state.reveal.mode === 'correct') {
        state.scheduler.phase = 'awaitingWave';
      } else {
        state.scheduler.phase = 'awaitingAnswer';
      }
      state.reveal.visible = false;
      state.reveal.phase = 'done';
      syncFear();
    },
    markWaveDone(kind, count) {
      state.wave = { kind, count };
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(script.nodes.length - 1, 0));
      syncNodeChar();
      state.scheduler.phase = 'awaitingTag';
      state.reveal = { ...state.reveal, visible: false, phase: 'idle', appended: '', startedAt: 0 };
      state.prompt.current = null;
      state.prompt.overlay.consonantShown = '';
      state.prompt.pinned.promptIdRendered = '';
      syncPromptMismatch();
      syncFear();
    },
    setPronounceState(nextState, payload) { state.audio = { state: nextState, lastKey: payload?.key ?? state.audio.lastKey, reason: payload?.reason ?? '' }; },
    notifyBlockedByPhase() { state.blocked = { reason: 'phaseBusy', count: state.blocked.count + 1 }; syncFear(); },
    setCurrentPrompt(prompt) {
      state.prompt.current = prompt;
      if (!prompt) {
        state.prompt.overlay.consonantShown = '';
        state.prompt.pinned.promptIdRendered = '';
      }
      syncPromptMismatch();
    },
    getCurrentPrompt() {
      return state.prompt.current ? JSON.parse(JSON.stringify(state.prompt.current)) as SandboxPrompt : null;
    },
    commitPromptOverlay(consonantShown) {
      state.prompt.overlay.consonantShown = consonantShown;
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
    commitHintText(text) {
      state.hint = { lastText: text, count: state.hint.count + 1 };
    }
  };
}
