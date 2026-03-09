type SandboxChatMessage = { user: string; text: string; thai?: string; translation?: string; vip?: boolean; role?: 'viewer' | 'vip' | 'mod'; badge?: 'crown'; chatType?: 'sandbox_story_critical_hint_followup'; hintEventName?: string };

type AuditDebugState = {
  lastEmitKey: string;
  lastSpeaker: string;
  recentEmitKeys: string[];
  duplicateSpamCount: number;
  speakerSpamCount: number;
  freezeLeakCount: number;
  thaiViewer: { count: number; pick: string; lastUsedField: string };
};

export class ChatEngine {
  private onMessage: (message: SandboxChatMessage) => void;
  private onWaveResolved: (count: number) => void;
  constructor(options: { onMessage: (message: SandboxChatMessage) => void; onWaveResolved?: (count: number) => void; onWaveDone?: (count: number) => void }) {
    this.onMessage = options.onMessage;
    this.onWaveResolved = options.onWaveResolved ?? options.onWaveDone ?? (() => undefined);
  }
  stop() {}
  setContext(_: any) {}
  getAuditDebugState(): AuditDebugState { return { lastEmitKey: '-', lastSpeaker: '-', recentEmitKeys: [], duplicateSpamCount: 0, speakerSpamCount: 0, freezeLeakCount: 0, thaiViewer: { count: 0, pick: '-', lastUsedField: 'text' } }; }
  shouldEmitJoin(_: any = null) { return true; }
  markPlayerReply(_: any) {}
  registerFootstepsRoll(_: any) { return { chance: 0 }; }
  emitCrowdReactWord(_: any, cb?: (m: SandboxChatMessage) => void) { const m = { user: 'viewer', text: '???' }; this.onMessage(m); cb?.(m); this.onWaveResolved(1); }
  emitReasoningWave(_: any, cb?: (m: SandboxChatMessage) => void) { const m = { user: 'viewer', text: '我覺得不對勁' }; this.onMessage(m); cb?.(m); this.onWaveResolved(1); }
}
