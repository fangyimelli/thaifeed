import { SANDBOX_VIP } from './vip_identity';

export type SandboxDirectorStep =
  | 'PREHEAT'
  | 'ASK_CONSONANT'
  | 'WAIT_PLAYER_CONSONANT'
  | 'GLITCH_BURST_AFTER_CONSONANT'
  | 'REVEAL_WORD'
  | 'WORD_RIOT'
  | 'VIP_TRANSLATE'
  | 'MEANING_GUESS'
  | 'ASK_PLAYER_MEANING'
  | 'WAIT_PLAYER_MEANING'
  | 'GLITCH_BURST_AFTER_MEANING'
  | 'ADVANCE_NEXT';

export type DirectorMode = 'PREHEAT' | 'RANDOM' | 'REACTIVE' | 'FROZEN' | 'GLITCH_BURST';

export type DirectorContext = {
  introStartedAt: number;
  playerHandle: string;
  flowStep: SandboxDirectorStep;
  stepStartedAt?: number;
  freeze: { frozen: boolean };
  glitchBurst: { pending: boolean };
};

export type DirectedLine = { speaker: string; text: string; vip?: boolean };

type PoolWeights = {
  casual: number;
  observation: number;
  fear: number;
  theory: number;
  tag_player: number;
  vip_summary: number;
  final_fear: number;
  thai_viewer: number;
  san_idle: number;
};

export class SandboxChatDirector {
  private preheatVipEntranceDone = false;
  private preheatVipTagDone = false;
  private directedAskedStepKey = '';
  private lastJoinAt = 0;

  getChatMode(state: DirectorContext): DirectorMode {
    if (state.glitchBurst.pending) return 'GLITCH_BURST';
    if (state.freeze.frozen) return 'FROZEN';
    if (state.flowStep === 'PREHEAT') return 'PREHEAT';
    if (state.flowStep === 'REVEAL_WORD' || state.flowStep === 'WORD_RIOT' || state.flowStep === 'MEANING_GUESS') return 'REACTIVE';
    return 'RANDOM';
  }

  getNextDirectedLine(state: DirectorContext): DirectedLine | null {
    const elapsed = Math.max(0, Date.now() - (state.introStartedAt || Date.now()));
    if (state.flowStep === 'PREHEAT') {
      if (!this.preheatVipEntranceDone && elapsed <= 20_000) {
        this.preheatVipEntranceDone = true;
        return { speaker: SANDBOX_VIP.handle, text: '我先坐前排，今天先看節奏。', vip: true };
      }
      if (!this.preheatVipTagDone && elapsed >= 5_000 && elapsed <= 25_000) {
        this.preheatVipTagDone = true;
        return { speaker: SANDBOX_VIP.handle, text: `@${state.playerHandle || '000'} 嗨嗨，第一次看這台嗎？`, vip: true };
      }
    }

    if (state.flowStep === 'WAIT_PLAYER_CONSONANT' || state.flowStep === 'WAIT_PLAYER_MEANING') {
      const stepKey = `${state.flowStep}:${state.stepStartedAt ?? 0}`;
      if (this.directedAskedStepKey !== stepKey) {
        this.directedAskedStepKey = stepKey;
        return {
          speaker: SANDBOX_VIP.handle,
          text: state.flowStep === 'WAIT_PLAYER_CONSONANT'
            ? `@${state.playerHandle || '000'} 這題子音你覺得是哪個？`
            : `@${state.playerHandle || '000'} 那這個詞你會翻成什麼？`,
          vip: true
        };
      }
    }

    return null;
  }

  getRandomPoolWeights(state: DirectorContext): PoolWeights {
    const mode = this.getChatMode(state);
    if (mode === 'PREHEAT') {
      return { casual: 45, observation: 35, fear: 4, theory: 2, tag_player: 0, vip_summary: 8, final_fear: 1, thai_viewer: 3, san_idle: 2 };
    }
    if (mode === 'REACTIVE') {
      return { casual: 12, observation: 28, fear: 14, theory: 18, tag_player: 0, vip_summary: 8, final_fear: 6, thai_viewer: 6, san_idle: 8 };
    }
    return { casual: 30, observation: 26, fear: 14, theory: 12, tag_player: 0, vip_summary: 8, final_fear: 3, thai_viewer: 4, san_idle: 3 };
  }

  shouldEmitJoin(state: DirectorContext): boolean {
    if (state.flowStep !== 'PREHEAT') return false;
    const now = Date.now();
    if (now - this.lastJoinAt < 4_000) return false;
    const should = Math.random() < 0.28;
    if (should) this.lastJoinAt = now;
    return should;
  }
}
