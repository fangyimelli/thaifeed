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
  fearSystem: {
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
  };
};

export type SandboxFearDebugState = SandboxStoryState['fearSystem'];

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
  debugAddFear: (value?: number) => void;
  debugResetFear: () => void;
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

export function createSandboxStoryMode(): SandboxStoryMode {
  const maxFear = 100;
  const baseProbability = 0.1;

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
    fearSystem: {
      fearLevel: 0,
      maxFear,
      pressureLevel: 'low',
      ghostProbability: baseProbability,
      triggers: {
        chatSpike: 0,
        storyEmotion: 0,
        darkFrame: 0,
        ghostNearby: 0
      }
    }
  };

  let script: NightScript = cloneScript(NIGHT1);
  let debugStoryEmotionBonus = 0;

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

  const toPressureLevel = (fearLevel: number): SandboxFearDebugState['pressureLevel'] => {
    if (fearLevel >= 80) return 'panic';
    if (fearLevel >= 60) return 'high';
    if (fearLevel >= 30) return 'medium';
    return 'low';
  };

  const computeFearDebugState = (): SandboxFearDebugState => {
    const chatSpike = Math.min(30, state.nodeIndex * 3 + (state.scheduler.phase === 'chatWaveRelated' ? 6 : 2));
    const storyEmotion = Math.min(35, state.nodeIndex * 7 + (state.reveal.visible ? 8 : 0) + debugStoryEmotionBonus);
    const darkFrame = state.reveal.visible && state.reveal.phase === 'fogOut' ? 12 : 3;
    const ghostNearby = state.ghostMotion.state === 'playing' ? 16 : 4;
    const fearLevel = Math.max(0, Math.min(maxFear, chatSpike + storyEmotion + darkFrame + ghostNearby));
    const fearLevelFactor = fearLevel / maxFear;
    const ghostProbability = Math.max(0, Math.min(1, baseProbability + fearLevelFactor));
    return {
      fearLevel,
      maxFear,
      pressureLevel: toPressureLevel(fearLevel),
      ghostProbability,
      triggers: {
        chatSpike,
        storyEmotion,
        darkFrame,
        ghostNearby
      }
    };
  };

  const syncFearState = () => {
    state.fearSystem = computeFearDebugState();
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

  return {
    id: 'sandbox_story',
    label: 'Sandbox Story Mode',
    init() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'boot';
      syncNodeChar();
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { lastId: null, state: 'idle' };
      debugStoryEmotionBonus = 0;
      toNextPhase();
      syncFearState();
    },
    onIncomingTag() {
      if (state.scheduler.phase === 'awaitingComprehensionTag') {
        state.scheduler.phase = 'pinnedFreezeAwaitAnswer';
      }
      if (state.scheduler.phase === 'awaitingConsonantTagPrompt') {
        state.scheduler.phase = 'pinnedFreezeAwaitConsonant';
      }
      syncFearState();
    },
    onPlayerReply() {
      if (state.scheduler.phase === 'pinnedFreezeAwaitAnswer') {
        state.scheduler.phase = 'resolvingComprehension';
      }
      syncFearState();
    },
    tick() {
      if (state.scheduler.phase === 'revealingWord') {
        if (!state.reveal.visible) {
          applyRevealFromNode(getCurrentNode());
        }
        const elapsed = Math.max(0, Date.now() - state.reveal.startedAt);
        if (elapsed < 800) {
          state.reveal.phase = 'fadeIn';
          syncFearState();
          return;
        }
        if (elapsed < 1700) {
          state.reveal.phase = 'hold';
          syncFearState();
          return;
        }
        if (elapsed < 2900) {
          state.reveal.phase = 'fogOut';
          syncFearState();
          return;
        }
        state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
        state.scheduler.phase = 'chatWaveRelated';
        syncFearState();
        return;
      }
      if (state.scheduler.phase === 'ghostMotionPlaying' || state.scheduler.phase === 'pinnedFreezeAwaitConsonant' || state.scheduler.phase === 'pinnedFreezeAwaitAnswer') {
        syncFearState();
        return;
      }
      toNextPhase();
      syncFearState();
    },
    dispose() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'boot';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { lastId: null, state: 'idle' };
      debugStoryEmotionBonus = 0;
      syncFearState();
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
      fearSystem: {
        ...state.fearSystem,
        triggers: {
          ...state.fearSystem.triggers
        }
      }
    }),
    getCurrentNode,
    forceRevealCurrent() {
      const node = getCurrentNode();
      applyRevealFromNode(node);
      syncFearState();
      return node;
    },
    forceAskConsonantNow() {
      state.scheduler.phase = 'awaitingConsonantTagPrompt';
      syncFearState();
    },
    forceAskComprehensionNow() {
      state.scheduler.phase = 'awaitingComprehensionTag';
      syncFearState();
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
      syncFearState();
      return selectedId;
    },
    forceAdvanceNode() {
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(0, script.nodes.length - 1));
      syncNodeChar();
      state.scheduler.phase = 'awaitingConsonantTagPrompt';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '', audioKey: '', startedAt: 0 };
      state.ghostMotion = { ...state.ghostMotion, state: 'idle' };
      syncFearState();
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
      debugStoryEmotionBonus = 0;
      syncFearState();
      return true;
    },
    setConsonantPromptText(promptText) {
      state.consonant.promptText = promptText;
      syncFearState();
    },
    commitConsonantParseResult(result) {
      state.consonant.parse = {
        ok: result.ok,
        matchedChar: result.matchedChar ?? '',
        kind: result.debug?.kind ?? '',
        matchedAlias: result.debug?.matchedAlias ?? '',
        inputNorm: result.debug?.inputNorm ?? ''
      };
      syncFearState();
    },
    getFearDebugState() {
      syncFearState();
      return {
        ...state.fearSystem,
        triggers: {
          ...state.fearSystem.triggers
        }
      };
    },
    debugAddFear(value = 10) {
      debugStoryEmotionBonus = Math.max(0, debugStoryEmotionBonus + value);
      syncFearState();
    },
    debugResetFear() {
      debugStoryEmotionBonus = 0;
      syncFearState();
    }
  };
}
