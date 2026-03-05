import { SandboxUserGenerator } from './user_generator';
import { CHAT_POOLS, assertChatPoolsCounts } from './chat_pools';

export type ChatMessage = {
  user: string;
  text: string;
  thai?: string;
  translation?: string;
  vip?: boolean;
};

type StoryPhase = 'boot' | 'intro' | 'awaitingTag' | 'awaitingAnswer' | 'revealingWord' | 'chatRiot' | 'supernaturalEvent' | 'vipTranslate' | 'reasoningPhase' | 'tagPlayerPhase';

type SupernaturalEvent = 'none' | 'ghost_voice' | 'tv_on' | 'screen_glitch' | 'footsteps';
type GhostHintEvent = 'ghost_voice' | 'screen_glitch' | 'tv_on';
type FootstepDistance = 'footstep_far' | 'footstep_mid' | 'footstep_near';

type ChatEngineContext = {
  san: number;
  playerHandle: string;
  phase: StoryPhase;
  isEnding: boolean;
};

type ChatEngineOptions = {
  onMessage: (message: ChatMessage) => void;
  onWaveResolved?: (count: number) => void;
};

const SUPERNATURAL_POOL: Array<{ type: SupernaturalEvent; weight: number }> = [
  { type: 'none', weight: 40 },
  { type: 'ghost_voice', weight: 20 },
  { type: 'tv_on', weight: 15 },
  { type: 'screen_glitch', weight: 15 },
  { type: 'footsteps', weight: 10 }
];

const GHOST_HINT_POOL: GhostHintEvent[] = ['ghost_voice', 'screen_glitch', 'tv_on'];
const GHOST_HINT_REASONING = [
  '鬼是不是在回應剛剛那個音節',
  '我覺得線索在提醒我們先拼出完整詞',
  '這段像在暗示別急著亂猜角色'
] as const;
const VIP_TRANSLATE_LINES = [
  'VIP 翻譯：剛剛泰文是在說「樓上有聲音」，先把樓梯線索記住。',
  'VIP 翻譯：那句偏向「他還在等」，跟前面等待主題一致。',
  'VIP 翻譯：這段像提醒「別把人留在那裡」，推進時要注意保護路線。'
] as const;

export class ChatEngine {
  private readonly options: ChatEngineOptions;
  private readonly userGen = new SandboxUserGenerator();
  private readonly users: string[] = [];
  private timer: number | null = null;
  private running = false;
  private context: ChatEngineContext = { san: 100, playerHandle: 'player', phase: 'boot', isEnding: false };
  private messageCount = 0;
  private sinceThai = 0;
  private sinceVip = 0;
  private lastPlayerReplyAt = Date.now();
  private lastPhase: StoryPhase = 'boot';
  private waveRemaining = 0;
  private waveTotal = 0;
  private collapseQueue: ChatMessage[] = [];
  private supernaturalQueue: ChatMessage[] = [];

  constructor(options: ChatEngineOptions) {
    this.options = options;
    if (import.meta.env.DEV) {
      assertChatPoolsCounts();
    }
    for (let i = 0; i < 16; i += 1) this.users.push(this.userGen.next());
    this.users.push('VIP');
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  setContext(context: Partial<ChatEngineContext>): void {
    this.context = { ...this.context, ...context };
    if (this.context.phase === 'chatRiot' && this.lastPhase !== 'chatRiot') {
      this.waveRemaining = 3 + Math.floor(Math.random() * 4);
      this.waveTotal = this.waveRemaining;
    }
    if (this.context.phase === 'supernaturalEvent' && this.lastPhase !== 'supernaturalEvent') {
      this.supernaturalQueue = this.buildSupernaturalQueue();
    }
    if (this.context.phase === 'vipTranslate' && this.lastPhase !== 'vipTranslate' && this.supernaturalQueue.length === 0) {
      this.supernaturalQueue = [this.formatLine(this.pickArray(VIP_TRANSLATE_LINES), 'VIP', true)];
    }
    this.lastPhase = this.context.phase;
    if (this.context.isEnding && this.collapseQueue.length === 0) {
      this.prepareCollapse();
    }
  }

  markPlayerReply(at = Date.now()): void {
    this.lastPlayerReplyAt = at;
  }

  triggerGhostHintEvent(): void {
    if (this.context.phase === 'awaitingAnswer') return;
    this.supernaturalQueue = [...this.supernaturalQueue, ...this.buildGhostHintQueue()];
  }

  nextMessage(): ChatMessage | null {
    if (this.supernaturalQueue.length > 0) {
      return this.supernaturalQueue.shift() ?? null;
    }

    if (this.collapseQueue.length > 0) {
      return this.collapseQueue.shift() ?? null;
    }

    if (Date.now() - this.lastPlayerReplyAt >= 10_000) {
      this.lastPlayerReplyAt = Date.now();
      return this.formatLine(this.pick('san_idle'));
    }

    if (this.waveRemaining > 0) {
      this.waveRemaining -= 1;
      if (this.waveRemaining === 0) {
        this.options.onWaveResolved?.(this.waveTotal);
      }
      return this.formatLine(this.pick('observation_pool'));
    }

    this.sinceThai += 1;
    this.sinceVip += 1;
    this.messageCount += 1;

    if (this.sinceVip >= this.randomRange(15, 25)) {
      this.sinceVip = 0;
      return this.formatLine(this.pick('vip_summary'), 'VIP', true);
    }

    if (this.sinceThai >= this.randomRange(5, 8)) {
      this.sinceThai = 0;
      const line = this.pick('thai_viewer_pool');
      return {
        user: line.user,
        text: `${line.user}: ${line.text}`,
        thai: line.thai,
        translation: line.translation
      };
    }

    if (this.context.phase === 'awaitingAnswer' && Math.random() < 0.25) {
      return this.formatLine(this.applyPlayerHandle(this.pick('tag_player')));
    }

    if (this.context.phase === 'revealingWord' && Math.random() < 0.3) {
      return this.formatLine(this.pick('guess_character'));
    }

    if (this.context.phase === 'awaitingAnswer' && Math.random() < 0.35) {
      return this.formatLine(this.pick('theory_pool'));
    }

    if (this.context.phase === 'revealingWord' && Math.random() < 0.28) {
      return this.formatLine(this.pick('theory_pool'));
    }

    const isHighPressure = this.context.isEnding || this.context.san <= 25 || this.context.phase === 'supernaturalEvent';
    if (isHighPressure && Math.random() < 0.5) {
      return this.formatLine(this.pick('final_fear'));
    }

    const fearRate = this.context.san <= 35 ? 0.62 : this.context.san <= 60 ? 0.4 : 0.22;
    if (Math.random() < fearRate) return this.formatLine(this.pick('fear_pool'));
    if (Math.random() < 0.5) return this.formatLine(this.pick('observation_pool'));
    return this.formatLine(this.pick('casual_pool'));
  }

  private scheduleNext(): void {
    if (!this.running) return;
    const message = this.nextMessage();
    if (message) this.options.onMessage(message);
    const delay = this.randomRange(1500, 3000);
    this.timer = window.setTimeout(() => this.scheduleNext(), delay);
  }

  private prepareCollapse(): void {
    const queue: ChatMessage[] = [
      this.formatLine('@VIP 你還在嗎'),
      this.formatLine('@VIP 說話啊'),
      this.formatLine('@VIP 已離開聊天室', 'system', false),
      this.formatLine(`${this.pickUser()} 已離開聊天室`, 'system', false),
      this.formatLine(`${this.pickUser()} 已離開聊天室`, 'system', false),
      this.formatLine(`${this.pickUser()} 已離開聊天室`, 'system', false)
    ];
    this.collapseQueue = queue;
  }

  private buildGhostHintQueue(): ChatMessage[] {
    const hint = GHOST_HINT_POOL[Math.floor(Math.random() * GHOST_HINT_POOL.length)] ?? 'ghost_voice';
    const queue: ChatMessage[] = [];
    queue.push(this.formatLine(`[GHOST_HINT_EVENT] ${hint.toUpperCase()}`, 'system', false));
    for (let i = 0; i < 3; i += 1) {
      queue.push(this.formatLine(this.pickArray(GHOST_HINT_REASONING)));
    }
    return queue;
  }

  emitReasoningWave(count = 2): ChatMessage[] {
    const size = Math.max(1, Math.min(4, count));
    return Array.from({ length: size }).map(() => this.formatLine(this.pickArray(GHOST_HINT_REASONING)));
  }

  emitTagPlayerPrompt(): ChatMessage {
    const line = this.applyPlayerHandle(this.pick('tag_player'));
    return this.formatLine(line, 'mod_live');
  }

  private buildSupernaturalQueue(): ChatMessage[] {
    const eventType = this.pickSupernaturalEvent();
    if (eventType === 'none') return [this.formatLine(this.pickArray(VIP_TRANSLATE_LINES), 'VIP', true)];
    const queue: ChatMessage[] = [];
    queue.push(this.formatLine(`[SUPERNATURAL_EVENT] ${eventType.toUpperCase()}`, 'system', false));
    if (eventType === 'footsteps') {
      queue.push(this.formatLine(`[SUPERNATURAL_EVENT] ${this.pickFootstepDistance().toUpperCase()}`, 'system', false));
    }
    queue.push(this.formatLine(this.pick('fear_pool')));
    queue.push(this.formatLine(this.pickArray(VIP_TRANSLATE_LINES), 'VIP', true));
    return queue;
  }

  private applyPlayerHandle(template: string): string {
    return template.replace(/\{\{PLAYER\}\}/g, `@${this.context.playerHandle}`).replace(/\$\{playerHandle\}/g, `@${this.context.playerHandle}`);
  }

  private pickSupernaturalEvent(): SupernaturalEvent {
    const totalWeight = SUPERNATURAL_POOL.reduce((acc, item) => acc + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of SUPERNATURAL_POOL) {
      roll -= item.weight;
      if (roll <= 0) return item.type;
    }
    return 'none';
  }

  private pickFootstepDistance(): FootstepDistance {
    const roll = Math.random();
    if (roll < 0.34) return 'footstep_far';
    if (roll < 0.67) return 'footstep_mid';
    return 'footstep_near';
  }

  private formatLine(text: string, forcedUser?: string, vip = false): ChatMessage {
    const user = forcedUser ?? this.pickUser();
    return { user, text: `${user}: ${text}`, translation: text, vip };
  }

  private pick<K extends keyof typeof CHAT_POOLS>(key: K): (typeof CHAT_POOLS)[K][number] {
    const pool = CHAT_POOLS[key];
    return pool[Math.floor(Math.random() * pool.length)] as (typeof CHAT_POOLS)[K][number];
  }

  private pickArray<T>(pool: readonly T[]): T {
    return pool[Math.floor(Math.random() * pool.length)] as T;
  }

  private pickUser(): string {
    return this.users[Math.floor(Math.random() * this.users.length)] ?? 'viewer';
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
