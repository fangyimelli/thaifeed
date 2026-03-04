import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { NightScript, WordNode } from '../../ssot/sandbox_story/types';
import type { GameMode } from '../types';

export type SandboxStoryPhase =
  | 'boot'
  | 'awaitingConsonantTagPrompt'
  | 'pinnedFreezeAwaitConsonant'
  | 'revealingWord'
  | 'chatWaveRelated'
  | 'awaitingComprehensionTag'
  | 'pinnedFreezeAwaitAnswer'
  | 'resolvingComprehension'
  | 'ghostMotionPlaying'
  | 'postMotionWrapUp';

export type SandboxRevealPhase = 'idle' | 'fadeIn' | 'hold' | 'fogOut';

export type SandboxStoryState = {
  nodeIndex: number;
  scheduler: {
    phase: SandboxStoryPhase;
  };
  consonant: {
    nodeChar: string;
    promptText: string;
    parse: {
      ok: boolean;
      matchedChar: string;
      kind: string;
      matchedAlias: string;
      inputNorm: string;
    };
  };
  reveal: {
    visible: boolean;
    phase: SandboxRevealPhase;
    text: string;
    highlightChar: string;
    audioKey: string;
    startedAt: number;
  };
  ghostMotion: {
    lastId: string | null;
    state: 'idle' | 'playing';
  };
  fear: {
    maxFear: number;
    baseProbability: number;
    triggers: Record<'chatSpike' | 'storyEmotion' | 'darkFrame' | 'ghostNearby', number>;
  };
};

type FearTriggerKey = keyof SandboxStoryState['fear']['triggers'];

export type SandboxFearDebugState = {
  fearLevel: number;
  maxFear: number;
  pressureLevel: 'low' | 'medium' | 'high' | 'panic';
  ghostProbability: number;
  baseProbability: number;
  fearLevelFactor: number;
  triggers: Array<{ name: FearTriggerKey; value: number }>;
};

export type SandboxStoryMode = GameMode & {
  getState: () => SandboxStoryState;
  getCurrentNode: () => WordNode | null;
  forceRevealCurrent: () => WordNode | null;
  forceAskConsonantNow: () => void;
  forceAskComprehensionNow: () => void;
  forceGhostMotion: (motionId?: string) => string | null;
  forceAdvanceNode: () => void;
  getSSOT: () => NightScript;
  importSSOT: (nextScript: NightScript) => boolean;
  setConsonantPromptText: (promptText: string) => void;
  commitConsonantParseResult: (result: {
    ok: boolean;
    matchedChar?: string;
    debug?: { kind?: string; matchedAlias?: string; inputNorm?: string };
  }) => void;
  getFearDebugState: () => SandboxFearDebugState;
  addFear: (amount: number) => void;
  resetFear: () => void;
};

const PHASE_SEQUENCE: SandboxStoryPhase[] = [
  'awaitingConsonantTagPrompt',
  'pinnedFreezeAwaitConsonant',
  'revealingWord',
  'chatWaveRelated',
  'awaitingComprehensionTag',
  'pinnedFreezeAwaitAnswer',
  'resolvingComprehension',
  'ghostMotionPlaying',
  'postMotionWrapUp'
];

const cloneScript = (script: NightScript): NightScript => JSON.parse(JSON.stringify(script)) as NightScript;

const FEAR_TRIGGER_KEYS: FearTriggerKey[] = ['chatSpike', 'storyEmotion', 'darkFrame', 'ghostNearby'];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computePressureLevel(fearLevel: number, maxFear: number): SandboxFearDebugState['pressureLevel'] {
  const ratio = maxFear <= 0 ? 0 : fearLevel / maxFear;
  if (ratio >= 0.85) return 'panic';
  if (ratio >= 0.6) return 'high';
  if (ratio >= 0.3) return 'medium';
  return 'low';
}

export function createSandboxStoryMode(): SandboxStoryMode {
  const state: SandboxStoryState = {
    nodeIndex: 0,
    scheduler: {
      phase: 'boot'
    },
    consonant: {
      nodeChar: '',
      promptText: '',
      parse: {
        ok: false,
        matchedChar: '',
        kind: '',
        matchedAlias: '',
        inputNorm: ''
      }
    },
    reveal: {
      visible: false,
      phase: 'idle',
      text: '',
      highlightChar: '',
      audioKey: '',
      startedAt: 0
    },
    ghostMotion: {
      lastId: null,
      state: 'idle'
    },
    fear: {
      maxFear: 100,
      baseProbability: 0.12,
      triggers: {
        chatSpike: 8,
        storyEmotion: 10,
        darkFrame: 6,
        ghostNearby: 0
      }
    }
  };

  let script: NightScript = cloneScript(NIGHT1);

  const getCurrentNode = () => script.nodes[state.nodeIndex] ?? null;

  const syncNodeChar = () => {
    const node = getCurrentNode();
    state.consonant.nodeChar = node?.char ?? '';
  };

  const applyRevealFromNode = (node: WordNode | null) => {
    if (!node) return;
    state.reveal = {
      visible: true,
      phase: 'fadeIn',
      text: node.word,
      highlightChar: node.highlightChar,
      audioKey: node.audioKey,
      startedAt: Date.now()
    };
  };

  const toNextPhase = () => {
    if (state.scheduler.phase === 'boot') {
      state.scheduler.phase = PHASE_SEQUENCE[0];
      return;
    }
    const phaseIndex = PHASE_SEQUENCE.indexOf(state.scheduler.phase);
    if (phaseIndex < 0) {
      state.scheduler.phase = PHASE_SEQUENCE[0];
      return;
    }
    const next = PHASE_SEQUENCE[phaseIndex + 1];
    if (!next) {
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(0, script.nodes.length - 1));
      syncNodeChar();
      state.scheduler.phase = 'awaitingConsonantTagPrompt';
      return;
    }
    state.scheduler.phase = next;
  };

  const readFearLevel = () => FEAR_TRIGGER_KEYS.reduce((sum, key) => sum + Math.max(0, state.fear.triggers[key]), 0);

  const getFearDebugState = (): SandboxFearDebugState => {
    const fearLevel = clamp(readFearLevel(), 0, state.fear.maxFear);
    const fearLevelFactor = clamp(fearLevel / Math.max(1, state.fear.maxFear) * 0.65, 0, 0.65);
    return {
      fearLevel,
      maxFear: state.fear.maxFear,
      pressureLevel: computePressureLevel(fearLevel, state.fear.maxFear),
      baseProbability: state.fear.baseProbability,
      fearLevelFactor,
      ghostProbability: clamp(state.fear.baseProbability + fearLevelFactor, 0, 1),
      triggers: FEAR_TRIGGER_KEYS.map((name) => ({ name, value: state.fear.triggers[name] }))
    };
  };

  const setFearLevelByAbsolute = (nextFearLevel: number) => {
    const clamped = clamp(nextFearLevel, 0, state.fear.maxFear);
    const staticContribution = state.fear.triggers.storyEmotion + state.fear.triggers.darkFrame + state.fear.triggers.ghostNearby;
    const nextChatSpike = clamp(clamped - staticContribution, 0, state.fear.maxFear);
    state.fear.triggers.chatSpike = nextChatSpike;
  };

  return {
    id: 'sandbox_story',
    label: 'Sandbox Story Mode',
    init() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'boot';
      syncNodeChar();
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { lastId: null, state: 'idle' };
      toNextPhase();
    },
    onIncomingTag() {
      if (state.scheduler.phase === 'awaitingComprehensionTag') {
        state.scheduler.phase = 'pinnedFreezeAwaitAnswer';
      }
      if (state.scheduler.phase === 'awaitingConsonantTagPrompt') {
        state.scheduler.phase = 'pinnedFreezeAwaitConsonant';
      }
    },
    onPlayerReply() {
      if (state.scheduler.phase === 'pinnedFreezeAwaitAnswer') {
        state.scheduler.phase = 'resolvingComprehension';
      }
    },
    tick() {
      if (state.scheduler.phase === 'revealingWord') {
        if (!state.reveal.visible) {
          applyRevealFromNode(getCurrentNode());
        }
        const elapsed = Math.max(0, Date.now() - state.reveal.startedAt);
        if (elapsed < 800) {
          state.reveal.phase = 'fadeIn';
          return;
        }
        if (elapsed < 1700) {
          state.reveal.phase = 'hold';
          return;
        }
        if (elapsed < 2900) {
          state.reveal.phase = 'fogOut';
          return;
        }
        state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
        state.scheduler.phase = 'chatWaveRelated';
        return;
      }
      if (state.scheduler.phase === 'ghostMotionPlaying' || state.scheduler.phase === 'pinnedFreezeAwaitConsonant' || state.scheduler.phase === 'pinnedFreezeAwaitAnswer') {
        return;
      }
      toNextPhase();
    },
    dispose() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'boot';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { lastId: null, state: 'idle' };
    },
    getState: () => ({
      nodeIndex: state.nodeIndex,
      scheduler: {
        phase: state.scheduler.phase
      },
      consonant: {
        nodeChar: state.consonant.nodeChar,
        promptText: state.consonant.promptText,
        parse: {
          ...state.consonant.parse
        }
      },
      reveal: {
        ...state.reveal
      },
      ghostMotion: {
        ...state.ghostMotion
      },
      fear: {
        maxFear: state.fear.maxFear,
        baseProbability: state.fear.baseProbability,
        triggers: {
          ...state.fear.triggers
        }
      }
    }),
    getCurrentNode,
    forceRevealCurrent() {
      const node = getCurrentNode();
      applyRevealFromNode(node);
      return node;
    },
    forceAskConsonantNow() {
      state.scheduler.phase = 'awaitingConsonantTagPrompt';
    },
    forceAskComprehensionNow() {
      state.scheduler.phase = 'awaitingComprehensionTag';
    },
    forceGhostMotion(motionId) {
      const node = getCurrentNode();
      const selectedId = motionId ?? node?.comprehensionQuestion.ghostMotionOnCorrect ?? null;
      if (!selectedId) return null;
      state.scheduler.phase = 'ghostMotionPlaying';
      state.ghostMotion = {
        lastId: selectedId,
        state: 'playing'
      };
      return selectedId;
    },
    forceAdvanceNode() {
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(0, script.nodes.length - 1));
      syncNodeChar();
      state.scheduler.phase = 'awaitingConsonantTagPrompt';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { ...state.ghostMotion, state: 'idle' };
    },
    getSSOT: () => cloneScript(script),
    importSSOT(nextScript) {
      if (!nextScript?.nodes?.length) return false;
      script = cloneScript(nextScript);
      state.nodeIndex = 0;
      syncNodeChar();
      state.scheduler.phase = 'awaitingConsonantTagPrompt';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { lastId: null, state: 'idle' };
      return true;
    },
    setConsonantPromptText(promptText) {
      state.consonant.promptText = promptText;
    },
    commitConsonantParseResult(result) {
      state.consonant.parse = {
        ok: result.ok,
        matchedChar: result.matchedChar ?? '',
        kind: result.debug?.kind ?? '',
        matchedAlias: result.debug?.matchedAlias ?? '',
        inputNorm: result.debug?.inputNorm ?? ''
      };
      if (result.ok && result.matchedChar === state.consonant.nodeChar) {
        applyRevealFromNode(getCurrentNode());
        state.scheduler.phase = 'revealingWord';
        state.fear.triggers.storyEmotion = clamp(state.fear.triggers.storyEmotion + 2, 0, state.fear.maxFear);
      }
    },
    getFearDebugState,
    addFear(amount) {
      setFearLevelByAbsolute(readFearLevel() + amount);
    },
    resetFear() {
      state.fear.triggers = {
        chatSpike: 0,
        storyEmotion: 0,
        darkFrame: 0,
        ghostNearby: 0
      };
    }
  };
}
