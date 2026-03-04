import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { NightScript, WordNode } from '../../ssot/sandbox_story/types';
import type { GameMode } from '../types';

export type SandboxStoryPhase =
  | 'boot'
  | 'awaitingQuestionReady'
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
  reveal: {
    visible: boolean;
    phase: SandboxRevealPhase;
    text: string;
    highlightChar: string;
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
  forceAskComprehensionNow: () => void;
  forceGhostMotion: (motionId?: string) => string | null;
  forceAdvanceNode: () => void;
  getSSOT: () => NightScript;
  importSSOT: (nextScript: NightScript) => boolean;
};

const PHASE_SEQUENCE: SandboxStoryPhase[] = [
  'awaitingQuestionReady',
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
    reveal: {
      visible: false,
      phase: 'idle',
      text: '',
      highlightChar: ''
    },
    ghostMotion: {
      lastId: null,
      state: 'idle'
    }
  };

  let script: NightScript = cloneScript(NIGHT1);

  const getCurrentNode = () => script.nodes[state.nodeIndex] ?? null;

  const applyRevealFromNode = (node: WordNode | null) => {
    if (!node) return;
    state.reveal = {
      visible: true,
      phase: 'fadeIn',
      text: node.word,
      highlightChar: node.highlightChar
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
      state.scheduler.phase = 'awaitingQuestionReady';
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
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '' };
      state.ghostMotion = { lastId: null, state: 'idle' };
      toNextPhase();
    },
    onIncomingTag() {
      if (state.scheduler.phase === 'awaitingComprehensionTag') {
        state.scheduler.phase = 'pinnedFreezeAwaitAnswer';
      }
    },
    onPlayerReply() {
      if (state.scheduler.phase === 'pinnedFreezeAwaitAnswer') {
        state.scheduler.phase = 'resolvingComprehension';
      }
    },
    tick() {
      if (state.scheduler.phase === 'ghostMotionPlaying') {
        return;
      }
      toNextPhase();
      if (state.scheduler.phase === 'revealingWord') {
        applyRevealFromNode(getCurrentNode());
      }
    },
    dispose() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'boot';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '' };
      state.ghostMotion = { lastId: null, state: 'idle' };
    },
    getState: () => ({
      nodeIndex: state.nodeIndex,
      scheduler: {
        phase: state.scheduler.phase
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
      state.scheduler.phase = 'awaitingQuestionReady';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '' };
      state.ghostMotion = { ...state.ghostMotion, state: 'idle' };
    },
    getSSOT: () => cloneScript(script),
    importSSOT(nextScript) {
      if (!nextScript?.nodes?.length) return false;
      script = cloneScript(nextScript);
      state.nodeIndex = 0;
      state.scheduler.phase = 'awaitingQuestionReady';
      state.reveal = { visible: false, phase: 'idle', text: '', highlightChar: '' };
      state.ghostMotion = { lastId: null, state: 'idle' };
      return true;
    }
  };
}
