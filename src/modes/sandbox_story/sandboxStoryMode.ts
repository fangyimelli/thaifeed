import { NIGHT1 } from '../../ssot/sandbox_story/night1';
import type { WordNode } from '../../ssot/sandbox_story/types';
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

export type SandboxStoryState = {
  nodeIndex: number;
  scheduler: {
    phase: SandboxStoryPhase;
  };
};

export type SandboxStoryMode = GameMode & {
  getState: () => SandboxStoryState;
  getCurrentNode: () => WordNode | null;
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

export function createSandboxStoryMode(): SandboxStoryMode {
  const state: SandboxStoryState = {
    nodeIndex: 0,
    scheduler: {
      phase: 'boot'
    }
  };

  const getCurrentNode = () => NIGHT1.nodes[state.nodeIndex] ?? null;

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
      state.nodeIndex = Math.min(state.nodeIndex + 1, Math.max(0, NIGHT1.nodes.length - 1));
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
    },
    dispose() {
      state.nodeIndex = 0;
      state.scheduler.phase = 'boot';
    },
    getState: () => ({
      nodeIndex: state.nodeIndex,
      scheduler: {
        phase: state.scheduler.phase
      }
    }),
    getCurrentNode
  };
}
