import { SandboxUserGenerator } from './user_generator';
import { CHAT_POOLS, assertChatPoolsCounts } from './chat_pools';
import { SandboxChatDirector } from './chat_director';
import { SANDBOX_VIP } from './vip_identity';

const SANDBOX_BANNED_PATTERNS = [/回頭/, /轉頭/] as const;
const SANDBOX_POOL_REROLL_MAX = 5;

export type ChatMessage = {
  user: string;
  text: string;
  thai?: string;
  translation?: string;
  vip?: boolean;
  role?: 'viewer' | 'vip' | 'mod';
  badge?: 'crown';
};

type StoryPhase = 'boot' | 'intro' | 'awaitingTag' | 'awaitingAnswer' | 'revealingWord' | 'chatRiot' | 'supernaturalEvent' | 'vipTranslate' | 'reasoningPhase' | 'tagPlayerPhase';

type SupernaturalEvent = 'none' | 'ghost_voice' | 'tv_on' | 'screen_glitch' | 'footsteps';
type GhostHintEvent = 'ghost_voice' | 'screen_glitch' | 'tv_on';
type FootstepDistance = 'footstep_far' | 'footstep_mid' | 'footstep_near';

type ChatEngineContext = {
  san: number;
  playerHandle: string;
  phase: StoryPhase;
  flowStep: 'PREHEAT' | 'ASK_CONSONANT' | 'WAIT_PLAYER_CONSONANT' | 'GLITCH_BURST_AFTER_CONSONANT' | 'REVEAL_WORD' | 'WORD_RIOT' | 'VIP_TRANSLATE' | 'MEANING_GUESS' | 'ASK_PLAYER_MEANING' | 'WAIT_PLAYER_MEANING' | 'GLITCH_BURST_AFTER_MEANING' | 'ADVANCE_NEXT';
  stepStartedAt: number;
  introStartedAt: number;
  isEnding: boolean;
  freeze: { frozen: boolean; reason: 'NONE' | 'AWAIT_PLAYER_INPUT' };
  glitchBurst: { pending: boolean; remaining: number };
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
  private context: ChatEngineContext = {
    san: 100,
    playerHandle: 'player',
    phase: 'boot',
    flowStep: 'PREHEAT',
    stepStartedAt: 0,
    introStartedAt: 0,
    isEnding: false,
    freeze: { frozen: false, reason: 'NONE' },
    glitchBurst: { pending: false, remaining: 0 }
  };
  private messageCount = 0;
  private sinceThai = 0;
  private sinceVip = 0;
  private lastPlayerReplyAt = Date.now();
  private lastPhase: StoryPhase = 'boot';
  private waveRemaining = 0;
  private waveTotal = 0;
  private collapseQueue: ChatMessage[] = [];
  private supernaturalQueue: ChatMessage[] = [];
  private readonly director = new SandboxChatDirector();

  constructor(options: ChatEngineOptions) {
    this.options = options;
    if (import.meta.env.DEV) {
      assertChatPoolsCounts();
    }
    for (let i = 0; i < 16; i += 1) this.users.push(this.userGen.next());
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
      this.supernaturalQueue = [this.formatLine(this.pickSafeArray(VIP_TRANSLATE_LINES), SANDBOX_VIP.handle, true)];
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
    if (this.context.freeze.frozen && !this.context.glitchBurst.pending) {
      return null;
    }

    if (this.context.glitchBurst.pending && this.context.glitchBurst.remaining > 0) {
      return this.formatLine(this.pickStringPool('san_idle'));
    }

    const directed = this.director.getNextDirectedLine({
      introStartedAt: this.context.introStartedAt,
      playerHandle: this.context.playerHandle,
      flowStep: this.context.flowStep,
      stepStartedAt: this.context.stepStartedAt,
      freeze: this.context.freeze,
      glitchBurst: this.context.glitchBurst
    });
    if (directed) {
      return this.formatLine(this.applyPlayerHandle(directed.text), directed.speaker, Boolean(directed.vip));
    }

    if (this.supernaturalQueue.length > 0) {
      return this.supernaturalQueue.shift() ?? null;
    }

    if (this.collapseQueue.length > 0) {
      return this.collapseQueue.shift() ?? null;
    }

    if (Date.now() - this.lastPlayerReplyAt >= 10_000) {
      this.lastPlayerReplyAt = Date.now();
      return this.formatLine(this.pickStringPool('san_idle'));
    }

    if (this.waveRemaining > 0) {
      this.waveRemaining -= 1;
      if (this.waveRemaining === 0) {
        this.options.onWaveResolved?.(this.waveTotal);
      }
      return this.formatLine(this.pickStringPool('observation_pool'));
    }

    this.sinceThai += 1;
    this.sinceVip += 1;
    this.messageCount += 1;

    if (this.sinceVip >= this.randomRange(15, 25)) {
      this.sinceVip = 0;
      return this.formatLine(this.pickStringPool('vip_summary'), SANDBOX_VIP.handle, true);
    }

    if (this.sinceThai >= this.randomRange(5, 8)) {
      this.sinceThai = 0;
      const line = this.pickThaiViewerLine();
      return {
        user: line.user,
        text: `${line.user}: ${line.text}`,
        thai: line.thai,
        translation: line.translation
      };
    }

    if (this.context.phase === 'revealingWord' && Math.random() < 0.3) {
      return this.formatLine(this.pickStringPool('guess_character'));
    }

    if (this.context.phase === 'awaitingAnswer' && Math.random() < 0.4) {
      return this.formatLine(this.pickStringPool('fear_pool'));
    }

    if (this.context.phase === 'revealingWord' && Math.random() < 0.28) {
      return this.formatLine(this.pickStringPool('theory_pool'));
    }

    if (this.context.phase === 'supernaturalEvent' && Math.random() < 0.65) {
      return this.formatLine(this.pickStringPool('san_idle'));
    }

    const isHighPressure = this.context.isEnding || this.context.san <= 25 || this.context.phase === 'supernaturalEvent';
    if (isHighPressure && Math.random() < 0.5) {
      return this.formatLine(this.pickStringPool('final_fear'));
    }

    const weights = this.director.getRandomPoolWeights({
      introStartedAt: this.context.introStartedAt,
      playerHandle: this.context.playerHandle,
      flowStep: this.context.flowStep,
      stepStartedAt: this.context.stepStartedAt,
      freeze: this.context.freeze,
      glitchBurst: this.context.glitchBurst
    });

    const weightedPool: Array<{ key: 'casual_pool' | 'observation_pool' | 'fear_pool' | 'theory_pool' | 'vip_summary' | 'final_fear' | 'san_idle'; weight: number }> = [
      { key: 'casual_pool', weight: weights.casual },
      { key: 'observation_pool', weight: weights.observation },
      { key: 'fear_pool', weight: weights.fear },
      { key: 'theory_pool', weight: weights.theory },
      { key: 'vip_summary', weight: weights.vip_summary },
      { key: 'final_fear', weight: weights.final_fear },
      { key: 'san_idle', weight: weights.san_idle }
    ];
    const total = weightedPool.reduce((acc, item) => acc + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of weightedPool) {
      roll -= item.weight;
      if (roll <= 0) {
        if (item.key === 'vip_summary') return this.formatLine(this.pickStringPool(item.key), SANDBOX_VIP.handle, true);
        return this.formatLine(this.pickStringPool(item.key));
      }
    }
    return this.formatLine(this.pickStringPool('casual_pool'));
  }

  private scheduleNext(): void {
    if (!this.running) return;
    const message = this.nextMessage();
    if (message) this.options.onMessage(message);
    const delay = this.context.glitchBurst.pending && this.context.glitchBurst.remaining > 0
      ? this.randomRange(250, 450)
      : this.randomRange(800, 1600);
    this.timer = window.setTimeout(() => this.scheduleNext(), delay);
  }

  private prepareCollapse(): void {
    const queue: ChatMessage[] = [
      this.formatLine(`@${SANDBOX_VIP.handle} 你還在嗎`),
      this.formatLine(`@${SANDBOX_VIP.handle} 說話啊`),
      this.formatLine(`@${SANDBOX_VIP.handle} 已離開聊天室`, 'system', false),
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
      queue.push(this.formatLine(this.pickSafeArray(GHOST_HINT_REASONING)));
    }
    return queue;
  }

  emitReasoningWave(count = 2): ChatMessage[] {
    const size = Math.max(1, Math.min(4, count));
    return Array.from({ length: size }).map(() => this.formatLine(this.pickSafeArray(GHOST_HINT_REASONING)));
  }

  emitTagPlayerPrompt(): ChatMessage {
    const directed = this.director.getNextDirectedLine({
      introStartedAt: this.context.introStartedAt,
      playerHandle: this.context.playerHandle,
      flowStep: this.context.flowStep,
      stepStartedAt: this.context.stepStartedAt,
      freeze: this.context.freeze,
      glitchBurst: this.context.glitchBurst
    });
    if (directed) return this.formatLine(this.applyPlayerHandle(directed.text), directed.speaker, Boolean(directed.vip));
    return this.formatLine(this.applyPlayerHandle(this.pickStringPool('tag_player')), SANDBOX_VIP.handle, true);
  }

  shouldEmitJoin(): boolean {
    return this.director.shouldEmitJoin({
      introStartedAt: this.context.introStartedAt,
      playerHandle: this.context.playerHandle,
      flowStep: this.context.flowStep,
      stepStartedAt: this.context.stepStartedAt,
      freeze: this.context.freeze,
      glitchBurst: this.context.glitchBurst
    });
  }

  private buildSupernaturalQueue(): ChatMessage[] {
    const eventType = this.pickSupernaturalEvent();
    if (eventType === 'none') return [this.formatLine(this.pickSafeArray(VIP_TRANSLATE_LINES), SANDBOX_VIP.handle, true)];
    const queue: ChatMessage[] = [];
    queue.push(this.formatLine(`[SUPERNATURAL_EVENT] ${eventType.toUpperCase()}`, 'system', false));
    if (eventType === 'footsteps') {
      queue.push(this.formatLine(`[SUPERNATURAL_EVENT] ${this.pickFootstepDistance().toUpperCase()}`, 'system', false));
    }
    queue.push(this.formatLine(this.pickStringPool('fear_pool')));
    queue.push(this.formatLine(this.pickSafeArray(VIP_TRANSLATE_LINES), SANDBOX_VIP.handle, true));
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
    const normalizedText = this.normalizeVipText(text);
    if (vip) {
      return {
        user: SANDBOX_VIP.handle,
        text: `${SANDBOX_VIP.handle}: ${normalizedText}`,
        translation: normalizedText,
        vip: true,
        role: SANDBOX_VIP.role,
        badge: SANDBOX_VIP.badge
      };
    }
    const role = user === 'mod_live' ? 'mod' : user === 'system' ? undefined : 'viewer';
    return { user, text: `${user}: ${normalizedText}`, translation: normalizedText, vip, role };
  }

  private normalizeVipText(text: string): string {
    return text
      .replace(/@VIP\b/g, `@${SANDBOX_VIP.handle}`)
      .replace(/\bVIP\b/g, SANDBOX_VIP.handle);
  }

  private pick<K extends keyof typeof CHAT_POOLS>(key: K): (typeof CHAT_POOLS)[K][number] {
    const pool = CHAT_POOLS[key];
    return pool[Math.floor(Math.random() * pool.length)] as (typeof CHAT_POOLS)[K][number];
  }

  private containsBannedText(text: string): boolean {
    return SANDBOX_BANNED_PATTERNS.some((pattern) => pattern.test(text));
  }

  private pickSafeArray<T extends string>(pool: readonly T[]): T {
    for (let attempt = 0; attempt < SANDBOX_POOL_REROLL_MAX; attempt += 1) {
      const candidate = this.pickArray(pool);
      if (!this.containsBannedText(candidate)) return candidate;
    }
    return this.safeFallbackObservationLine() as T;
  }

  private pickStringPool<K extends Exclude<keyof typeof CHAT_POOLS, 'thai_viewer_pool'>>(key: K): string {
    for (let attempt = 0; attempt < SANDBOX_POOL_REROLL_MAX; attempt += 1) {
      const candidate = this.pick(key) as unknown as string;
      if (!this.containsBannedText(candidate)) return candidate;
    }
    return this.safeFallbackObservationLine();
  }

  private pickThaiViewerLine(): (typeof CHAT_POOLS)['thai_viewer_pool'][number] {
    for (let attempt = 0; attempt < SANDBOX_POOL_REROLL_MAX; attempt += 1) {
      const candidate = this.pick('thai_viewer_pool');
      if (!this.containsBannedText(candidate.text)) return candidate;
    }
    const fallback = this.safeFallbackObservationLine();
    return { user: CHAT_POOLS.thai_viewer_pool[0]?.user ?? 'somchai', text: fallback, thai: fallback, translation: fallback };
  }

  private safeFallbackObservationLine(): string {
    for (let attempt = 0; attempt < SANDBOX_POOL_REROLL_MAX; attempt += 1) {
      const candidate = this.pick('observation_pool') as string;
      if (!this.containsBannedText(candidate)) return candidate;
    }
    return '畫面有點怪 先盯著看';
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
