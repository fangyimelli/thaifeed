export type SandboxDirectorStep =
  | 'PREJOIN'
  | 'PREHEAT'
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
  getChatMode(_state: DirectorContext): DirectorMode {
    return 'FROZEN';
  }

  getNextDirectedLine(_state: DirectorContext): DirectedLine | null {
    return null;
  }

  getRandomPoolWeights(_state: DirectorContext): PoolWeights {
    return { casual: 0, observation: 0, fear: 0, theory: 0, tag_player: 0, vip_summary: 0, final_fear: 0, thai_viewer: 0, san_idle: 0 };
  }

  shouldEmitJoin(_state: DirectorContext): boolean {
    return false;
  }

  isHighlightOnlyPreheatTag(state: DirectorContext): boolean {
    return state.flowStep === 'PREHEAT';
  }
}
