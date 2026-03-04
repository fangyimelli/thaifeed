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
      }
    }
  };
}
