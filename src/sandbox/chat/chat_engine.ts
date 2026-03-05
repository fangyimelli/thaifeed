import { SandboxUserGenerator } from './user_generator';
import { CHAT_POOLS } from './chat_pools';

export type ChatMessage = {
  user: string;
  text: string;
  thai?: string;
  translation?: string;
  vip?: boolean;
};

type StoryPhase = 'boot' | 'awaitingTag' | 'awaitingAnswer' | 'revealingWord' | 'awaitingWave';

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
  private collapseQueue: ChatMessage[] = [];

  constructor(options: ChatEngineOptions) {
    this.options = options;
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
    if (this.context.phase === 'awaitingWave' && this.lastPhase !== 'awaitingWave') {
      this.waveRemaining = 3 + Math.floor(Math.random() * 4);
    }
    this.lastPhase = this.context.phase;
    if (this.context.isEnding && this.collapseQueue.length === 0) {
      this.prepareCollapse();
    }
  }

  markPlayerReply(at = Date.now()): void {
    this.lastPlayerReplyAt = at;
  }

  nextMessage(): ChatMessage | null {
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
        this.options.onWaveResolved?.(3);
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
      return this.formatLine(this.pick('tag_player').replace(/@player/g, `@${this.context.playerHandle}`));
    }

    if (this.context.phase === 'revealingWord' && Math.random() < 0.3) {
      return this.formatLine(this.pick('guess_character'));
    }

    if (this.context.phase === 'awaitingAnswer' && Math.random() < 0.2) {
      return this.formatLine(this.pick('theory_pool'));
    }

    if (this.context.isEnding && Math.random() < 0.55) {
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

  private formatLine(text: string, forcedUser?: string, vip = false): ChatMessage {
    const user = forcedUser ?? this.pickUser();
    return { user, text: `${user}: ${text}`, translation: text, vip };
  }

  private pick<K extends keyof typeof CHAT_POOLS>(key: K): (typeof CHAT_POOLS)[K][number] {
    const pool = CHAT_POOLS[key];
    return pool[Math.floor(Math.random() * pool.length)] as (typeof CHAT_POOLS)[K][number];
  }

  private pickUser(): string {
    return this.users[Math.floor(Math.random() * this.users.length)] ?? 'viewer';
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
