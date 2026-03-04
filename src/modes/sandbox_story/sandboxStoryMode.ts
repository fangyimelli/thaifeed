import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { NightScript, WordNode } from '../../ssot/sandbox_story/types';
import type { GameMode } from '../types';

export type SandboxStoryPhase =
  | 'boot'
  | 'awaitingTag'
  | 'awaitingAnswer'
  | 'revealingWord';

export type SandboxRevealPhase = 'idle' | 'fadeIn' | 'hold' | 'fogOut' | 'done';

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
    reveal: { visible: false, phase: 'idle', text: '', highlightChar: '', baseConsonant: '', audioKey: '', startedAt: 0, wordKey: '' },
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
    audio: { lastKey: '', state: 'idle', reason: '' }
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
      triggers: { chatSpike: Math.min(30, state.wave.count * 4), storyEmotion: Math.min(35, state.reveal.visible ? 20 : 8), darkFrame: state.reveal.phase === 'fogOut' ? 12 : 3, ghostNearby: 4 },
      footsteps: {
        probability,
        cooldownMs,
        cooldownRemaining,
        lastAt: state.fearSystem.footsteps.lastAt || 0
      }
    };
  };
  const startReveal = (node: WordNode | null) => {
    if (!node) return;
    state.scheduler.phase = 'revealingWord';
    state.reveal = {
      visible: true,
      phase: 'fadeIn',
      text: node.wordText,
      highlightChar: node.char,
      baseConsonant: node.char,
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
      state.wave = { count: 0, kind: 'related' };
      state.blocked = { reason: '', count: 0 };
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
        state.reveal.phase = elapsed < 800 ? 'fadeIn' : elapsed < 1700 ? 'hold' : elapsed < 2900 ? 'fogOut' : 'done';
      }
      syncFear();
    },
    dispose() {},
    getState: () => JSON.parse(JSON.stringify(state)) as SandboxStoryState,
    getCurrentNode,
    forceRevealCurrent() {
      const node = getCurrentNode();
      startReveal(node);
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
      state.reveal = { ...state.reveal, visible: false, phase: 'idle' };
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
      if (result.judge === 'correct' && result.parsed.matchedChar === state.consonant.nodeChar) startReveal(getCurrentNode());
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
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(script.nodes.length - 1, 0));
      syncNodeChar();
      state.scheduler.phase = 'awaitingTag';
      state.reveal.visible = false;
      state.reveal.phase = 'done';
      syncFear();
    },
    markWaveDone(kind, count) {
      state.wave = { kind, count };
      state.scheduler.phase = 'awaitingTag';
      syncFear();
    },
    setPronounceState(nextState, payload) { state.audio = { state: nextState, lastKey: payload?.key ?? state.audio.lastKey, reason: payload?.reason ?? '' }; },
    notifyBlockedByPhase() { state.blocked = { reason: 'phaseBusy', count: state.blocked.count + 1 }; syncFear(); }
  };
}
