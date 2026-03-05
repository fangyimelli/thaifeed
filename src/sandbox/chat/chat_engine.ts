import { SandboxUserGenerator } from './user_generator';
import { CHAT_POOLS } from './chat_pools';

export type ChatMessage = {
  user: string;
  text: string;
  thai?: string;
  translation?: string;
  vip?: boolean;
};

type StoryPhase =
  | 'N1_INTRO_CHAT'
  | 'N1_QUIZ_LOOP'
  | 'N1_Q10_SPECIAL'
  | 'N1_VIP_FINAL_TAG'
  | 'N1_VIP_DISAPPEAR'
  | 'N1_GHOST_ESCALATION'
  | 'N1_CHAT_COLLAPSE'
  | 'N1_BLACKOUT_ENDING'
  | 'N1_GUESTHOUSE_TYPING';

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

const INTRO_LINES: Array<{ user: string; text: string; vip?: boolean }> = [
  { user: 'VIP', text: '晚安', vip: true },
  { user: 'Kai', text: '又開了' },
  { user: 'Nana', text: '今天有鬼嗎' },
  { user: 'VIP', text: '不知道 看運氣', vip: true },
  { user: 'Leo', text: '上次那次超誇張' },
  { user: 'Kai', text: '對 上次門自己關' },
  { user: 'VIP', text: '@玩家 第一次看嗎', vip: true },
  { user: '觀眾', text: '新觀眾？' },
  { user: '觀眾', text: '歡迎' },
  { user: '觀眾', text: '先別被嚇到' },
  { user: '觀眾', text: '這直播有時候真的很怪' },
  { user: '觀眾', text: '真的假的啦' },
  { user: '觀眾', text: '我覺得是假的' }
];

export class ChatEngine {
  private readonly options: ChatEngineOptions;
  private readonly userGen = new SandboxUserGenerator();
  private readonly users: string[] = [];
  private timer: number | null = null;
  private running = false;
  private context: ChatEngineContext = { san: 100, playerHandle: 'player', phase: 'N1_INTRO_CHAT', isEnding: false };
  private messageCount = 0;
  private sinceThai = 0;
  private sinceVip = 0;
  private lastPlayerReplyAt = Date.now();
  private lastPhase: StoryPhase = 'N1_INTRO_CHAT';
  private waveRemaining = 0;
  private scriptedQueue: ChatMessage[] = [];
  private introSent = false;

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
    if (this.context.phase === 'N1_INTRO_CHAT' && !this.introSent) {
      this.scriptedQueue = INTRO_LINES.map((line) => this.formatLine(line.text, line.user, Boolean(line.vip)));
      this.introSent = true;
    }
    if ((this.context.phase === 'N1_QUIZ_LOOP' || this.context.phase === 'N1_Q10_SPECIAL') && this.lastPhase !== this.context.phase) {
      this.waveRemaining = 3 + Math.floor(Math.random() * 4);
    }
    if (this.context.phase !== this.lastPhase) {
      this.enqueuePhaseScript(this.context.phase);
    }
    this.lastPhase = this.context.phase;
  }

  markPlayerReply(at = Date.now()): void {
    this.lastPlayerReplyAt = at;
  }

  nextMessage(): ChatMessage | null {
    if (this.scriptedQueue.length > 0) return this.scriptedQueue.shift() ?? null;
    if (this.context.phase === 'N1_INTRO_CHAT') return null;

    if (this.context.phase === 'N1_QUIZ_LOOP' || this.context.phase === 'N1_Q10_SPECIAL') {
      if (Date.now() - this.lastPlayerReplyAt >= 10_000) {
        this.lastPlayerReplyAt = Date.now();
        return this.formatLine(this.pick('san_idle'));
      }
      if (this.waveRemaining > 0) {
        this.waveRemaining -= 1;
        if (this.waveRemaining === 0) this.options.onWaveResolved?.(3);
        return this.formatLine(this.pick('observation_pool'));
      }
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
      return { user: line.user, text: `${line.user}: ${line.text}`, thai: line.thai, translation: line.translation };
    }

    const fearRate = this.context.san <= 35 ? 0.62 : this.context.san <= 60 ? 0.4 : 0.22;
    if (Math.random() < fearRate) return this.formatLine(this.pick('fear_pool'));
    if (Math.random() < 0.5) return this.formatLine(this.pick('observation_pool'));
    return this.formatLine(this.pick('casual_pool'));
  }

  private enqueuePhaseScript(phase: StoryPhase) {
    if (phase === 'N1_Q10_SPECIAL') {
      this.scriptedQueue.push(this.formatLine('什麼意思'), this.formatLine('有人懂嗎'), this.formatLine('อย่าหัน', 'system'));
      return;
    }
    if (phase === 'N1_VIP_FINAL_TAG') {
      this.scriptedQueue.push(this.formatLine('等等 如果他真的在房子裡等 那他現在是在等誰', 'VIP', true), this.formatLine(`@${this.context.playerHandle} 你現在在哪裡看這個?`, 'VIP', true));
      return;
    }
    if (phase === 'N1_VIP_DISAPPEAR') this.scriptedQueue.push(this.formatLine('VIP 已離開聊天室', 'system'));
    if (phase === 'N1_GHOST_ESCALATION') this.scriptedQueue.push(this.formatLine('剛剛有聲音嗎'), this.formatLine('門是不是動了'), this.formatLine('誰在走路'), this.formatLine('風聲?'));
    if (phase === 'N1_CHAT_COLLAPSE') this.scriptedQueue.push(this.formatLine('Kai 已離開聊天室', 'system'), this.formatLine('Nana 已離開聊天室', 'system'), this.formatLine('Leo 已離開聊天室', 'system'));
    if (phase === 'N1_BLACKOUT_ENDING') this.scriptedQueue.push(this.formatLine('อย่าหัน', 'system'));
    if (phase === 'N1_GUESTHOUSE_TYPING') this.scriptedQueue.push(this.formatLine('guest_house 正在加入聊天室', 'system'), this.formatLine('guest_house 正在輸入…', 'system'));
  }

  private scheduleNext(): void {
    if (!this.running) return;
    const message = this.nextMessage();
    if (message) this.options.onMessage(message);
    const delay = this.randomRange(1500, 3000);
    this.timer = window.setTimeout(() => this.scheduleNext(), delay);
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
