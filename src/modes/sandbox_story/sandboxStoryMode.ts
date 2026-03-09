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

export const createSandboxV2InitialState = () => ({
  flow: { step: 'BOOT', questionIndex: 0, stepStartedAt: Date.now(), tagAskedThisStep: false },
  sandboxFlow: { gateType: 'none', replyTarget: null, replyGateActive: false, canReply: false, gateConsumed: false, retryCount: 0, retryLimit: 2, dedupeWindowMs: 5000, backlogTechMessages: [], pendingBacklogMessages: [], autoplayNightStatus: 'running', autoplayNightEnabled: false },
  prompt: {
    current: null,
    overlay: { consonantShown: '' },
    pinned: { promptIdRendered: '', lastWriter: { source: 'init', blockedReason: '', writerBlocked: false } },
    mismatch: false
  },
  reveal: { visible: false, phase: 'idle', text: '', wordKey: '', consonantFromPrompt: '', durationMs: 0, doneAt: 0 },
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
  introGate: { startedAt: 0, minDurationMs: 30000, passed: false, remainingMs: 30000 },
  preheat: { enabled: false, lastJoinAt: 0 },
  freeze: { frozen: false, reason: 'NONE', frozenAt: 0 },
  answerGate: { waiting: false, pausedChat: false },
  player: { handle: '000', id: 'activeUser' },
  last: { lastAskAt: 0 },
  scheduler: { phase: 'idle' },
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
  audit: { transitions: [] as Array<{ from: string; to: string; at: number; reason?: string }> },
  replyGate: { type: 'none', armed: false, sourceMessageId: '', targetActor: '', canReply: false, sourceType: '', consumePolicy: 'single' },
  lastReplyEval: { messageId: '', gateType: 'none', consumed: false, reason: '', rawInput: '', normalizedInput: '', extractedAnswer: '' },
  techBacklog: { queued: 0, pending: 0, lastDrainAt: 0 },
  theory: { active: false, nodeId: '', promptId: '' },
  transitions: [] as Array<{ event: string; at: number; detail?: string }>
});

export function ensureSandboxV2StateShape(raw: any) {
  const base = createSandboxV2InitialState();
  const next = { ...base, ...(raw ?? {}) };
  next.prompt = { ...base.prompt, ...(raw?.prompt ?? {}) };
  next.prompt.overlay = { ...base.prompt.overlay, ...(raw?.prompt?.overlay ?? {}) };
  next.prompt.pinned = { ...base.prompt.pinned, ...(raw?.prompt?.pinned ?? {}) };
  next.prompt.pinned.lastWriter = { ...base.prompt.pinned.lastWriter, ...(raw?.prompt?.pinned?.lastWriter ?? {}) };
  next.reveal = { ...base.reveal, ...(raw?.reveal ?? {}) };
  next.consonant = { ...base.consonant, ...(raw?.consonant ?? {}) };
  next.consonant.parse = { ...base.consonant.parse, ...(raw?.consonant?.parse ?? {}) };
  next.consonant.judge = { ...base.consonant.judge, ...(raw?.consonant?.judge ?? {}) };
  next.sandboxFlow = { ...base.sandboxFlow, ...(raw?.sandboxFlow ?? {}) };
  next.pendingQuestions = { ...base.pendingQuestions, ...(raw?.pendingQuestions ?? {}) };
  next.pendingQuestions.queue = Array.isArray(raw?.pendingQuestions?.queue) ? raw.pendingQuestions.queue : [];
  next.pendingDisambiguation = { ...base.pendingDisambiguation, ...(raw?.pendingDisambiguation ?? {}) };
  next.q10Special = { ...base.q10Special, ...(raw?.q10Special ?? {}) };
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
  next.replyGate = { ...base.replyGate, ...(raw?.replyGate ?? {}) };
  next.lastReplyEval = { ...base.lastReplyEval, ...(raw?.lastReplyEval ?? {}) };
  next.techBacklog = { ...base.techBacklog, ...(raw?.techBacklog ?? {}) };
  next.theory = { ...base.theory, ...(raw?.theory ?? {}) };
  next.transitions = Array.isArray(raw?.transitions) ? raw.transitions : [];
  return next;
}

export function createSandboxStoryMode(): GameMode & Record<string, any> {
  let ssot: NightScript = NIGHT1;
  let state: any = createSandboxV2InitialState();
  const fear: SandboxFearDebugState = { fearLevel: 0, maxFear: 100, pressureLevel: 'low', ghostProbability: 0, triggers: { chatSpike: 0, storyEmotion: 0, darkFrame: 0, ghostNearby: 0 }, footsteps: { probability: 0, cooldownMs: 0, cooldownRemaining: 0, lastAt: 0 } };

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
    importSSOT: (next: NightScript) => { ssot = next; return true; },
    setPlayerIdentity: (p: any) => { state.player = { ...state.player, ...p }; },
    setJoinGate: (v: any) => { state.joinGate = { ...state.joinGate, ...v }; },
    setFlowStep: (step: string, _reason?: string, at?: number) => { state.flow = { ...state.flow, step, stepStartedAt: at ?? Date.now(), tagAskedThisStep: false }; },
    setIntroGate: (v: any) => { state.introGate = { ...state.introGate, ...v }; },
    setPreheatState: (v: any) => { state.preheat = { ...state.preheat, ...v }; },
    markWaveDone: () => undefined,
    setSandboxFlow: (v: any) => { state.sandboxFlow = { ...state.sandboxFlow, ...v }; },
    commitConsonantJudgeResult: () => undefined,
    setFreeze: (v: any) => { state.freeze = { ...state.freeze, ...v }; },
    setAnswerGate: (v: any) => { state.answerGate = { ...state.answerGate, ...v }; },
    commitPinnedWriter: () => undefined,
    commitPromptPinnedRendered: () => undefined,
    canTriggerGhostMotion: () => ({ allowed: true, reason: 'ok' }),
    setPronounceState: () => undefined,
    forceRevealDone: () => undefined,
    markRevealDone: () => undefined,
    setCurrentPrompt: (prompt: SandboxPrompt) => { state.prompt.current = prompt; state.consonant.nodeChar = prompt.consonant; },
    forceRevealCurrent: () => { const prompt = state.prompt.current; if (!prompt) return null; const node = ssot.nodes.find((n) => n.id === prompt.wordKey); state.reveal = { ...state.reveal, visible: true, phase: 'word', text: node?.wordText ?? '', wordKey: prompt.wordKey }; return node; },
    commitAdvanceBlockedReason: () => undefined,
    setConsonantPromptText: () => undefined,
    commitPromptOverlay: () => undefined,
    markTagAskedThisStep: () => { state.flow.tagAskedThisStep = true; },
    setLastTimestamps: (v: any) => { state.last = { ...state.last, ...v }; },
    forceAdvanceNode: () => { state.nodeIndex += 1; state.flow.questionIndex = state.nodeIndex; },
    commitHintText: () => undefined,
    activateDebugOverride: () => undefined,
    advancePrompt: () => undefined,
    applyCorrect: () => undefined,
    debugAddFear: (n: number) => { fear.fearLevel = Math.min(fear.maxFear, fear.fearLevel + n); fear.pressureLevel = fear.fearLevel > 80 ? 'panic' : fear.fearLevel > 66 ? 'high' : fear.fearLevel > 33 ? 'medium' : 'low'; },
    debugResetFear: () => { fear.fearLevel = 0; fear.pressureLevel = 'low'; },
    forceAskComprehensionNow: () => undefined,
    forceAskConsonantNow: () => undefined,
    forceWave: () => undefined,
    registerFootstepsRoll: () => ({ chance: 0 }),
    setSubmitInFlight: () => undefined
  };
}
