import { SANDBOX_VIP } from './vip_identity';

export type SandboxDirectorStep =
  | 'PREJOIN'
  | 'PREHEAT'
  | 'TAG_PLAYER_WARMUP'
  | 'WARMUP_TAG_REPLY'
  | 'WARMUP_NPC_ACK'
  | 'WARMUP_CHATTER'
  | 'TAG_PLAYER_1'
  | 'WAIT_REPLY_1'
  | 'POSSESSION_AUTOFILL'
  | 'POSSESSION_AUTOSEND'
  | 'CROWD_REACT_WORD'
  | 'VIP_SUMMARY_1'
  | 'TAG_PLAYER_2_PRONOUNCE'
  | 'WAIT_REPLY_2'
  | 'DISCUSS_PRONOUNCE'
  | 'VIP_SUMMARY_2'
  | 'TAG_PLAYER_3_MEANING'
  | 'WAIT_REPLY_3'
  | 'FLUSH_TECH_BACKLOG'
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
  private lastJoinAt = 0;
  private readonly preheatCasualDirectPool = [
    '@{player} 先一起看一下今天的節奏。',
    '@{player} 今天這台氣氛有點不一樣，先別急。',
    '@{player} 先觀察一下，等等可能會更有意思。'
  ] as const;

  getChatMode(state: DirectorContext): DirectorMode {
    if (state.glitchBurst.pending) return 'GLITCH_BURST';
    if (state.freeze.frozen) return 'FROZEN';
    if (state.flowStep === 'PREJOIN') return 'FROZEN';
    if (state.flowStep === 'PREHEAT') return 'PREHEAT';
    if (state.flowStep === 'WARMUP_TAG_REPLY') return 'FROZEN';
    if (state.flowStep === 'POSSESSION_AUTOFILL' || state.flowStep === 'POSSESSION_AUTOSEND' || state.flowStep === 'CROWD_REACT_WORD' || state.flowStep === 'DISCUSS_PRONOUNCE') return 'REACTIVE';
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
        const template = this.preheatCasualDirectPool[Math.floor(Math.random() * this.preheatCasualDirectPool.length)] ?? this.preheatCasualDirectPool[0];
        return { speaker: SANDBOX_VIP.handle, text: template.replace('{player}', state.playerHandle || '000'), vip: true };
      }
    }
    return null;
  }

  getRandomPoolWeights(state: DirectorContext): PoolWeights {
    const mode = this.getChatMode(state);
    if (mode === 'PREHEAT') {
      return { casual: 54, observation: 34, fear: 2, theory: 1, tag_player: 0, vip_summary: 8, final_fear: 0, thai_viewer: 1, san_idle: 0 };
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
