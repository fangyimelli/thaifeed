import { SandboxUserGenerator } from './user_generator';

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

const pools = {
  casual_pool: ['先穩住節奏', '感覺這輪可以過', '聊天室有在看你', '這房間今天特別安靜'],
  observation_pool: ['窗簾剛剛是不是動了', '右上角陰影變深了', '那盞燈忽明忽暗', '畫面有一瞬間糊掉'],
  fear_pool: ['越看越不對勁', '這不是延遲吧', '我背後發涼', '不要停在那個角落太久'],
  thai_viewer_pool: [
    { thai: 'ช้าทำไม รีบตอบสิ', text: '怎麼變慢了，快回答' },
    { thai: 'เหมือนมีคนยืนหลังกล้อง', text: '像有人站在鏡頭後面' },
    { thai: 'แชตกำลังลุ้นอยู่', text: '聊天室都在緊張等你' }
  ],
  san_idle: ['聊天室是不是卡住', '@player 還在嗎', '有人還在線嗎'],
  guess_character: ['會不會是媽媽', '像姐姐在等弟弟', '感覺是家人關係'],
  tag_player: ['@player 你覺得是誰', '@player 你來判斷一下', '@player 現在該怎麼做'],
  vip_summary: ['目前線索看起來都指向家人', '那個字可能是關鍵', '先把重複出現的細節記下來']
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
        user: this.pickUser(),
        text: `${this.pickUser()}: ${line.text}`,
        thai: line.thai,
        translation: line.text
      };
    }

    if (this.context.phase === 'awaitingAnswer' && Math.random() < 0.25) {
      return this.formatLine(this.pick('tag_player').replace(/@player/g, `@${this.context.playerHandle}`));
    }

    if (this.context.phase === 'revealingWord' && Math.random() < 0.3) {
      return this.formatLine(this.pick('guess_character'));
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

  private pick<K extends keyof typeof pools>(key: K): (typeof pools)[K][number] {
    const pool = pools[key];
    return pool[Math.floor(Math.random() * pool.length)] as (typeof pools)[K][number];
  }

  private pickUser(): string {
    return this.users[Math.floor(Math.random() * this.users.length)] ?? 'viewer';
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
