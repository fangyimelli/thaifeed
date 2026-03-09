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

export function createSandboxStoryMode(): GameMode & Record<string, any> {
  let ssot: NightScript = NIGHT1;
  let state: any = { flow: { step: 'BOOT', questionIndex: 0, stepStartedAt: Date.now(), tagAskedThisStep: false }, sandboxFlow: { gateType: 'none', replyTarget: null, replyGateActive: false, canReply: false, gateConsumed: false, retryCount: 0, retryLimit: 2, dedupeWindowMs: 5000, backlogTechMessages: [], pendingBacklogMessages: [], autoplayNightStatus: 'running' }, prompt: { current: null }, reveal: { visible: false, phase: 'idle', text: '', wordKey: '' }, consonant: { nodeChar: '' }, joinGate: { satisfied: false, submittedAt: 0 }, introGate: { startedAt: 0, minDurationMs: 30000, passed: false, remainingMs: 30000 }, preheat: { enabled: false, lastJoinAt: 0 }, freeze: { frozen: false, reason: 'NONE', frozenAt: 0 }, answerGate: { waiting: false, pausedChat: false }, player: { handle: '000', id: 'activeUser' }, last: { lastAskAt: 0 }, scheduler: { phase: 'idle' }, nodeIndex: 0 };
  const fear: SandboxFearDebugState = { fearLevel: 0, maxFear: 100, pressureLevel: 'low', ghostProbability: 0, triggers: { chatSpike: 0, storyEmotion: 0, darkFrame: 0, ghostNearby: 0 }, footsteps: { probability: 0, cooldownMs: 0, cooldownRemaining: 0, lastAt: 0 } };

  return {
    id: 'sandbox_story',
    label: 'Sandbox Story V2',
    init() {},
    onIncomingTag() {},
    onPlayerReply() {},
    tick() {},
    dispose() {},
    getState: () => state,
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
    forceRevealCurrent: () => { const prompt = state.prompt.current; if (!prompt) return null; const node = ssot.nodes.find((n) => n.id === prompt.wordKey); state.reveal = { visible: true, phase: 'word', text: node?.wordText ?? '', wordKey: prompt.wordKey }; return node; },
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
